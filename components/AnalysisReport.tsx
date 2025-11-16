
import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { UniversityCard, University } from './UniversityCard';
import { GradeData } from './GradeInput';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ChevronDown, ChevronUp, Target, TrendingUp, AlertCircle, CheckCircle, User, MapPin, School, BookOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { getUniversityRecommendations } from '../utils/recommendationsApi';
import { supabase } from '../utils/supabase/client';

interface AnalysisReportProps {
  studentId?: string;
  studentName?: string;
  grades?: GradeData;
  simpleGradeData?: any;
  simpleSuneungData?: any;
  onBack?: () => void;
}

interface DetailedUniversity extends University {
  requirements: {
    minInternalGrade?: number;
    minSuneungGrade?: number;
    requiredSubjects?: string[];
    additionalFactors?: string[];
  };
  admissionStrategy: string;
  competitionAnalysis: string;
  recommendation: 'safe' | 'optimal' | 'challenge';
  reflectionRatio?: string;
  admissionData?: {
    lastYear: { score: number; students: number };
    threeYearAvg: { score: number; students: number };
    yearlyData: Array<{ year: number; score: number; students: number }>;
  };
  // 누백 관련 필드 (새로운 API 응답)
  nubaek?: number;
  appropriateNubaek?: number;
  expectedNubaek?: number;
  minimumNubaek?: number;
  // 합격률 및 색상 코드 (새로운 API 응답)
  passRate?: number;
  colorCode?: 'Green' | 'LightGreen' | 'Yellow' | 'Red';
}

// 반영비율 분석 함수
const calculateBestReflectionRatio = (grades: GradeData, type: 'school' | 'suneung') => {
  if (type === 'school') {
    const subjects = ['국어', '영어', '수학', '사회', '과학'];
    const subjectAverages = subjects.map(subject => {
      let total = 0;
      let count = 0;
      
      // 1학년
      const grade1S1 = grades.school.grade1.semester1[subject];
      const grade1S2 = grades.school.grade1.semester2[subject];
      if (grade1S1?.grade) { total += grade1S1.grade; count++; }
      if (grade1S2?.grade) { total += grade1S2.grade; count++; }
      
      // 2,3학년 (1,2,3으로 분류된 것들)
      [1, 2, 3].forEach(num => {
        const subjectName = `${subject}${num}`;
        const grade2S1 = grades.school.grade2.semester1[subjectName];
        const grade2S2 = grades.school.grade2.semester2[subjectName];
        const grade3S1 = grades.school.grade3.semester1[subjectName];
        const grade3S2 = grades.school.grade3.semester2[subjectName];
        
        if (grade2S1?.grade) { total += grade2S1.grade; count++; }
        if (grade2S2?.grade) { total += grade2S2.grade; count++; }
        if (grade3S1?.grade) { total += grade3S1.grade; count++; }
        if (grade3S2?.grade) { total += grade3S2.grade; count++; }
      });
      
      return {
        subject,
        average: count > 0 ? Number((total / count).toFixed(2)) : 9
      };
    });
    
    // 성적이 좋은 순으로 정렬
    subjectAverages.sort((a, b) => a.average - b.average);
    return `${subjectAverages[0].subject}(${subjectAverages[0].average}) > ${subjectAverages[1].subject}(${subjectAverages[1].average}) > ${subjectAverages[2].subject}(${subjectAverages[2].average})`;
  } else {
    const subjects = [
      { name: '국어', grade: grades.suneung.korean.grade },
      { name: '수학', grade: grades.suneung.math.grade },
      { name: '영어', grade: grades.suneung.english.grade },
      { name: '사회', grade: Math.min(grades.suneung.inquiry1.grade, grades.suneung.inquiry2.grade) },
      { name: '과학', grade: Math.min(grades.suneung.inquiry1.grade, grades.suneung.inquiry2.grade) }
    ];
    
    const validSubjects = subjects.filter(s => s.grade > 0).sort((a, b) => a.grade - b.grade);
    return validSubjects.slice(0, 3).map(s => `${s.name}(${s.grade}등급)`).join(' > ');
  }
};

// 합격 가능성에 따른 색상 결정
const getAdmissionProbabilityColor = (matchPercentage: number) => {
  if (matchPercentage >= 80) return 'bg-green-600'; // 진한녹색 - 합격률 80% 이상
  if (matchPercentage >= 50) return 'bg-green-300'; // 연한녹색 - 합격률 50-79%
  if (matchPercentage >= 20) return 'bg-yellow-400'; // 노랑색 - 합격률 20-49%
  return 'bg-red-500'; // 붉은색 - 합격률 20% 미만
};

export function AnalysisReport({ studentId, studentName, grades, simpleGradeData, simpleSuneungData, onBack }: AnalysisReportProps) {
  const [activeTab, setActiveTab] = useState('susi');
  const [activeJungsiTab, setActiveJungsiTab] = useState('ga');
  const [expandedAnalysis, setExpandedAnalysis] = useState<{[key: string]: boolean}>({});
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [universityConfigs, setUniversityConfigs] = useState<Record<string, any>>({});
  const [latestExamGrades, setLatestExamGrades] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const calculateSchoolGPA = (): number => {
    if (simpleGradeData) {
      const allGrades: number[] = [];
      Object.values(simpleGradeData).forEach((subjectData) => {
        Object.values(subjectData).forEach(grade => {
          if (typeof grade === 'number' && grade > 0) {
            allGrades.push(grade);
          }
        });
      });
      return allGrades.length > 0 ? Number((allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length).toFixed(2)) : 0;
    }
    
    if (!grades) return 0;
    
    let totalGrade = 0;
    let totalCredits = 0;

    Object.values(grades.school).forEach(grade => {
      Object.values(grade).forEach(semester => {
        Object.values(semester).forEach(subject => {
          if (subject.grade && subject.credits) {
            totalGrade += subject.grade * subject.credits;
            totalCredits += subject.credits;
          }
        });
      });
    });

    return totalCredits > 0 ? Number((totalGrade / totalCredits).toFixed(2)) : 0;
  };

  const calculateSuneungAverage = (): number => {
    // 최신 student_grades 테이블 데이터 우선 사용
    if (latestExamGrades) {
      const validGrades = [
        latestExamGrades.korean_grade,
        latestExamGrades.math_grade,
        latestExamGrades.english_grade,
        latestExamGrades.inquiry1_grade,
        latestExamGrades.inquiry2_grade,
        latestExamGrades.k_history_grade
      ].filter((grade): grade is number => grade !== null && grade !== undefined && grade > 0 && grade <= 9);

      if (validGrades.length > 0) {
        const average = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
        return Number(average.toFixed(2));
      }
    }

    // fallback: simpleSuneungData 사용
    if (simpleSuneungData) {
      // 새로운 구조인지 확인 (객체에 grade 속성이 있는지)
      const isNewStructure = simpleSuneungData.korean && typeof simpleSuneungData.korean === 'object' && 'grade' in simpleSuneungData.korean;
      
      let validScores = [];
      
      if (isNewStructure) {
        // 새로운 구조: { grade, standardScore, rawScore }
        validScores = [
          simpleSuneungData.korean?.grade, 
          simpleSuneungData.math?.grade, 
          simpleSuneungData.english?.grade, 
          simpleSuneungData.koreanHistory?.grade,
          simpleSuneungData.inquiry1?.grade, 
          simpleSuneungData.inquiry2?.grade
        ].filter(score => score > 0 && score <= 9);
      } else {
        // 이전 구조: 직접 숫자 값
        validScores = [
          simpleSuneungData.korean, 
          simpleSuneungData.math, 
          simpleSuneungData.english, 
          simpleSuneungData.inquiry1, 
          simpleSuneungData.inquiry2
        ].filter(score => score > 0 && score <= 9);
      }
      
      if (validScores.length === 0) return 0;
      
      const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
      return Number(average.toFixed(2));
    }
    
    // fallback: grades 사용
    if (!grades) return 0;
    
    const subjects = Object.values(grades.suneung);
    const validGrades = subjects.filter(subject => subject.grade > 0);
    
    if (validGrades.length === 0) return 0;
    
    const totalGrade = validGrades.reduce((sum, subject) => sum + subject.grade, 0);
    return Number((totalGrade / validGrades.length).toFixed(2));
  };

  // 추천 결과 가져오기 (새로운 API 사용)
  const fetchRecommendations = async () => {
    if (!studentId) {
      console.error('학생 ID가 없습니다.');
      return;
    }

    setLoading(true);
    try {
      // trackType에서 exam_type 결정 (문과 -> 'liberal', 이과 -> 'science')
      const trackType = simpleGradeData?.personalInfo?.trackType || grades?.personalInfo?.trackType || '';
      const examType = trackType.includes('문과') || trackType.includes('인문') ? 'liberal' : 'science';
      
      // exam_yyyymm 결정 (학생의 최신 성적 데이터에서 exam_year와 exam_month를 조합)
      let examYyyymm = 202509; // 기본값
      
      if (latestExamGrades) {
        const year = latestExamGrades.exam_year;
        const monthMap: Record<string, string> = {
          '3월': '03',
          '4월': '04',
          '6월': '06',
          '7월': '07',
          '9월': '09',
          '10월': '10',
          '수능': '11'
        };
        const monthStr = monthMap[latestExamGrades.exam_month] || '09';
        examYyyymm = parseInt(`${year}${monthStr}`);
      } else {
        // fallback: 현재 날짜 기준
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        examYyyymm = currentMonth >= 9 
          ? parseInt(`${currentYear}09`) 
          : parseInt(`${currentYear - 1}09`);
      }

      console.log('대학 추천 API 호출:', {
        studentId,
        examYyyymm,
        examType,
        trackType
      });

      // 새로운 대학 추천 API 호출
      const result = await getUniversityRecommendations(
        studentId,
        examYyyymm,
        examType
      );

      if (result.success && result.data) {
        console.log('=== 추천 결과 상세 정보 ===');
        console.log('학생 누백:', result.data.nubaek);
        console.log('S_ref:', result.data.s_ref);
        console.log('지망 학과:', result.data.preferred_majors);
        console.log('추천 대학 수:', result.data.recommendations.length);
        console.log('메타데이터:', result.data.metadata);
        console.log('=== 추천 결과 상세 정보 끝 ===');

        // university_config에서 반영비율 정보 가져오기
        const configMap: Record<string, any> = {};
        const examYear = result.data.metadata.cutline_year_used || 
          (currentMonth >= 9 ? currentYear + 1 : currentYear);
        
        if (result.data.preferred_majors && result.data.preferred_majors.length > 0) {
          // 추천된 대학 목록 추출
          const recommendedUniversities = result.data.recommendations.map((r: any) => r.university_name);
          const recommendedDepartments = result.data.recommendations.map((r: any) => r.department_name);
          
          const { data: configData } = await supabase
            .from('university_config')
            .select('*')
            .in('university_name', recommendedUniversities)
            .in('department_name', recommendedDepartments)
            .eq('admission_type', '정시')
            .eq('exam_type', examType === 'science' ? '이과' : '문과')
            .eq('exam_year', examYear);

          if (configData) {
            configData.forEach((config: any) => {
              const key = `${config.university_name}_${config.department_name}`;
              configMap[key] = config;
            });
          }
        }

        setUniversityConfigs(configMap);

        // 새로운 API 응답 형식을 기존 형식으로 변환
        const convertedRecommendations = result.data.recommendations.map((rec: any) => {
          const configKey = `${rec.university_name}_${rec.department_name}`;
          const config = configMap[configKey];
          
          return {
            university: rec.university_name,
            department: rec.department_name,
            admissionType: '정시(가)', // cutline_nubaek은 정시 데이터
            probability: rec.pass_rate || Math.max(0, Math.min(100, 100 - rec.nubaek_difference * 2)), // API에서 계산된 합격률 사용
            matchScore: rec.match_score,
            requirements: {
              minSuneungGrade: 0, // cutline_nubaek에는 등급 정보가 없음
              requiredSubjects: ['국어', '수학', '영어', '탐구']
            },
            admissionStrategy: `누백 ${rec.student_nubaek.toFixed(2)}% 기준 추천`,
            competitionAnalysis: `적정 누백: ${rec.appropriate_nubaek.toFixed(2)}%, 예상 누백: ${rec.expected_nubaek.toFixed(2)}%, 최소 누백: ${rec.minimum_nubaek.toFixed(2)}%`,
            recommendation: rec.color_code === 'Green' ? 'safe' : rec.color_code === 'LightGreen' ? 'optimal' : rec.color_code === 'Yellow' ? 'challenge' : 'challenge',
            nubaek: rec.student_nubaek,
            appropriateNubaek: rec.appropriate_nubaek,
            expectedNubaek: rec.expected_nubaek,
            minimumNubaek: rec.minimum_nubaek,
            passRate: rec.pass_rate, // 합격률 추가
            colorCode: rec.color_code, // 색상 코드 추가
            examYear: rec.exam_year, // 데이터 연도 추가
            koreanWeight: config?.korean_weight || 0,
            mathWeight: config?.math_weight || 0,
            inquiryWeight: config?.inquiry_weight || 0
          };
        });

        setRecommendations(convertedRecommendations);
      } else {
        console.error('추천 결과 가져오기 실패:', result.error);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('추천 결과 가져오기 오류:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 추천 결과 가져오기
  React.useEffect(() => {
    if (simpleGradeData || simpleSuneungData) {
      fetchRecommendations();
    }
  }, [simpleGradeData, simpleSuneungData]);

  const getSchoolSubjectAverages = () => {
    if (simpleGradeData) {
      return Object.entries(simpleGradeData).map(([subject, data]) => {
        const grades = Object.values(data).filter(g => typeof g === 'number' && g > 0);
        const average = grades.length > 0 ? grades.reduce((sum: number, grade: number) => sum + grade, 0) / grades.length : 0;
        return {
          subject: subject.charAt(0).toUpperCase() + subject.slice(1),
          average: Number(average.toFixed(2)),
          nationalAverage: Math.random() * 2 + 2
        };
      }).filter(item => item.average > 0);
    }
    
    if (!grades) return [];
    
    const subjectTotals: { [key: string]: { total: number; count: number } } = {};
    
    // 1학년 과목들
    ['국어', '영어', '수학', '사회', '과학'].forEach(subject => {
      const grade1S1 = grades.school.grade1.semester1[subject];
      const grade1S2 = grades.school.grade1.semester2[subject];
      
      let total = 0;
      let count = 0;
      
      if (grade1S1?.grade) { total += grade1S1.grade; count++; }
      if (grade1S2?.grade) { total += grade1S2.grade; count++; }
      
      if (count > 0) {
        subjectTotals[subject] = { total, count };
      }
    });

    // 2,3학년 과목들 (1,2,3으로 분류된 것들)
    ['국어', '영어', '수학', '사회', '과학'].forEach(baseSubject => {
      [1, 2, 3].forEach(num => {
        const subject = `${baseSubject}${num}`;
        const grade2S1 = grades.school.grade2.semester1[subject];
        const grade2S2 = grades.school.grade2.semester2[subject];
        const grade3S1 = grades.school.grade3.semester1[subject];
        const grade3S2 = grades.school.grade3.semester2[subject];
        
        let total = 0;
        let count = 0;
        
        if (grade2S1?.grade) { total += grade2S1.grade; count++; }
        if (grade2S2?.grade) { total += grade2S2.grade; count++; }
        if (grade3S1?.grade) { total += grade3S1.grade; count++; }
        if (grade3S2?.grade) { total += grade3S2.grade; count++; }
        
        if (count > 0) {
          if (!subjectTotals[baseSubject]) {
            subjectTotals[baseSubject] = { total: 0, count: 0 };
          }
          subjectTotals[baseSubject].total += total;
          subjectTotals[baseSubject].count += count;
        }
      });
    });

    return Object.entries(subjectTotals).map(([subject, data]) => ({
      subject,
      average: Number((data.total / data.count).toFixed(2)),
      nationalAverage: Math.random() * 2 + 2 // 모의 전국 평균
    }));
  };

  const getSuneungSubjectData = () => {
    // 최신 student_grades 테이블 데이터 우선 사용
    if (latestExamGrades) {
      return [
        { subject: '국어', grade: latestExamGrades.korean_grade || 0, percentile: latestExamGrades.korean_percentile || 0 },
        { subject: '수학', grade: latestExamGrades.math_grade || 0, percentile: latestExamGrades.math_percentile || 0 },
        { subject: '영어', grade: latestExamGrades.english_grade || 0, percentile: 0 },
        { subject: '한국사', grade: latestExamGrades.k_history_grade || 0, percentile: 0 },
        { subject: '탐구1', grade: latestExamGrades.inquiry1_grade || 0, percentile: latestExamGrades.inquiry1_percentile || 0 },
        { subject: '탐구2', grade: latestExamGrades.inquiry2_grade || 0, percentile: latestExamGrades.inquiry2_percentile || 0 }
      ].filter(item => item.grade > 0);
    }

    // fallback: simpleSuneungData 사용
    if (simpleSuneungData) {
      const isNewStructure = simpleSuneungData.korean && typeof simpleSuneungData.korean === 'object' && 'grade' in simpleSuneungData.korean;
      
      if (isNewStructure) {
        return [
          { subject: '국어', grade: simpleSuneungData.korean?.grade || 0, percentile: 0 },
          { subject: '수학', grade: simpleSuneungData.math?.grade || 0, percentile: 0 },
          { subject: '영어', grade: simpleSuneungData.english?.grade || 0, percentile: 0 },
          { subject: '한국사', grade: simpleSuneungData.koreanHistory?.grade || 0, percentile: 0 },
          { subject: '탐구1', grade: simpleSuneungData.inquiry1?.grade || 0, percentile: 0 },
          { subject: '탐구2', grade: simpleSuneungData.inquiry2?.grade || 0, percentile: 0 }
        ].filter(item => item.grade > 0);
      } else {
        return [
          { subject: '국어', grade: simpleSuneungData.korean || 0, percentile: 0 },
          { subject: '수학', grade: simpleSuneungData.math || 0, percentile: 0 },
          { subject: '영어', grade: simpleSuneungData.english || 0, percentile: 0 },
          { subject: '탐구1', grade: simpleSuneungData.inquiry1 || 0, percentile: 0 },
          { subject: '탐구2', grade: simpleSuneungData.inquiry2 || 0, percentile: 0 }
        ].filter(item => item.grade > 0);
      }
    }
    
    // fallback: grades 사용
    if (!grades) return [];
    
    const subjects = [
      { subject: '국어', grade: grades.suneung.korean.grade, percentile: grades.suneung.korean.percentile },
      { subject: '수학', grade: grades.suneung.math.grade, percentile: grades.suneung.math.percentile },
      { subject: '영어', grade: grades.suneung.english.grade, percentile: grades.suneung.english.percentile },
      { subject: '한국사', grade: grades.suneung.koreanHistory.grade, percentile: grades.suneung.koreanHistory.percentile },
      { subject: '탐구1', grade: grades.suneung.inquiry1.grade, percentile: grades.suneung.inquiry1.percentile },
      { subject: '탐구2', grade: grades.suneung.inquiry2.grade, percentile: grades.suneung.inquiry2.percentile },
      { subject: '제2외국어', grade: grades.suneung.secondLanguage.grade, percentile: grades.suneung.secondLanguage.percentile }
    ];

    return subjects.filter(item => item.grade > 0);
  };

  const schoolGPA = calculateSchoolGPA();
  const suneungAverage = calculateSuneungAverage();
  const schoolSubjectAverages = getSchoolSubjectAverages();
  const suneungSubjectData = getSuneungSubjectData();

  // 유리한 반영비율 계산
  const schoolBestRatio = grades ? calculateBestReflectionRatio(grades, 'school') : '분석 데이터 부족';
  const suneungBestRatio = grades ? calculateBestReflectionRatio(grades, 'suneung') : '분석 데이터 부족';

  // 실제 추천 결과에서 수시 대학 데이터 추출
  const susiUniversities: DetailedUniversity[] = recommendations 
    ? recommendations
        .filter((rec: any) => rec.admissionType?.includes('교과') || rec.admissionType?.includes('종합'))
        .slice(0, 20)
        .map((rec: any) => ({
          name: rec.university,
          department: rec.department,
          admissionType: '수시',
          competitionRate: rec.cutOffData?.competitionRate || 0,
          requiredGrade: rec.cutOffData?.grade50 || 0,
          matchPercentage: Math.round(rec.probabilityScore),
          location: '지역 정보 없음',
          description: `${rec.university} ${rec.department} - ${rec.probability} 추천`,
          requirements: {
            minInternalGrade: rec.cutOffData?.grade50,
            requiredSubjects: [],
            additionalFactors: rec.reasons || []
          },
          admissionStrategy: rec.reasons?.join(', ') || '추천 이유 없음',
          competitionAnalysis: `경쟁률 ${rec.cutOffData?.competitionRate || 0}:1`,
          recommendation: rec.probability === '안정' ? 'safe' : rec.probability === '적정' ? 'optimal' : 'challenge',
          reflectionRatio: '반영비율 정보 없음',
          admissionData: {
            lastYear: { score: rec.cutOffData?.grade50 || 0, students: 0 },
            threeYearAvg: { score: rec.cutOffData?.grade50 || 0, students: 0 },
            yearlyData: []
          }
        }))
    : [];

  // 실제 추천 결과에서 정시 대학 데이터 추출 (새로운 API 형식)
  const jungsiRecommendations = recommendations 
    ? recommendations.filter((rec: any) => rec.admissionType?.includes('정시'))
    : [];

  const jungsiUniversities = {
    ga: jungsiRecommendations
      .slice(0, 6) // 상위 6개만 가군으로 표시
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '정시 가군',
        competitionRate: 0, // cutline_nubaek에는 경쟁률 정보 없음
        requiredGrade: 0,
        matchPercentage: Math.round(rec.probability || 0),
        location: '지역 정보 없음',
        description: `${rec.university} ${rec.department} - 누백 ${rec.nubaek?.toFixed(2) || 0}%`,
        requirements: rec.requirements || {
          minSuneungGrade: 0,
          requiredSubjects: ['국어', '수학', '영어', '탐구'],
          additionalFactors: []
        },
        admissionStrategy: rec.admissionStrategy || '누백 기준 추천',
        competitionAnalysis: rec.competitionAnalysis || `적정 누백: ${rec.appropriateNubaek?.toFixed(2) || 0}%`,
        recommendation: rec.recommendation || 'safe',
        reflectionRatio: '반영비율 정보 없음',
        admissionData: {
          lastYear: { score: 0, students: 0 },
          threeYearAvg: { score: 0, students: 0 },
          yearlyData: []
        },
        nubaek: rec.nubaek,
        appropriateNubaek: rec.appropriateNubaek,
        expectedNubaek: rec.expectedNubaek,
        minimumNubaek: rec.minimumNubaek,
        passRate: rec.passRate,
        colorCode: rec.colorCode
      } as DetailedUniversity)),
    na: jungsiRecommendations
      .slice(6, 12) // 7-12번째를 나군으로 표시
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '정시 나군',
        competitionRate: 0,
        requiredGrade: 0,
        matchPercentage: Math.round(rec.probability || 0),
        location: '지역 정보 없음',
        description: `${rec.university} ${rec.department} - 누백 ${rec.nubaek?.toFixed(2) || 0}%`,
        requirements: rec.requirements || {
          minSuneungGrade: 0,
          requiredSubjects: ['국어', '수학', '영어', '탐구'],
          additionalFactors: []
        },
        admissionStrategy: rec.admissionStrategy || '누백 기준 추천',
        competitionAnalysis: rec.competitionAnalysis || `적정 누백: ${rec.appropriateNubaek?.toFixed(2) || 0}%`,
        recommendation: rec.recommendation || 'safe',
        reflectionRatio: '반영비율 정보 없음',
        admissionData: {
          lastYear: { score: 0, students: 0 },
          threeYearAvg: { score: 0, students: 0 },
          yearlyData: []
        },
        nubaek: rec.nubaek,
        appropriateNubaek: rec.appropriateNubaek,
        expectedNubaek: rec.expectedNubaek,
        minimumNubaek: rec.minimumNubaek,
        passRate: rec.passRate,
        colorCode: rec.colorCode
      } as DetailedUniversity)),
    da: jungsiRecommendations
      .slice(12, 18) // 13-18번째를 다군으로 표시
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '정시 다군',
        competitionRate: 0,
        requiredGrade: 0,
        matchPercentage: Math.round(rec.probability || 0),
        location: '지역 정보 없음',
        description: `${rec.university} ${rec.department} - 누백 ${rec.nubaek?.toFixed(2) || 0}%`,
        requirements: rec.requirements || {
          minSuneungGrade: 0,
          requiredSubjects: ['국어', '수학', '영어', '탐구'],
          additionalFactors: []
        },
        admissionStrategy: rec.admissionStrategy || '누백 기준 추천',
        competitionAnalysis: rec.competitionAnalysis || `적정 누백: ${rec.appropriateNubaek?.toFixed(2) || 0}%`,
        recommendation: rec.recommendation || 'safe',
        reflectionRatio: '반영비율 정보 없음',
        admissionData: {
          lastYear: { score: 0, students: 0 },
          threeYearAvg: { score: 0, students: 0 },
          yearlyData: []
        },
        nubaek: rec.nubaek,
        appropriateNubaek: rec.appropriateNubaek,
        expectedNubaek: rec.expectedNubaek,
        minimumNubaek: rec.minimumNubaek,
        passRate: rec.passRate,
        colorCode: rec.colorCode
      } as DetailedUniversity))
  };


  const toggleAnalysis = (universityKey: string) => {
    setExpandedAnalysis(prev => ({
      ...prev,
      [universityKey]: !prev[universityKey]
    }));
  };

  // 개인정보 표시 섹션
  const renderPersonalInfo = () => (
    <Card className="shadow-lg border-navy-200 mb-6">
      <CardHeader className="bg-navy-50">
        <CardTitle className="text-navy-800 flex items-center gap-2">
          <User className="w-5 h-5" />
          학생 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-navy-600">이름:</span>
            <span className="ml-2 text-navy-900">{simpleGradeData?.personalInfo?.name || grades?.personalInfo?.name || '미입력'}</span>
          </div>
          <div>
            <span className="text-navy-600">주소:</span>
            <span className="ml-2 text-navy-900">{simpleGradeData?.personalInfo?.address || grades?.personalInfo?.address || '미입력'}</span>
          </div>
          <div>
            <span className="text-navy-600">학교유형:</span>
            <span className="ml-2 text-navy-900">{simpleGradeData?.personalInfo?.schoolType || grades?.personalInfo?.schoolType || '미입력'}</span>
          </div>
          <div>
            <span className="text-navy-600">계열:</span>
            <span className="ml-2 text-navy-900">{simpleGradeData?.personalInfo?.trackType || grades?.personalInfo?.trackType || '미입력'}</span>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-navy-600">지망학과:</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              simpleGradeData?.personalInfo?.preferredMajor1 || grades?.personalInfo?.preferredMajor1,
              simpleGradeData?.personalInfo?.preferredMajor2 || grades?.personalInfo?.preferredMajor2,
              simpleGradeData?.personalInfo?.preferredMajor3 || grades?.personalInfo?.preferredMajor3
            ]
              .filter(major => major && major.trim())
              .map((major, index) => (
                <Badge key={index} className="bg-gold-100 text-gold-800">
                  {major === '기타(직접입력)' ? (simpleGradeData?.personalInfo?.customMajor || grades?.personalInfo?.customMajor || '기타') : major}
                </Badge>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 향상된 대학 카드 렌더링 함수
  const renderEnhancedUniversityCard = (university: DetailedUniversity, index: number) => {
    const colorClass = getAdmissionProbabilityColor(university.matchPercentage);
    const isExpanded = expandedAnalysis[`${university.name}-${index}`];
    
    return (
      <div key={`${university.name}-${index}`} className={`p-4 rounded-lg border-2 ${colorClass} text-white mb-4`}>
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{university.name}</h3>
              <p className="text-sm opacity-90">{university.department}</p>
              <p className="text-xs opacity-75">{university.location}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{university.matchPercentage}%</div>
              <div className="text-xs">합격가능성</div>
            </div>
          </div>

          <div className="bg-white/20 rounded p-3 space-y-2">
            <div className="text-sm">
              <strong>반영비율:</strong> {university.reflectionRatio}
            </div>
            {university.admissionData && (
              <div className="space-y-1 text-xs">
                <div><strong>작년 데이터:</strong> {university.admissionData.lastYear.score}등급 / {university.admissionData.lastYear.students}명</div>
                <div className="opacity-75"><strong>3년 평균:</strong> {university.admissionData.threeYearAvg.score}등급 / {university.admissionData.threeYearAvg.students}명</div>
                <div className="opacity-75">
                  <strong>연도별:</strong> {university.admissionData.yearlyData.map(data => 
                    `${data.year}년 ${data.score}등급`
                  ).join(', ')}
                </div>
              </div>
            )}
          </div>

          <Collapsible>
            <CollapsibleTrigger 
              className="flex items-center justify-between w-full p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
              onClick={() => toggleAnalysis(`${university.name}-${index}`)}
            >
              <span className="text-sm font-medium">상세 분석</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            {isExpanded && (
              <CollapsibleContent className="bg-white/20 rounded p-3 mt-2 space-y-2 text-sm">
                <div>
                  <strong>전략:</strong> {university.admissionStrategy}
                </div>
                <div>
                  <strong>경쟁분석:</strong> {university.competitionAnalysis}
                </div>
                <div>
                  <strong>경쟁률:</strong> {university.competitionRate}:1
                </div>
              </CollapsibleContent>
            )}
          </Collapsible>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-navy-50 p-4" ref={reportRef}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button onClick={onBack} variant="outline" className="mb-4 border-navy-300 text-navy-700 hover:bg-navy-100">
            ← 성적 입력으로 돌아가기
          </Button>
          <h1 className="text-3xl mb-2 text-navy-900">성적 분석 보고서</h1>
          <p className="text-navy-600">{studentName ? `${studentName}님의 ` : ''}맞춤형 입시 분석 결과입니다.</p>
        </div>

        {renderPersonalInfo()}

        {/* 성적 분석 요약 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 내신 성적 분석 */}
          <Card className="shadow-lg border-navy-200">
            <CardHeader className="bg-navy-50">
              <CardTitle className="text-navy-800 flex items-center gap-2">
                <School className="w-5 h-5" />
                내신 과목별 성적분석
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-navy-50 rounded">
                  <span className="text-navy-700">평균 내신등급</span>
                  <span className="text-2xl font-bold text-navy-900">{schoolGPA || 0}등급</span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-navy-800">유리한 반영비율</h4>
                  <p className="text-sm text-navy-600 bg-gold-50 p-2 rounded border border-gold-200">
                    {schoolBestRatio}
                  </p>
                </div>

                {schoolSubjectAverages.length > 0 && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={schoolSubjectAverages}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 9]} />
                        <Tooltip />
                        <Bar dataKey="average" fill="#f59e0b" name="내 성적" />
                        <Bar dataKey="nationalAverage" fill="#94a3b8" name="전국평균" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 수능 성적 분석 */}
          <Card className="shadow-lg border-navy-200">
            <CardHeader className="bg-navy-50">
              <CardTitle className="text-navy-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                수능 과목별 성적분석
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-navy-50 rounded">
                  <span className="text-navy-700">평균 수능등급</span>
                  <span className="text-2xl font-bold text-navy-900">{suneungAverage || 0}등급</span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-navy-800">유리한 반영비율</h4>
                  <p className="text-sm text-navy-600 bg-gold-50 p-2 rounded border border-gold-200">
                    {suneungBestRatio}
                  </p>
                </div>

                {suneungSubjectData.length > 0 && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={suneungSubjectData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 9]} />
                        <Tooltip />
                        <Bar dataKey="grade" fill="#0f172a" name="등급" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 대학 추천 섹션 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="susi">수시 추천 대학</TabsTrigger>
            <TabsTrigger value="jungsi">정시 추천 대학</TabsTrigger>
          </TabsList>

          <TabsContent value="susi">
            <Card className="shadow-lg border-navy-200">
              <CardHeader className="bg-navy-50">
                <CardTitle className="text-navy-800">수시 추천 대학 (상위 20개)</CardTitle>
                <p className="text-navy-600 text-sm mt-2">
                  색상으로 합격 가능성을 표시합니���: 
                  <span className="inline-block w-3 h-3 bg-green-600 rounded ml-2 mr-1"></span>80%+ 
                  <span className="inline-block w-3 h-3 bg-green-300 rounded ml-2 mr-1"></span>50-79% 
                  <span className="inline-block w-3 h-3 bg-yellow-400 rounded ml-2 mr-1"></span>20-49% 
                  <span className="inline-block w-3 h-3 bg-red-500 rounded ml-2 mr-1"></span>20%미만
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-navy-600">추천 결과를 계산 중입니다...</div>
                  </div>
                ) : susiUniversities.length > 0 ? (
                  <div className="space-y-4">
                    {susiUniversities.map((university, index) => renderEnhancedUniversityCard(university, index))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-navy-600">추천할 수시 대학이 없습니다.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jungsi">
            <Card className="shadow-lg border-navy-200">
              <CardHeader className="bg-navy-50">
                <CardTitle className="text-navy-800">정시 추천 대학</CardTitle>
                <p className="text-navy-600 text-sm mt-2">
                  지망 학과별 추천 대학 (각 6개씩)
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-navy-600">추천 결과를 계산 중입니다...</div>
                  </div>
                ) : Object.keys(recommendationsByMajor).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(recommendationsByMajor).map(([major, recs]) => (
                      <div key={major} className="space-y-4">
                        <h3 className="text-lg font-semibold text-navy-800 border-b-2 border-navy-200 pb-2">
                          {major}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {recs.map((rec: any, index: number) => {
                            // 색상 코드에 따른 배경색 결정
                            const getColorClass = (colorCode?: string) => {
                              switch (colorCode) {
                                case 'Green':
                                  return 'bg-green-50 border-green-300';
                                case 'LightGreen':
                                  return 'bg-green-100 border-green-400';
                                case 'Yellow':
                                  return 'bg-yellow-50 border-yellow-300';
                                case 'Red':
                                  return 'bg-red-50 border-red-300';
                                default:
                                  return 'bg-gray-50 border-gray-300';
                              }
                            };

                            const colorClass = getColorClass(rec.colorCode);
                            const reflectionRatio = rec.koreanWeight && rec.mathWeight && rec.inquiryWeight
                              ? `국어 ${(rec.koreanWeight * 100).toFixed(0)}%, 수학 ${(rec.mathWeight * 100).toFixed(0)}%, 탐구 ${(rec.inquiryWeight * 100).toFixed(0)}%`
                              : '반영비율 정보 없음';

                            return (
                              <Card
                                key={`${major}-${index}`}
                                className={`shadow-md border-2 ${colorClass} hover:shadow-lg transition-shadow`}
                              >
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h4 className="font-bold text-navy-900 text-lg">{rec.university}</h4>
                                        <p className="text-sm text-navy-700 mt-1">{rec.department}</p>
                                      </div>
                                      <Badge
                                        className={`ml-2 ${
                                          rec.colorCode === 'Green'
                                            ? 'bg-green-600'
                                            : rec.colorCode === 'LightGreen'
                                            ? 'bg-green-400'
                                            : rec.colorCode === 'Yellow'
                                            ? 'bg-yellow-400'
                                            : 'bg-red-500'
                                        } text-white`}
                                      >
                                        {rec.passRate?.toFixed(1) || 0}%
                                      </Badge>
                                    </div>
                                    
                                    <div className="mt-3 space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-navy-600">반영비율:</span>
                                        <span className="text-navy-800 font-medium">{reflectionRatio}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-navy-600">데이터 연도:</span>
                                        <span className="text-navy-800 font-medium">{rec.examYear || 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-navy-600">합격율:</span>
                                        <span className="text-navy-800 font-bold">{rec.passRate?.toFixed(1) || 0}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-navy-600">추천할 정시 대학이 없습니다.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
