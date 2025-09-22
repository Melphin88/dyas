
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

// ë°˜ì˜ë¹„ìœ¨ ë¶„ì„ ?¨ìˆ˜
const calculateBestReflectionRatio = (grades: GradeData, type: 'school' | 'suneung') => {
  if (type === 'school') {
    const subjects = ['êµ?–´', '?ì–´', '?˜í•™', '?¬íšŒ', 'ê³¼í•™'];
    const subjectAverages = subjects.map(subject => {
      let total = 0;
      let count = 0;
      
      // 1?™ë…„
      const grade1S1 = grades.school.grade1.semester1[subject];
      const grade1S2 = grades.school.grade1.semester2[subject];
      if (grade1S1?.grade) { total += grade1S1.grade; count++; }
      if (grade1S2?.grade) { total += grade1S2.grade; count++; }
      
      // 2,3?™ë…„ (1,2,3?¼ë¡œ ë¶„ë¥˜??ê²ƒë“¤)
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
    
    // ?±ì ??ì¢‹ì? ?œìœ¼ë¡??•ë ¬
    subjectAverages.sort((a, b) => a.average - b.average);
    return `${subjectAverages[0].subject}(${subjectAverages[0].average}) > ${subjectAverages[1].subject}(${subjectAverages[1].average}) > ${subjectAverages[2].subject}(${subjectAverages[2].average})`;
  } else {
    const subjects = [
      { name: 'êµ?–´', grade: grades.suneung.korean.grade },
      { name: '?˜í•™', grade: grades.suneung.math.grade },
      { name: '?ì–´', grade: grades.suneung.english.grade },
      { name: '?¬íšŒ', grade: Math.min(grades.suneung.inquiry1.grade, grades.suneung.inquiry2.grade) },
      { name: 'ê³¼í•™', grade: Math.min(grades.suneung.inquiry1.grade, grades.suneung.inquiry2.grade) }
    ];
    
    const validSubjects = subjects.filter(s => s.grade > 0).sort((a, b) => a.grade - b.grade);
    return validSubjects.slice(0, 3).map(s => `${s.name}(${s.grade}?±ê¸‰)`).join(' > ');
  }
};

// ?©ê²© ê°€?¥ì„±???°ë¥¸ ?‰ìƒ ê²°ì •
const getAdmissionProbabilityColor = (matchPercentage: number) => {
  if (matchPercentage >= 80) return 'bg-green-600'; // ì§„í•œ?¹ìƒ‰ - ?©ê²©ë¥?80% ?´ìƒ
  if (matchPercentage >= 50) return 'bg-green-300'; // ?°í•œ?¹ìƒ‰ - ?©ê²©ë¥?50-79%
  if (matchPercentage >= 20) return 'bg-yellow-400'; // ?¸ë‘??- ?©ê²©ë¥?20-49%
  return 'bg-red-500'; // ë¶‰ì???- ?©ê²©ë¥?20% ë¯¸ë§Œ
};

export function AnalysisReport({ studentId, studentName, grades, simpleGradeData, simpleSuneungData, onBack }: AnalysisReportProps) {
  const [activeTab, setActiveTab] = useState('susi');
  const [activeJungsiTab, setActiveJungsiTab] = useState('ga');
  const [expandedAnalysis, setExpandedAnalysis] = useState<{[key: string]: boolean}>({});
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // ì¶”ì²œ ê²°ê³¼ ê°€?¸ì˜¤ê¸?
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // ?™ìƒ ?°ì´??êµ¬ì„±
      const studentData = {
        name: studentName || "?™ìƒ",
        schoolType: grades?.personalInfo?.schoolType === '?¹ëª©ê³? ? '?¹ëª©ê³? : 
                   grades?.personalInfo?.schoolType === '?ì‚¬ê³? ? '?ì‚¬ê³? :
                   grades?.personalInfo?.schoolType === 'êµ? œê³? ? 'êµ? œê³? : '?¼ë°˜ê³?,
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
        console.error('ì¶”ì²œ ê²°ê³¼ ê°€?¸ì˜¤ê¸??¤íŒ¨');
        setRecommendations([]);
      }
    } catch (error) {
      console.error('ì¶”ì²œ ê²°ê³¼ ê°€?¸ì˜¤ê¸??¤ë¥˜:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // ì»´í¬?ŒíŠ¸ ë§ˆìš´????ì¶”ì²œ ê²°ê³¼ ê°€?¸ì˜¤ê¸?
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
      // simpleSuneungData?ì„œ ? íš¨???±ê¸‰ë§?ì¶”ì¶œ
      const validScores = [
        simpleSuneungData.korean, 
        simpleSuneungData.math, 
        simpleSuneungData.english, 
        simpleSuneungData.inquiry1, 
        simpleSuneungData.inquiry2
      ].filter(score => score > 0 && score <= 9); // 1-9?±ê¸‰ ë²”ìœ„ ?•ì¸
      
      console.log('?˜ëŠ¥ ?±ì  ?°ì´??', simpleSuneungData);
      console.log('? íš¨???±ê¸‰??', validScores);
      
      if (validScores.length === 0) return 0;
      
      const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
      console.log('?‰ê·  ?˜ëŠ¥?±ê¸‰:', average);
      
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
    
    // 1?™ë…„ ê³¼ëª©??
    ['êµ?–´', '?ì–´', '?˜í•™', '?¬íšŒ', 'ê³¼í•™'].forEach(subject => {
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

    // 2,3?™ë…„ ê³¼ëª©??(1,2,3?¼ë¡œ ë¶„ë¥˜??ê²ƒë“¤)
    ['êµ?–´', '?ì–´', '?˜í•™', '?¬íšŒ', 'ê³¼í•™'].forEach(baseSubject => {
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
      nationalAverage: Math.random() * 2 + 2 // ëª¨ì˜ ?„êµ­ ?‰ê· 
    }));
  };

  const getSuneungSubjectData = () => {
    if (simpleSuneungData) {
      return [
        { subject: 'êµ?–´', grade: simpleSuneungData.korean, percentile: 0 },
        { subject: '?˜í•™', grade: simpleSuneungData.math, percentile: 0 },
        { subject: '?ì–´', grade: simpleSuneungData.english, percentile: 0 },
        { subject: '?êµ¬1', grade: simpleSuneungData.inquiry1, percentile: 0 },
        { subject: '?êµ¬2', grade: simpleSuneungData.inquiry2, percentile: 0 }
      ].filter(item => item.grade > 0);
    }
    
    if (!grades) return [];
    
    const subjects = [
      { subject: 'êµ?–´', grade: grades.suneung.korean.grade, percentile: grades.suneung.korean.percentile },
      { subject: '?˜í•™', grade: grades.suneung.math.grade, percentile: grades.suneung.math.percentile },
      { subject: '?ì–´', grade: grades.suneung.english.grade, percentile: grades.suneung.english.percentile },
      { subject: '?œêµ­??, grade: grades.suneung.koreanHistory.grade, percentile: grades.suneung.koreanHistory.percentile },
      { subject: '?êµ¬1', grade: grades.suneung.inquiry1.grade, percentile: grades.suneung.inquiry1.percentile },
      { subject: '?êµ¬2', grade: grades.suneung.inquiry2.grade, percentile: grades.suneung.inquiry2.percentile },
      { subject: '???¸êµ­??, grade: grades.suneung.secondLanguage.grade, percentile: grades.suneung.secondLanguage.percentile }
    ];

    return subjects.filter(item => item.grade > 0);
  };

  const schoolGPA = calculateSchoolGPA();
  const suneungAverage = calculateSuneungAverage();
  const schoolSubjectAverages = getSchoolSubjectAverages();
  const suneungSubjectData = getSuneungSubjectData();

  // ? ë¦¬??ë°˜ì˜ë¹„ìœ¨ ê³„ì‚°
  const schoolBestRatio = grades ? calculateBestReflectionRatio(grades, 'school') : 'ë¶„ì„ ?°ì´??ë¶€ì¡?;
  const suneungBestRatio = grades ? calculateBestReflectionRatio(grades, 'suneung') : 'ë¶„ì„ ?°ì´??ë¶€ì¡?;

  // ?¤ì œ ì¶”ì²œ ê²°ê³¼?ì„œ ?˜ì‹œ ?€???°ì´??ì¶”ì¶œ
  const susiUniversities: DetailedUniversity[] = recommendations 
    ? recommendations
        .filter((rec: any) => rec.admissionType === '?˜ì‹œ' || rec.admissionType?.includes('?˜ì‹œ'))
        .slice(0, 20)
        .map((rec: any) => ({
          name: rec.university,
          department: rec.department,
      admissionType: '?˜ì‹œ',
          competitionRate: rec.cutOffData?.competitionRate || 0,
          requiredGrade: rec.cutOffData?.grade50 || 0,
          matchPercentage: rec.probabilityScore,
          location: 'ì§€???•ë³´ ?†ìŒ',
          description: `${rec.university} ${rec.department} - ${rec.probability} ì¶”ì²œ`,
      requirements: {
            minInternalGrade: rec.cutOffData?.grade50,
            requiredSubjects: [],
            additionalFactors: rec.reasons || []
          },
          admissionStrategy: rec.reasons?.join(', ') || 'ì¶”ì²œ ?´ìœ  ?†ìŒ',
          competitionAnalysis: `ê²½ìŸë¥?${rec.cutOffData?.competitionRate || 0}:1`,
          recommendation: rec.probability === '?ˆì •' ? 'safe' : rec.probability === '?ì •' ? 'optimal' : 'challenge',
          reflectionRatio: 'ë°˜ì˜ë¹„ìœ¨ ?•ë³´ ?†ìŒ',
      admissionData: {
            lastYear: { score: rec.cutOffData?.grade50 || 0, students: 0 },
            threeYearAvg: { score: rec.cutOffData?.grade50 || 0, students: 0 },
            yearlyData: []
          }
        }))
    : [];

  // ?¤ì œ ì¶”ì²œ ê²°ê³¼?ì„œ ?•ì‹œ ?€???°ì´??ì¶”ì¶œ
  const jungsiRecommendations = recommendations 
    ? recommendations.filter((rec: any) => rec.admissionType === '?•ì‹œ' || rec.admissionType?.includes('?•ì‹œ'))
    : [];

  const jungsiUniversities = {
    ga: jungsiRecommendations
      .filter((rec: any) => rec.admissionType?.includes('ê°€êµ?) || rec.admissionType === '?•ì‹œ')
      .slice(0, 6)
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '?•ì‹œ ê°€êµ?,
        competitionRate: rec.cutOffData?.competitionRate || 0,
        requiredGrade: rec.cutOffData?.grade50 || 0,
        matchPercentage: rec.probabilityScore,
        location: 'ì§€???•ë³´ ?†ìŒ',
        description: `${rec.university} ${rec.department} - ${rec.probability} ì¶”ì²œ`,
        requirements: {
          minSuneungGrade: rec.cutOffData?.grade50,
          requiredSubjects: [],
          additionalFactors: rec.reasons || []
        },
        admissionStrategy: rec.reasons?.join(', ') || 'ì¶”ì²œ ?´ìœ  ?†ìŒ',
        competitionAnalysis: `ê²½ìŸë¥?${rec.cutOffData?.competitionRate || 0}:1`,
        recommendation: rec.probability === '?ˆì •' ? 'safe' : rec.probability === '?ì •' ? 'optimal' : 'challenge',
        reflectionRatio: 'ë°˜ì˜ë¹„ìœ¨ ?•ë³´ ?†ìŒ',
        admissionData: {
          lastYear: { score: rec.cutOffData?.grade50 || 0, students: 0 },
          threeYearAvg: { score: rec.cutOffData?.grade50 || 0, students: 0 },
          yearlyData: []
        }
      } as DetailedUniversity),
    na: jungsiRecommendations
      .filter((rec: any) => rec.admissionType?.includes('?˜êµ°'))
      .slice(0, 6)
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '?•ì‹œ ?˜êµ°',
        competitionRate: rec.cutOffData?.competitionRate || 0,
        requiredGrade: rec.cutOffData?.grade50 || 0,
        matchPercentage: rec.probabilityScore,
        location: 'ì§€???•ë³´ ?†ìŒ',
        description: `${rec.university} ${rec.department} - ${rec.probability} ì¶”ì²œ`,
        requirements: {
          minSuneungGrade: rec.cutOffData?.grade50,
          requiredSubjects: [],
          additionalFactors: rec.reasons || []
        },
        admissionStrategy: rec.reasons?.join(', ') || 'ì¶”ì²œ ?´ìœ  ?†ìŒ',
        competitionAnalysis: `ê²½ìŸë¥?${rec.cutOffData?.competitionRate || 0}:1`,
        recommendation: rec.probability === '?ˆì •' ? 'safe' : rec.probability === '?ì •' ? 'optimal' : 'challenge',
        reflectionRatio: 'ë°˜ì˜ë¹„ìœ¨ ?•ë³´ ?†ìŒ',
        admissionData: {
          lastYear: { score: rec.cutOffData?.grade50 || 0, students: 0 },
          threeYearAvg: { score: rec.cutOffData?.grade50 || 0, students: 0 },
          yearlyData: []
        }
      } as DetailedUniversity),
    da: jungsiRecommendations
      .filter((rec: any) => rec.admissionType?.includes('?¤êµ°'))
      .slice(0, 6)
      .map((rec: any) => ({
        name: rec.university,
        department: rec.department,
        admissionType: '?•ì‹œ ?¤êµ°',
        competitionRate: rec.cutOffData?.competitionRate || 0,
        requiredGrade: rec.cutOffData?.grade50 || 0,
        matchPercentage: rec.probabilityScore,
        location: 'ì§€???•ë³´ ?†ìŒ',
        description: `${rec.university} ${rec.department} - ${rec.probability} ì¶”ì²œ`,
        requirements: {
          minSuneungGrade: rec.cutOffData?.grade50,
          requiredSubjects: [],
          additionalFactors: rec.reasons || []
        },
        admissionStrategy: rec.reasons?.join(', ') || 'ì¶”ì²œ ?´ìœ  ?†ìŒ',
        competitionAnalysis: `ê²½ìŸë¥?${rec.cutOffData?.competitionRate || 0}:1`,
        recommendation: rec.probability === '?ˆì •' ? 'safe' : rec.probability === '?ì •' ? 'optimal' : 'challenge',
        reflectionRatio: 'ë°˜ì˜ë¹„ìœ¨ ?•ë³´ ?†ìŒ',
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

  // ê°œì¸?•ë³´ ?œì‹œ ?¹ì…˜
  const renderPersonalInfo = () => (
    <Card className="shadow-lg border-navy-200 mb-6">
      <CardHeader className="bg-navy-50">
        <CardTitle className="text-navy-800 flex items-center gap-2">
          <User className="w-5 h-5" />
          ?™ìƒ ?•ë³´
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-navy-600">?´ë¦„:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.name || 'ë¯¸ì…??}</span>
          </div>
          <div>
            <span className="text-navy-600">ì£¼ì†Œ:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.address || 'ë¯¸ì…??}</span>
          </div>
          <div>
            <span className="text-navy-600">?™êµ? í˜•:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.schoolType || 'ë¯¸ì…??}</span>
          </div>
          <div>
            <span className="text-navy-600">ê³„ì—´:</span>
            <span className="ml-2 text-navy-900">{grades?.personalInfo?.trackType || 'ë¯¸ì…??}</span>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-navy-600">ì§€ë§í•™ê³?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {[grades?.personalInfo?.preferredMajor1, grades?.personalInfo?.preferredMajor2, grades?.personalInfo?.preferredMajor3]
              .filter(major => major && major.trim())
              .map((major, index) => (
                <Badge key={index} className="bg-gold-100 text-gold-800">
                  {major === 'ê¸°í?(ì§ì ‘?…ë ¥)' ? grades?.personalInfo?.customMajor || 'ê¸°í?' : major}
                </Badge>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ?¥ìƒ???€??ì¹´ë“œ ?Œë”ë§??¨ìˆ˜
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
              <div className="text-xs">?©ê²©ê°€?¥ì„±</div>
            </div>
          </div>

          <div className="bg-white/20 rounded p-3 space-y-2">
            <div className="text-sm">
              <strong>ë°˜ì˜ë¹„ìœ¨:</strong> {university.reflectionRatio}
            </div>
            {university.admissionData && (
              <div className="space-y-1 text-xs">
                <div><strong>?‘ë…„ ?°ì´??</strong> {university.admissionData.lastYear.score}?±ê¸‰ / {university.admissionData.lastYear.students}ëª?/div>
                <div className="opacity-75"><strong>3???‰ê· :</strong> {university.admissionData.threeYearAvg.score}?±ê¸‰ / {university.admissionData.threeYearAvg.students}ëª?/div>
                <div className="opacity-75">
                  <strong>?°ë„ë³?</strong> {university.admissionData.yearlyData.map(data => 
                    `${data.year}??${data.score}?±ê¸‰`
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
              <span className="text-sm font-medium">?ì„¸ ë¶„ì„</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            {isExpanded && (
              <CollapsibleContent className="bg-white/20 rounded p-3 mt-2 space-y-2 text-sm">
                <div>
                  <strong>?„ëµ:</strong> {university.admissionStrategy}
                </div>
                <div>
                  <strong>ê²½ìŸë¶„ì„:</strong> {university.competitionAnalysis}
                </div>
                <div>
                  <strong>ê²½ìŸë¥?</strong> {university.competitionRate}:1
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
            ???±ì  ?…ë ¥?¼ë¡œ ?Œì•„ê°€ê¸?
          </Button>
          <h1 className="text-3xl mb-2 text-navy-900">?±ì  ë¶„ì„ ë³´ê³ ??/h1>
          <p className="text-navy-600">{studentName ? `${studentName}?˜ì˜ ` : ''}ë§ì¶¤???…ì‹œ ë¶„ì„ ê²°ê³¼?…ë‹ˆ??</p>
        </div>

        {renderPersonalInfo()}

        {/* ?±ì  ë¶„ì„ ?”ì•½ ?¹ì…˜ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ?´ì‹  ?±ì  ë¶„ì„ */}
          <Card className="shadow-lg border-navy-200">
            <CardHeader className="bg-navy-50">
              <CardTitle className="text-navy-800 flex items-center gap-2">
                <School className="w-5 h-5" />
                ?´ì‹  ê³¼ëª©ë³??±ì ë¶„ì„
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-navy-50 rounded">
                  <span className="text-navy-700">?‰ê·  ?´ì‹ ?±ê¸‰</span>
                  <span className="text-2xl font-bold text-navy-900">{schoolGPA || 0}?±ê¸‰</span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-navy-800">? ë¦¬??ë°˜ì˜ë¹„ìœ¨</h4>
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
                        <Bar dataKey="average" fill="#f59e0b" name="???±ì " />
                        <Bar dataKey="nationalAverage" fill="#94a3b8" name="?„êµ­?‰ê· " />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ?˜ëŠ¥ ?±ì  ë¶„ì„ */}
          <Card className="shadow-lg border-navy-200">
            <CardHeader className="bg-navy-50">
              <CardTitle className="text-navy-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                ?˜ëŠ¥ ê³¼ëª©ë³??±ì ë¶„ì„
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-navy-50 rounded">
                  <span className="text-navy-700">?‰ê·  ?˜ëŠ¥?±ê¸‰</span>
                  <span className="text-2xl font-bold text-navy-900">{suneungAverage || 0}?±ê¸‰</span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-navy-800">? ë¦¬??ë°˜ì˜ë¹„ìœ¨</h4>
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
                        <Bar dataKey="grade" fill="#0f172a" name="?±ê¸‰" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ?€??ì¶”ì²œ ?¹ì…˜ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="susi">?˜ì‹œ ì¶”ì²œ ?€??/TabsTrigger>
            <TabsTrigger value="jungsi">?•ì‹œ ì¶”ì²œ ?€??/TabsTrigger>
          </TabsList>

          <TabsContent value="susi">
            <Card className="shadow-lg border-navy-200">
              <CardHeader className="bg-navy-50">
                <CardTitle className="text-navy-800">?˜ì‹œ ì¶”ì²œ ?€??(?ìœ„ 20ê°?</CardTitle>
                <p className="text-navy-600 text-sm mt-2">
                  ?‰ìƒ?¼ë¡œ ?©ê²© ê°€?¥ì„±???œì‹œ?©ë‹ˆï¿½ï¿½ï¿? 
                  <span className="inline-block w-3 h-3 bg-green-600 rounded ml-2 mr-1"></span>80%+ 
                  <span className="inline-block w-3 h-3 bg-green-300 rounded ml-2 mr-1"></span>50-79% 
                  <span className="inline-block w-3 h-3 bg-yellow-400 rounded ml-2 mr-1"></span>20-49% 
                  <span className="inline-block w-3 h-3 bg-red-500 rounded ml-2 mr-1"></span>20%ë¯¸ë§Œ
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-navy-600">ì¶”ì²œ ê²°ê³¼ë¥?ê³„ì‚° ì¤‘ì…?ˆë‹¤...</div>
                  </div>
                ) : susiUniversities.length > 0 ? (
                  <div className="space-y-4">
                    {susiUniversities.map((university, index) => renderEnhancedUniversityCard(university, index))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-navy-600">ì¶”ì²œ???˜ì‹œ ?€?™ì´ ?†ìŠµ?ˆë‹¤.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jungsi">
            <Tabs value={activeJungsiTab} onValueChange={setActiveJungsiTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="ga">ê°€êµ?/TabsTrigger>
                <TabsTrigger value="na">?˜êµ°</TabsTrigger>
                <TabsTrigger value="da">?¤êµ°</TabsTrigger>
              </TabsList>

              <TabsContent value="ga">
                <Card className="shadow-lg border-navy-200">
                  <CardHeader className="bg-navy-50">
                    <CardTitle className="text-navy-800">?•ì‹œ ê°€êµ?ì¶”ì²œ ?€??/CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-navy-600">ì¶”ì²œ ê²°ê³¼ë¥?ê³„ì‚° ì¤‘ì…?ˆë‹¤...</div>
                      </div>
                    ) : jungsiUniversities.ga.length > 0 ? (
                      <div className="space-y-4">
                        {jungsiUniversities.ga.map((university, index) => renderEnhancedUniversityCard(university, index))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-navy-600">ì¶”ì²œ??ê°€êµ??€?™ì´ ?†ìŠµ?ˆë‹¤.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="na">
                <Card className="shadow-lg border-navy-200">
                  <CardHeader className="bg-navy-50">
                    <CardTitle className="text-navy-800">?•ì‹œ ?˜êµ° ì¶”ì²œ ?€??/CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-navy-600">ì¶”ì²œ ê²°ê³¼ë¥?ê³„ì‚° ì¤‘ì…?ˆë‹¤...</div>
                      </div>
                    ) : jungsiUniversities.na.length > 0 ? (
                      <div className="space-y-4">
                        {jungsiUniversities.na.map((university, index) => renderEnhancedUniversityCard(university, index))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-navy-600">ì¶”ì²œ???˜êµ° ?€?™ì´ ?†ìŠµ?ˆë‹¤.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="da">
                <Card className="shadow-lg border-navy-200">
                  <CardHeader className="bg-navy-50">
                    <CardTitle className="text-navy-800">?•ì‹œ ?¤êµ° ì¶”ì²œ ?€??/CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-navy-600">ì¶”ì²œ ê²°ê³¼ë¥?ê³„ì‚° ì¤‘ì…?ˆë‹¤...</div>
                      </div>
                    ) : jungsiUniversities.da.length > 0 ? (
                      <div className="space-y-4">
                        {jungsiUniversities.da.map((university, index) => renderEnhancedUniversityCard(university, index))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-navy-600">ì¶”ì²œ???¤êµ° ?€?™ì´ ?†ìŠµ?ˆë‹¤.</div>
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
