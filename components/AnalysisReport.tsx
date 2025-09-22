
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
    if (simpleSuneungData) {
      // simpleSuneungData에서 유효한 등급만 추출
      const validScores = [
        simpleSuneungData.korean, 
        simpleSuneungData.math, 
        simpleSuneungData.english, 
        simpleSuneungData.inquiry1, 
        simpleSuneungData.inquiry2
      ].filter(score => score > 0 && score <= 9); // 1-9등급 범위 확인
      
      console.log('수능 성적 데이터:', simpleSuneungData);
      console.log('유효한 등급들:', validScores);
      
      if (validScores.length === 0) return 0;
      
      const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
      console.log('평균 수능등급:', average);
      
      return Number(average.toFixed(2));
    }
    
    if (!grades) return 0;
    
    const subjects = Object.values(grades.suneung);
    const validGrades = subjects.filter(subject => subject.grade > 0);
    
    if (validGrades.length === 0) return 0;
    
    const totalGrade = validGrades.reduce((sum, subject) => sum + subject.grade, 0);
    return Number((totalGrade / validGrades.length).toFixed(2));
  };

  // 추천 결과 가져오기
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // 학생 데이터 구성
      const studentData = {
        name: studentName || "학생",
        schoolType: grades?.personalInfo?.schoolType === '특목고' ? '특목고' : 
                   grades?.personalInfo?.schoolType === '자사고' ? '자사고' :
                   grades?.personalInfo?.schoolType === '국제고' ? '국제고' : '일반고',
        schoolGrades: grades?.school || {
          grade1: { semester1: {}, semester2: {} },
          grade2: { semester1: {}, semester2: {} },
          grade3: { semester1: {}, semester2: {} }
        },
        suneungGrades: {
          korean: { grade: simpleSuneungData?.korean || 0, standardScore: 0, percentile: 0 },
          math: { grade: simpleSuneungData?.math || 0, standardScore: 0, percentile: 0 },
          english: { grade: simpleSuneungData?.english || 0, standardScore: 0, percentile: 0 },
          koreanHistory: { grade: 0, standardScore: 0, percentile: 0 },
          inquiry1: { grade: simpleSuneungData?.inquiry1 || 0, standardScore: 0, percentile: 0 },
          inquiry2: { grade: simpleSuneungData?.inquiry2 || 0, standardScore: 0, percentile: 0 }
        },
        preferredUniversities: [],
        preferredMajors: [],
        preferredRegions: []
      };

      const response = await fetch(`https://kgbcqvvkahugbrqlomjc.supabase.co/functions/v1/calculate-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYmNxdnZrYWh1Z2JycWxvbWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODM5MjgsImV4cCI6MjA3MTI1OTkyOH0.o23VzWrv9Kv6jWb7eIw4a3rWkkWfA5TQyU2Z1RRhvQI`
        },
        body: JSON.stringify({
          studentData,
          debugMode: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        setRecommendations(result.recommendations || []);
      } else {
        console.error('추천 결과 가져오기 실패');
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
    if (simpleSuneungData) {
      return [
        { subject: '국어', grade: simpleSuneungData.korean, percentile: 0 },
        { subject: '수학', grade: simpleSuneungData.math, percentile: 0 },
        { subject: '영어', grade: simpleSuneungData.english, percentile: 0 },
        { subject: '탐구1', grade: simpleSuneungData.inquiry1, percentile: 0 },
        { subject: '탐구2', grade: simpleSuneungData.inquiry2, percentile: 0 }
      ].filter(item => item.grade > 0);
    }
    
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
        .filter((rec: any) => rec.admissionType === '수시' || rec.admissionType?.includes('수시'))
        .slice(0, 20)
        .map((rec: any) => ({
          name: rec.university,
          department: rec.department,
          admissionType: '수시',
          competitionRate: rec.cutOffData?.competitionRate || 0,
          requiredGrade: rec.cutOffData?.grade50 || 0,
          matchPercentage: rec.probabilityScore,
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

  // 실제 추천 결과에서 정시 대학 데이터 추출
  const jungsiRecommendations = recommendations 
    ? recommendations.filter((rec: any) => rec.admissionType === '정시' || rec.admissionType?.includes('정시'))
    : [];

  const jungsiUniversities = {
    ga: jungsiRecommendations
      .filter((rec: any) => rec.admissionType?.includes('가군') || rec.admissionType === '정시')
      .slice(0, 6)
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '정시 가군',
        competitionRate: rec.cutOffData?.competitionRate || 0,
        requiredGrade: rec.cutOffData?.grade50 || 0,
        matchPercentage: rec.probabilityScore,
        location: '지역 정보 없음',
        description: `${rec.university} ${rec.department} - ${rec.probability} 추천`,
        requirements: {
          minSuneungGrade: rec.cutOffData?.grade50,
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
      } as DetailedUniversity),,
    na: jungsiRecommendations
      .filter((rec: any) => rec.admissionType?.includes('나군'))
      .slice(0, 6)
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '정시 나군',
        competitionRate: rec.cutOffData?.competitionRate || 0,
        requiredGrade: rec.cutOffData?.grade50 || 0,
        matchPercentage: rec.probabilityScore,
        location: '지역 정보 없음',
        description: `${rec.university} ${rec.department} - ${rec.probability} 추천`,
        requirements: {
          minSuneungGrade: rec.cutOffData?.grade50,
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
      } as DetailedUniversity),
    da: jungsiRecommendations
      .filter((rec: any) => rec.admissionType?.includes('다군'))
      .slice(0, 6)
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '정시 다군',
        competitionRate: rec.cutOffData?.competitionRate || 0,
        requiredGrade: rec.cutOffData?.grade50 || 0,
        matchPercentage: rec.probabilityScore,
        location: '지역 정보 없음',
        description: `${rec.university} ${rec.department} - ${rec.probability} 추천`,
        requirements: {
          minSuneungGrade: rec.cutOffData?.grade50,
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
      } as DetailedUniversity)
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
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.name || '미입력'}</span>
          </div>
          <div>
            <span className="text-navy-600">주소:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.address || '미입력'}</span>
          </div>
          <div>
            <span className="text-navy-600">학교유형:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.schoolType || '미입력'}</span>
          </div>
          <div>
            <span className="text-navy-600">계열:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.trackType || '미입력'}</span>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-navy-600">지망학과:</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {[grades?.personalInfo?.preferredMajor1, grades?.personalInfo?.preferredMajor2, grades?.personalInfo?.preferredMajor3]
              .filter(major => major && major.trim())
              .map((major, index) => (
                <Badge key={index} className="bg-gold-100 text-gold-800">
                  {major === '기타(직접입력)' ? grades?.personalInfo?.customMajor || '기타' : major}
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
            <Tabs value={activeJungsiTab} onValueChange={setActiveJungsiTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="ga">가군</TabsTrigger>
                <TabsTrigger value="na">나군</TabsTrigger>
                <TabsTrigger value="da">다군</TabsTrigger>
              </TabsList>

              <TabsContent value="ga">
                <Card className="shadow-lg border-navy-200">
                  <CardHeader className="bg-navy-50">
                    <CardTitle className="text-navy-800">정시 가군 추천 대학</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천 결과를 계산 중입니다...</div>
                      </div>
                    ) : jungsiUniversities.ga.length > 0 ? (
                      <div className="space-y-4">
                        {jungsiUniversities.ga.map((university, index) => renderEnhancedUniversityCard(university, index))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천할 가군 대학이 없습니다.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="na">
                <Card className="shadow-lg border-navy-200">
                  <CardHeader className="bg-navy-50">
                    <CardTitle className="text-navy-800">정시 나군 추천 대학</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천 결과를 계산 중입니다...</div>
                      </div>
                    ) : jungsiUniversities.na.length > 0 ? (
                      <div className="space-y-4">
                        {jungsiUniversities.na.map((university, index) => renderEnhancedUniversityCard(university, index))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천할 나군 대학이 없습니다.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="da">
                <Card className="shadow-lg border-navy-200">
                  <CardHeader className="bg-navy-50">
                    <CardTitle className="text-navy-800">정시 다군 추천 대학</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천 결과를 계산 중입니다...</div>
                      </div>
                    ) : jungsiUniversities.da.length > 0 ? (
                      <div className="space-y-4">
                        {jungsiUniversities.da.map((university, index) => renderEnhancedUniversityCard(university, index))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천할 다군 대학이 없습니다.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
