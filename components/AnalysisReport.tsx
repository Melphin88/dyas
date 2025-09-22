
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

// 반영비율 분석 ?�수
const calculateBestReflectionRatio = (grades: GradeData, type: 'school' | 'suneung') => {
  if (type === 'school') {
    const subjects = ['�?��', '?�어', '?�학', '?�회', '과학'];
    const subjectAverages = subjects.map(subject => {
      let total = 0;
      let count = 0;
      
      // 1?�년
      const grade1S1 = grades.school.grade1.semester1[subject];
      const grade1S2 = grades.school.grade1.semester2[subject];
      if (grade1S1?.grade) { total += grade1S1.grade; count++; }
      if (grade1S2?.grade) { total += grade1S2.grade; count++; }
      
      // 2,3?�년 (1,2,3?�로 분류??것들)
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
    
    // ?�적??좋�? ?�으�??�렬
    subjectAverages.sort((a, b) => a.average - b.average);
    return `${subjectAverages[0].subject}(${subjectAverages[0].average}) > ${subjectAverages[1].subject}(${subjectAverages[1].average}) > ${subjectAverages[2].subject}(${subjectAverages[2].average})`;
  } else {
    const subjects = [
      { name: '�?��', grade: grades.suneung.korean.grade },
      { name: '?�학', grade: grades.suneung.math.grade },
      { name: '?�어', grade: grades.suneung.english.grade },
      { name: '?�회', grade: Math.min(grades.suneung.inquiry1.grade, grades.suneung.inquiry2.grade) },
      { name: '과학', grade: Math.min(grades.suneung.inquiry1.grade, grades.suneung.inquiry2.grade) }
    ];
    
    const validSubjects = subjects.filter(s => s.grade > 0).sort((a, b) => a.grade - b.grade);
    return validSubjects.slice(0, 3).map(s => `${s.name}(${s.grade}?�급)`).join(' > ');
  }
};

// ?�격 가?�성???�른 ?�상 결정
const getAdmissionProbabilityColor = (matchPercentage: number) => {
  if (matchPercentage >= 80) return 'bg-green-600'; // 진한?�색 - ?�격�?80% ?�상
  if (matchPercentage >= 50) return 'bg-green-300'; // ?�한?�색 - ?�격�?50-79%
  if (matchPercentage >= 20) return 'bg-yellow-400'; // ?�랑??- ?�격�?20-49%
  return 'bg-red-500'; // 붉�???- ?�격�?20% 미만
};

export function AnalysisReport({ studentId, studentName, grades, simpleGradeData, simpleSuneungData, onBack }: AnalysisReportProps) {
  const [activeTab, setActiveTab] = useState('susi');
  const [activeJungsiTab, setActiveJungsiTab] = useState('ga');
  const [expandedAnalysis, setExpandedAnalysis] = useState<{[key: string]: boolean}>({});
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // 추천 결과 가?�오�?
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // ?�생 ?�이??구성
      const studentData = {
        name: studentName || "?�생",
        schoolType: grades?.personalInfo?.schoolType === '?�목�? ? '?�목�? : 
                   grades?.personalInfo?.schoolType === '?�사�? ? '?�사�? :
                   grades?.personalInfo?.schoolType === '�?���? ? '�?���? : '?�반�?,
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
        console.error('추천 결과 가?�오�??�패');
        setRecommendations([]);
      }
    } catch (error) {
      console.error('추천 결과 가?�오�??�류:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // 컴포?�트 마운????추천 결과 가?�오�?
  React.useEffect(() => {
    if (simpleGradeData || simpleSuneungData) {
      fetchRecommendations();
    }
  }, [simpleGradeData, simpleSuneungData]);

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
      // simpleSuneungData?�서 ?�효???�급�?추출
      const validScores = [
        simpleSuneungData.korean, 
        simpleSuneungData.math, 
        simpleSuneungData.english, 
        simpleSuneungData.inquiry1, 
        simpleSuneungData.inquiry2
      ].filter(score => score > 0 && score <= 9); // 1-9?�급 범위 ?�인
      
      console.log('?�능 ?�적 ?�이??', simpleSuneungData);
      console.log('?�효???�급??', validScores);
      
      if (validScores.length === 0) return 0;
      
      const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
      console.log('?�균 ?�능?�급:', average);
      
      return Number(average.toFixed(2));
    }
    
    if (!grades) return 0;
    
    const subjects = Object.values(grades.suneung);
    const validGrades = subjects.filter(subject => subject.grade > 0);
    
    if (validGrades.length === 0) return 0;
    
    const totalGrade = validGrades.reduce((sum, subject) => sum + subject.grade, 0);
    return Number((totalGrade / validGrades.length).toFixed(2));
  };

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
    
    // 1?�년 과목??
    ['�?��', '?�어', '?�학', '?�회', '과학'].forEach(subject => {
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

    // 2,3?�년 과목??(1,2,3?�로 분류??것들)
    ['�?��', '?�어', '?�학', '?�회', '과학'].forEach(baseSubject => {
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
      nationalAverage: Math.random() * 2 + 2 // 모의 ?�국 ?�균
    }));
  };

  const getSuneungSubjectData = () => {
    if (simpleSuneungData) {
      return [
        { subject: '�?��', grade: simpleSuneungData.korean, percentile: 0 },
        { subject: '?�학', grade: simpleSuneungData.math, percentile: 0 },
        { subject: '?�어', grade: simpleSuneungData.english, percentile: 0 },
        { subject: '?�구1', grade: simpleSuneungData.inquiry1, percentile: 0 },
        { subject: '?�구2', grade: simpleSuneungData.inquiry2, percentile: 0 }
      ].filter(item => item.grade > 0);
    }
    
    if (!grades) return [];
    
    const subjects = [
      { subject: '�?��', grade: grades.suneung.korean.grade, percentile: grades.suneung.korean.percentile },
      { subject: '?�학', grade: grades.suneung.math.grade, percentile: grades.suneung.math.percentile },
      { subject: '?�어', grade: grades.suneung.english.grade, percentile: grades.suneung.english.percentile },
      { subject: '?�국??, grade: grades.suneung.koreanHistory.grade, percentile: grades.suneung.koreanHistory.percentile },
      { subject: '?�구1', grade: grades.suneung.inquiry1.grade, percentile: grades.suneung.inquiry1.percentile },
      { subject: '?�구2', grade: grades.suneung.inquiry2.grade, percentile: grades.suneung.inquiry2.percentile },
      { subject: '???�국??, grade: grades.suneung.secondLanguage.grade, percentile: grades.suneung.secondLanguage.percentile }
    ];

    return subjects.filter(item => item.grade > 0);
  };

  const schoolGPA = calculateSchoolGPA();
  const suneungAverage = calculateSuneungAverage();
  const schoolSubjectAverages = getSchoolSubjectAverages();
  const suneungSubjectData = getSuneungSubjectData();

  // ?�리??반영비율 계산
  const schoolBestRatio = grades ? calculateBestReflectionRatio(grades, 'school') : '분석 ?�이??부�?;
  const suneungBestRatio = grades ? calculateBestReflectionRatio(grades, 'suneung') : '분석 ?�이??부�?;

  // ?�제 추천 결과?�서 ?�시 ?�???�이??추출
  const susiUniversities: DetailedUniversity[] = recommendations 
    ? recommendations
        .filter((rec: any) => rec.admissionType === '?�시' || rec.admissionType?.includes('?�시'))
        .slice(0, 20)
        .map((rec: any) => ({
          name: rec.university,
          department: rec.department,
      admissionType: '?�시',
          competitionRate: rec.cutOffData?.competitionRate || 0,
          requiredGrade: rec.cutOffData?.grade50 || 0,
          matchPercentage: rec.probabilityScore,
          location: '지???�보 ?�음',
          description: `${rec.university} ${rec.department} - ${rec.probability} 추천`,
      requirements: {
            minInternalGrade: rec.cutOffData?.grade50,
            requiredSubjects: [],
            additionalFactors: rec.reasons || []
          },
          admissionStrategy: rec.reasons?.join(', ') || '추천 ?�유 ?�음',
          competitionAnalysis: `경쟁�?${rec.cutOffData?.competitionRate || 0}:1`,
          recommendation: rec.probability === '?�정' ? 'safe' : rec.probability === '?�정' ? 'optimal' : 'challenge',
          reflectionRatio: '반영비율 ?�보 ?�음',
      admissionData: {
            lastYear: { score: rec.cutOffData?.grade50 || 0, students: 0 },
            threeYearAvg: { score: rec.cutOffData?.grade50 || 0, students: 0 },
            yearlyData: []
          }
        }))
    : [];

  // ?�제 추천 결과?�서 ?�시 ?�???�이??추출
  const jungsiRecommendations = recommendations 
    ? recommendations.filter((rec: any) => rec.admissionType === '?�시' || rec.admissionType?.includes('?�시'))
    : [];

  const jungsiUniversities = {
    ga: jungsiRecommendations
      .filter((rec: any) => rec.admissionType?.includes('가�?) || rec.admissionType === '?�시')
      .slice(0, 6)
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '?�시 가�?,
        competitionRate: rec.cutOffData?.competitionRate || 0,
        requiredGrade: rec.cutOffData?.grade50 || 0,
        matchPercentage: rec.probabilityScore,
        location: '지???�보 ?�음',
        description: `${rec.university} ${rec.department} - ${rec.probability} 추천`,
        requirements: {
          minSuneungGrade: rec.cutOffData?.grade50,
          requiredSubjects: [],
          additionalFactors: rec.reasons || []
        },
        admissionStrategy: rec.reasons?.join(', ') || '추천 ?�유 ?�음',
        competitionAnalysis: `경쟁�?${rec.cutOffData?.competitionRate || 0}:1`,
        recommendation: rec.probability === '?�정' ? 'safe' : rec.probability === '?�정' ? 'optimal' : 'challenge',
        reflectionRatio: '반영비율 ?�보 ?�음',
        admissionData: {
          lastYear: { score: rec.cutOffData?.grade50 || 0, students: 0 },
          threeYearAvg: { score: rec.cutOffData?.grade50 || 0, students: 0 },
          yearlyData: []
        }
      } as DetailedUniversity),
    na: jungsiRecommendations
      .filter((rec: any) => rec.admissionType?.includes('?�군'))
      .slice(0, 6)
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '?�시 ?�군',
        competitionRate: rec.cutOffData?.competitionRate || 0,
        requiredGrade: rec.cutOffData?.grade50 || 0,
        matchPercentage: rec.probabilityScore,
        location: '지???�보 ?�음',
        description: `${rec.university} ${rec.department} - ${rec.probability} 추천`,
        requirements: {
          minSuneungGrade: rec.cutOffData?.grade50,
          requiredSubjects: [],
          additionalFactors: rec.reasons || []
        },
        admissionStrategy: rec.reasons?.join(', ') || '추천 ?�유 ?�음',
        competitionAnalysis: `경쟁�?${rec.cutOffData?.competitionRate || 0}:1`,
        recommendation: rec.probability === '?�정' ? 'safe' : rec.probability === '?�정' ? 'optimal' : 'challenge',
        reflectionRatio: '반영비율 ?�보 ?�음',
        admissionData: {
          lastYear: { score: rec.cutOffData?.grade50 || 0, students: 0 },
          threeYearAvg: { score: rec.cutOffData?.grade50 || 0, students: 0 },
          yearlyData: []
        }
      } as DetailedUniversity),
    da: jungsiRecommendations
      .filter((rec: any) => rec.admissionType?.includes('?�군'))
      .slice(0, 6)
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '?�시 ?�군',
        competitionRate: rec.cutOffData?.competitionRate || 0,
        requiredGrade: rec.cutOffData?.grade50 || 0,
        matchPercentage: rec.probabilityScore,
        location: '지???�보 ?�음',
        description: `${rec.university} ${rec.department} - ${rec.probability} 추천`,
        requirements: {
          minSuneungGrade: rec.cutOffData?.grade50,
          requiredSubjects: [],
          additionalFactors: rec.reasons || []
        },
        admissionStrategy: rec.reasons?.join(', ') || '추천 ?�유 ?�음',
        competitionAnalysis: `경쟁�?${rec.cutOffData?.competitionRate || 0}:1`,
        recommendation: rec.probability === '?�정' ? 'safe' : rec.probability === '?�정' ? 'optimal' : 'challenge',
        reflectionRatio: '반영비율 ?�보 ?�음',
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

  // 개인?�보 ?�시 ?�션
  const renderPersonalInfo = () => (
    <Card className="shadow-lg border-navy-200 mb-6">
      <CardHeader className="bg-navy-50">
        <CardTitle className="text-navy-800 flex items-center gap-2">
          <User className="w-5 h-5" />
          ?�생 ?�보
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-navy-600">?�름:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.name || '미입??}</span>
          </div>
          <div>
            <span className="text-navy-600">주소:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.address || '미입??}</span>
          </div>
          <div>
            <span className="text-navy-600">?�교?�형:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.schoolType || '미입??}</span>
          </div>
          <div>
            <span className="text-navy-600">계열:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.trackType || '미입??}</span>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-navy-600">지망학�?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {[grades?.personalInfo?.preferredMajor1, grades?.personalInfo?.preferredMajor2, grades?.personalInfo?.preferredMajor3]
              .filter(major => major && major.trim())
              .map((major, index) => (
                <Badge key={index} className="bg-gold-100 text-gold-800">
                  {major === '기�?(직접?�력)' ? grades?.personalInfo?.customMajor || '기�?' : major}
                </Badge>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ?�상???�??카드 ?�더�??�수
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
              <div className="text-xs">?�격가?�성</div>
            </div>
          </div>

          <div className="bg-white/20 rounded p-3 space-y-2">
            <div className="text-sm">
              <strong>반영비율:</strong> {university.reflectionRatio}
            </div>
            {university.admissionData && (
              <div className="space-y-1 text-xs">
                <div><strong>?�년 ?�이??</strong> {university.admissionData.lastYear.score}?�급 / {university.admissionData.lastYear.students}�?/div>
                <div className="opacity-75"><strong>3???�균:</strong> {university.admissionData.threeYearAvg.score}?�급 / {university.admissionData.threeYearAvg.students}�?/div>
                <div className="opacity-75">
                  <strong>?�도�?</strong> {university.admissionData.yearlyData.map(data => 
                    `${data.year}??${data.score}?�급`
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
              <span className="text-sm font-medium">?�세 분석</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            {isExpanded && (
              <CollapsibleContent className="bg-white/20 rounded p-3 mt-2 space-y-2 text-sm">
                <div>
                  <strong>?�략:</strong> {university.admissionStrategy}
                </div>
                <div>
                  <strong>경쟁분석:</strong> {university.competitionAnalysis}
                </div>
                <div>
                  <strong>경쟁�?</strong> {university.competitionRate}:1
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
            ???�적 ?�력?�로 ?�아가�?
          </Button>
          <h1 className="text-3xl mb-2 text-navy-900">?�적 분석 보고??/h1>
          <p className="text-navy-600">{studentName ? `${studentName}?�의 ` : ''}맞춤???�시 분석 결과?�니??</p>
        </div>

        {renderPersonalInfo()}

        {/* ?�적 분석 ?�약 ?�션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ?�신 ?�적 분석 */}
          <Card className="shadow-lg border-navy-200">
            <CardHeader className="bg-navy-50">
              <CardTitle className="text-navy-800 flex items-center gap-2">
                <School className="w-5 h-5" />
                ?�신 과목�??�적분석
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-navy-50 rounded">
                  <span className="text-navy-700">?�균 ?�신?�급</span>
                  <span className="text-2xl font-bold text-navy-900">{schoolGPA || 0}?�급</span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-navy-800">?�리??반영비율</h4>
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
                        <Bar dataKey="average" fill="#f59e0b" name="???�적" />
                        <Bar dataKey="nationalAverage" fill="#94a3b8" name="?�국?�균" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ?�능 ?�적 분석 */}
          <Card className="shadow-lg border-navy-200">
            <CardHeader className="bg-navy-50">
              <CardTitle className="text-navy-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                ?�능 과목�??�적분석
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-navy-50 rounded">
                  <span className="text-navy-700">?�균 ?�능?�급</span>
                  <span className="text-2xl font-bold text-navy-900">{suneungAverage || 0}?�급</span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-navy-800">?�리??반영비율</h4>
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
                        <Bar dataKey="grade" fill="#0f172a" name="?�급" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ?�??추천 ?�션 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="susi">?�시 추천 ?�??/TabsTrigger>
            <TabsTrigger value="jungsi">?�시 추천 ?�??/TabsTrigger>
          </TabsList>

          <TabsContent value="susi">
            <Card className="shadow-lg border-navy-200">
              <CardHeader className="bg-navy-50">
                <CardTitle className="text-navy-800">?�시 추천 ?�??(?�위 20�?</CardTitle>
                <p className="text-navy-600 text-sm mt-2">
                  ?�상?�로 ?�격 가?�성???�시?�니���? 
                  <span className="inline-block w-3 h-3 bg-green-600 rounded ml-2 mr-1"></span>80%+ 
                  <span className="inline-block w-3 h-3 bg-green-300 rounded ml-2 mr-1"></span>50-79% 
                  <span className="inline-block w-3 h-3 bg-yellow-400 rounded ml-2 mr-1"></span>20-49% 
                  <span className="inline-block w-3 h-3 bg-red-500 rounded ml-2 mr-1"></span>20%미만
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-navy-600">추천 결과�?계산 중입?�다...</div>
                  </div>
                ) : susiUniversities.length > 0 ? (
                  <div className="space-y-4">
                    {susiUniversities.map((university, index) => renderEnhancedUniversityCard(university, index))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-navy-600">추천???�시 ?�?�이 ?�습?�다.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jungsi">
            <Tabs value={activeJungsiTab} onValueChange={setActiveJungsiTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="ga">가�?/TabsTrigger>
                <TabsTrigger value="na">?�군</TabsTrigger>
                <TabsTrigger value="da">?�군</TabsTrigger>
              </TabsList>

              <TabsContent value="ga">
                <Card className="shadow-lg border-navy-200">
                  <CardHeader className="bg-navy-50">
                    <CardTitle className="text-navy-800">?�시 가�?추천 ?�??/CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천 결과�?계산 중입?�다...</div>
                      </div>
                    ) : jungsiUniversities.ga.length > 0 ? (
                      <div className="space-y-4">
                        {jungsiUniversities.ga.map((university, index) => renderEnhancedUniversityCard(university, index))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천??가�??�?�이 ?�습?�다.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="na">
                <Card className="shadow-lg border-navy-200">
                  <CardHeader className="bg-navy-50">
                    <CardTitle className="text-navy-800">?�시 ?�군 추천 ?�??/CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천 결과�?계산 중입?�다...</div>
                      </div>
                    ) : jungsiUniversities.na.length > 0 ? (
                      <div className="space-y-4">
                        {jungsiUniversities.na.map((university, index) => renderEnhancedUniversityCard(university, index))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천???�군 ?�?�이 ?�습?�다.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="da">
                <Card className="shadow-lg border-navy-200">
                  <CardHeader className="bg-navy-50">
                    <CardTitle className="text-navy-800">?�시 ?�군 추천 ?�??/CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천 결과�?계산 중입?�다...</div>
                      </div>
                    ) : jungsiUniversities.da.length > 0 ? (
                      <div className="space-y-4">
                        {jungsiUniversities.da.map((university, index) => renderEnhancedUniversityCard(university, index))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-navy-600">추천???�군 ?�?�이 ?�습?�다.</div>
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
