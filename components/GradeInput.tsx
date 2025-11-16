import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { SimpleSuneungData } from '../types/university';

interface Subject {
  grade: number;
  credits: number;
  rawScore?: number; // 원점수 추가
}

interface Semester {
  [subject: string]: Subject;
}

interface Grade {
  semester1: Semester;
  semester2: Semester;
}

interface SchoolGrades {
  grade1: Grade;
  grade2: Grade;
  grade3: Grade;
}

interface SuneungSubject {
  standardScore: number;
  percentile: number;
  grade: number;
  rawScore?: number; // 원점수 추가
  selectedOption?: string;
}

interface SuneungGrades {
  korean: SuneungSubject;
  math: SuneungSubject;
  english: SuneungSubject;
  koreanHistory: SuneungSubject;
  inquiry1: SuneungSubject;
  inquiry2: SuneungSubject;
  secondLanguage: SuneungSubject;
}

// 학생 개인정보 인터페이스 추가
interface StudentPersonalInfo {
  name: string;
  address: string;
  schoolType: string;
  trackType: string; // 문과/이과/미술/체육/기타
  preferredMajor1: string;
  preferredMajor2: string;
  preferredMajor3: string;
  customMajor?: string; // 기타 직접입력용 필드 추가
}

export interface GradeData {
  personalInfo: StudentPersonalInfo; // 개인정보 추가
  school: SchoolGrades;
  suneung: SuneungGrades;
}

// 간단한 성적 데이터 인터페이스
interface SimpleGradeData {
  korean: { [semester: string]: number };
  math: { [semester: string]: number };
  english: { [semester: string]: number };
  inquiry: { [semester: string]: number };
  specialtySubjects: { [semester: string]: number };
  personalInfo?: {
    name: string;
    address: string;
    schoolType: string;
    trackType: string;
    preferredMajor1: string;
    preferredMajor2: string;
    preferredMajor3: string;
    customMajor?: string;
  };
}

interface GradeInputProps {
  studentId: string;
  studentName: string;
  initialGrades?: GradeData;
  onSubmit: (grades: GradeData) => void;
  onSaveSimpleGrade?: (data: SimpleGradeData) => void;
  onSaveSimpleSuneung?: (data: SimpleSuneungData) => void;
  initialSimpleGrades?: SimpleGradeData | null;
  initialSimpleSuneung?: SimpleSuneungData | null;
  onBack: () => void;
  onComplete?: () => void; // 입력 완료 시 호출될 함수 추가
  loadExamGrades?: (studentId: string, examYear: number, examMonth: string) => Promise<any>;
  saveExamGrades?: (studentId: string, examYear: number, examMonth: string, grades: any) => Promise<boolean>;
}

const GRADE1_SUBJECTS = ['국어', '영어', '수학', '한국사', '사회', '과학'];
const GRADE23_SUBJECTS = [
  '국어1', '국어2', '국어3', 
  '영어1', '영어2', '영어3', 
  '수학1', '수학2', '수학3', 
  '사회1', '사회2', '사회3', 
  '과학1', '과학2', '과학3'
];

// 전문교과 과목 배열 추가
const VOCATIONAL_SUBJECTS = [
  '전공기초', '전공실무', '전공어학', '전공실험', '전공실습', '고급수학', '고급물리', '고급화학', '고급생물', '고급지구과학'
];

// 학교 유형 옵션
const SCHOOL_TYPE_OPTIONS = [
  '일반고', '외고', '과학고', '자사고', '국제고', '영재학교', '특성화고', '마이스터고'
];

// 계열 옵션
const TRACK_TYPE_OPTIONS = ['문과', '이과', '미술', '체육', '기타'];

// 지망 계열/학과 옵션
const MAJOR_OPTIONS = [
  // 인문계열
  '국어국문학과', '영어영문학과', '불어불문학과', '독어독문학과', '중어중문학과', '일어일문학과', '사학과', '철학과', '고고학과',
  // 사회계열  
  '정치외교학과', '행정학과', '사회학과', '심리학과', '인류학과', '지리학과', '사회복지학과', '언론정보학과', '광고홍보학과',
  // 경상계열
  '경영학과', '경제학과', '회계학과', '무역학과', '관광학과', '호텔경영학과', '금융학과', '부동산학과', 'e-비즈니스학과',
  // 법학계열
  '법학과',
  // 교육계열
  '교육학과', '유아교육과', '초등교육과', '체육교육과', '음악교육과', '미술교육과',
  // 공학계열
  '기계공학과', '전기전자공학과', '컴퓨터공학과', '화학공학과', '건축학과', '토목공학과', '산업공학과', '항공우주공학과', '신소재공학과', '환경공학과',
  // 자연과학계열
  '수학과', '물리학과', '화학과', '생물학과', '지구과학과', '천문학과', '통계학과',
  // 의학계열
  '의예과', '치의예과', '한의예과', '수의예과', '약학과', '간호학과', '의료기술학과',
  // 예체능계열
  '음악과', '미술과', '디자인학과', '체육학과', '무용과', '연극영화과', '의상학과',
  // 기타
  '농학과', '임학과', '수산학과', '가정학과', '식품영양학과', '기타(직접입력)'
];

// 수능 선택과목 옵션
const KOREAN_OPTIONS = ['화법과 작문', '언어와 매체'];
const MATH_OPTIONS = ['확률과 통계', '미적분', '기하'];
const INQUIRY_OPTIONS = {
  social: ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화'],
  science: ['물리학Ⅰ', '물리학Ⅱ', '화학Ⅰ', '화학Ⅱ', '생명과학Ⅰ', '생명과학Ⅱ', '지구과학Ⅰ', '지구과학Ⅱ']
};
const SECOND_LANGUAGE_OPTIONS = [
  '독일어Ⅰ', '프랑스어Ⅰ', '스페인어Ⅰ', '중국어Ⅰ', '일본어Ⅰ', '러시아어Ⅰ', '아랍어Ⅰ', '베트남어Ⅰ', '한문Ⅰ'
];

const createEmptyPersonalInfo = (): StudentPersonalInfo => ({
  name: '',
  address: '',
  schoolType: '',
  trackType: '',
  preferredMajor1: '',
  preferredMajor2: '',
  preferredMajor3: '',
  customMajor: ''
});

const createEmptySchoolGrade = (): Grade => ({
  semester1: {},
  semester2: {}
});

const createEmptySchoolGrades = (): SchoolGrades => ({
  grade1: createEmptySchoolGrade(),
  grade2: createEmptySchoolGrade(),
  grade3: createEmptySchoolGrade()
});

const createEmptySuneungSubject = (): SuneungSubject => ({
  standardScore: 0,
  percentile: 0,
  grade: 0,
  rawScore: 0,
  selectedOption: ''
});

const createEmptySuneungGrades = (): SuneungGrades => ({
  korean: createEmptySuneungSubject(),
  math: createEmptySuneungSubject(),
  english: createEmptySuneungSubject(),
  koreanHistory: createEmptySuneungSubject(),
  inquiry1: createEmptySuneungSubject(),
  inquiry2: createEmptySuneungSubject(),
  secondLanguage: createEmptySuneungSubject()
});

const createEmptyGradeData = (): GradeData => ({
  personalInfo: createEmptyPersonalInfo(),
  school: createEmptySchoolGrades(),
  suneung: createEmptySuneungGrades()
});

export function GradeInput({ studentId, studentName, initialGrades, onSubmit, onSaveSimpleGrade, onSaveSimpleSuneung, initialSimpleGrades, initialSimpleSuneung, onBack, onComplete, loadExamGrades, saveExamGrades }: GradeInputProps) {
  console.log('GradeInput 렌더링:', { studentId, studentName, initialGrades, initialSimpleGrades, initialSimpleSuneung });
  
  const [grades, setGrades] = useState<GradeData>(initialGrades || createEmptyGradeData());
  const [activeMainTab, setActiveMainTab] = useState('simple'); // 간단 입력을 기본으로
  const [activeGradeTab, setActiveGradeTab] = useState('grade1');
  
  // 간단한 성적 입력 상태
  const [simpleGrades, setSimpleGrades] = useState<SimpleGradeData>(initialSimpleGrades || {
    korean: {},
    math: {},
    english: {},
    inquiry: {},
    specialtySubjects: {},
    personalInfo: {
      name: '',
      address: '',
      schoolType: '',
      trackType: '',
      preferredMajor1: '',
      preferredMajor2: '',
      preferredMajor3: '',
      customMajor: ''
    }
  });

  // 간단한 수능 성적 입력 상태 - 안전한 초기화
  const getInitialSuneungData = (): SimpleSuneungData => {
    if (!initialSimpleSuneung) {
      return {
        korean: { grade: 0, standardScore: 0, rawScore: 0 },
        math: { grade: 0, standardScore: 0, rawScore: 0 },
        english: { grade: 0, rawScore: 0 },
        koreanHistory: { grade: 0, rawScore: 0 },
        inquiry1: { grade: 0, standardScore: 0, rawScore: 0 },
        inquiry2: { grade: 0, standardScore: 0, rawScore: 0 }
      };
    }

    // 새로운 구조인지 확인
    const isNewStructure = initialSimpleSuneung.korean && typeof initialSimpleSuneung.korean === 'object' && 'grade' in initialSimpleSuneung.korean;
    
    if (isNewStructure) {
      // 이미 새로운 구조
      return initialSimpleSuneung;
    } else {
      // 이전 구조를 새로운 구조로 변환
      return {
        korean: { 
          grade: initialSimpleSuneung.korean || 0, 
          standardScore: 0, 
          rawScore: 0 
        },
        math: { 
          grade: initialSimpleSuneung.math || 0, 
          standardScore: 0, 
          rawScore: 0 
        },
        english: { 
          grade: initialSimpleSuneung.english || 0, 
          rawScore: 0 
        },
        koreanHistory: { 
          grade: 0, 
          rawScore: 0 
        },
        inquiry1: { 
          grade: initialSimpleSuneung.inquiry1 || 0, 
          standardScore: 0, 
          rawScore: 0 
        },
        inquiry2: { 
          grade: initialSimpleSuneung.inquiry2 || 0, 
          standardScore: 0, 
          rawScore: 0 
        }
      };
    }
  };

  const [simpleSuneung, setSimpleSuneung] = useState<SimpleSuneungData>(getInitialSuneungData());
  
  // 각 학년별 학기 탭 상태 관리
  const [activeSemesterTabs, setActiveSemesterTabs] = useState({
    grade1: 'semester1',
    grade2: 'semester1',
    grade3: 'semester1'
  });

  // 자동저장 상태 관리
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 초기 로드 여부 추적 (초기 로드 시에는 저장하지 않음)
  const isInitialMount = useRef(true);
  const prevSimpleGradesRef = useRef<SimpleGradeData | null>(null);
  const prevSimpleSuneungRef = useRef<SimpleSuneungData | null>(null);
  const prevGradesRef = useRef<GradeData | null>(null);

  // 초기 데이터 로드 (저장하지 않음)
  useEffect(() => {
    if (initialGrades) {
      // 기존 데이터 호환성을 위한 처리
      const updatedGrades = { ...initialGrades };
      
      // 개인정보가 없으면 빈 개인정보 추가
      if (!updatedGrades.personalInfo) {
        updatedGrades.personalInfo = createEmptyPersonalInfo();
      }
      
      // inquiry 호환성 처리
      if ('inquiry' in updatedGrades.suneung && !('inquiry1' in updatedGrades.suneung)) {
        updatedGrades.suneung.inquiry1 = (updatedGrades.suneung as any).inquiry;
        updatedGrades.suneung.inquiry2 = createEmptySuneungSubject();
        delete (updatedGrades.suneung as any).inquiry;
      }
      
      setGrades(updatedGrades);
      prevGradesRef.current = updatedGrades;
      
      // simpleGradeData에도 개인정보 복사
      if (updatedGrades.personalInfo) {
        const updatedSimpleGrades = {
          ...simpleGrades,
          personalInfo: {
            name: updatedGrades.personalInfo.name,
            address: updatedGrades.personalInfo.address,
            schoolType: updatedGrades.personalInfo.schoolType,
            trackType: updatedGrades.personalInfo.trackType,
            preferredMajor1: updatedGrades.personalInfo.preferredMajor1,
            preferredMajor2: updatedGrades.personalInfo.preferredMajor2,
            preferredMajor3: updatedGrades.personalInfo.preferredMajor3,
            customMajor: updatedGrades.personalInfo.customMajor || ''
          }
        };
        setSimpleGrades(updatedSimpleGrades);
        prevSimpleGradesRef.current = updatedSimpleGrades;
      }
    }

    if (initialSimpleGrades) {
      // initialSimpleGrades의 personalInfo가 있으면 그것을 사용
      const mergedSimpleGrades = {
        ...initialSimpleGrades,
        personalInfo: initialSimpleGrades.personalInfo || simpleGrades.personalInfo || {
          name: '',
          address: '',
          schoolType: '',
          trackType: '',
          preferredMajor1: '',
          preferredMajor2: '',
          preferredMajor3: '',
          customMajor: ''
        }
      };
      setSimpleGrades(mergedSimpleGrades);
      prevSimpleGradesRef.current = mergedSimpleGrades;
    }
    
    if (initialSimpleSuneung) {
      const suneungData = getInitialSuneungData();
      setSimpleSuneung(suneungData);
      prevSimpleSuneungRef.current = suneungData;
    }
    
    // 초기 로드 완료 표시
    setTimeout(() => {
      isInitialMount.current = false;
    }, 1000);
  }, [initialGrades, initialSimpleGrades, initialSimpleSuneung]);

  // 실시간 저장 - 간편 성적 (디바운스 적용, 실제 변경 시에만 저장)
  useEffect(() => {
    // 초기 로드 중이거나 이전 값과 동일하면 저장하지 않음
    if (isInitialMount.current) {
      return;
    }
    
    // 이전 값과 비교하여 실제로 변경되었는지 확인
    const prevData = prevSimpleGradesRef.current;
    if (prevData && JSON.stringify(prevData) === JSON.stringify(simpleGrades)) {
      return;
    }
    
    // 빈 데이터는 저장하지 않음
    const hasData = simpleGrades.personalInfo?.name || 
                    Object.keys(simpleGrades.korean || {}).length > 0 ||
                    Object.keys(simpleGrades.math || {}).length > 0 ||
                    Object.keys(simpleGrades.english || {}).length > 0 ||
                    Object.keys(simpleGrades.inquiry || {}).length > 0 ||
                    Object.keys(simpleGrades.specialtySubjects || {}).length > 0;
    
    if (!hasData) {
      return;
    }
    
    setIsSaving(true);
    const timeoutId = setTimeout(() => {
      if (onSaveSimpleGrade && simpleGrades) {
        onSaveSimpleGrade(simpleGrades);
        prevSimpleGradesRef.current = simpleGrades;
        setLastSaved(new Date());
      }
      setIsSaving(false);
    }, 1000); // 1초 디바운스

    return () => clearTimeout(timeoutId);
  }, [simpleGrades, onSaveSimpleGrade]);

  // 실시간 저장 - 수능 성적 (디바운스 적용, 실제 변경 시에만 저장)
  useEffect(() => {
    // 초기 로드 중이거나 이전 값과 동일하면 저장하지 않음
    if (isInitialMount.current) {
      return;
    }
    
    // 이전 값과 비교하여 실제로 변경되었는지 확인
    const prevData = prevSimpleSuneungRef.current;
    if (prevData && JSON.stringify(prevData) === JSON.stringify(simpleSuneung)) {
      return;
    }
    
    // 빈 데이터는 저장하지 않음 (모든 값이 0이면 저장하지 않음)
    const hasData = (simpleSuneung.korean?.grade || 0) > 0 ||
                    (simpleSuneung.math?.grade || 0) > 0 ||
                    (simpleSuneung.english?.grade || 0) > 0 ||
                    (simpleSuneung.inquiry1?.grade || 0) > 0 ||
                    (simpleSuneung.inquiry2?.grade || 0) > 0;
    
    if (!hasData) {
      return;
    }
    
    setIsSaving(true);
    const timeoutId = setTimeout(() => {
      if (onSaveSimpleSuneung && simpleSuneung) {
        onSaveSimpleSuneung(simpleSuneung);
        prevSimpleSuneungRef.current = simpleSuneung;
        setLastSaved(new Date());
      }
      setIsSaving(false);
    }, 1000); // 1초 디바운스

    return () => clearTimeout(timeoutId);
  }, [simpleSuneung, onSaveSimpleSuneung]);

  // 실시간 저장 - 개인정보 및 상세 성적 (디바운스 적용, 실제 변경 시에만 저장)
  useEffect(() => {
    // 초기 로드 중이거나 이전 값과 동일하면 저장하지 않음
    if (isInitialMount.current) {
      return;
    }
    
    // 이전 값과 비교하여 실제로 변경되었는지 확인
    const prevData = prevGradesRef.current;
    if (prevData && JSON.stringify(prevData) === JSON.stringify(grades)) {
      return;
    }
    
    // 빈 데이터는 저장하지 않음
    const hasData = grades.personalInfo?.name || 
                    Object.keys(grades.school?.grade1?.semester1 || {}).length > 0 ||
                    Object.keys(grades.school?.grade2?.semester1 || {}).length > 0 ||
                    Object.keys(grades.school?.grade3?.semester1 || {}).length > 0;
    
    if (!hasData) {
      return;
    }
    
    setIsSaving(true);
    const timeoutId = setTimeout(() => {
      // 상세 성적도 실시간으로 Supabase에 저장
      if (onSubmit && grades) {
        onSubmit(grades);
        prevGradesRef.current = grades;
      setLastSaved(new Date());
      }
      setIsSaving(false);
    }, 1500); // 1.5초 디바운스 (상세 성적은 데이터가 크므로 조금 더 긴 디바운스)

    return () => clearTimeout(timeoutId);
  }, [grades, onSubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 실시간 저장이므로 버튼 클릭 시 바로 다음 단계로
    if (activeMainTab === 'simple' && onSaveSimpleGrade) {
      onSaveSimpleGrade(simpleGrades);
    } else if (activeMainTab === 'suneung' && onSaveSimpleSuneung) {
      onSaveSimpleSuneung(simpleSuneung);
    } else {
      onSubmit(grades);
    }
  };

  // 입력 완료 버튼 클릭 핸들러
  const handleComplete = () => {
    // 최종 저장 (App.tsx의 handleSaveSimpleGrade/handleSaveSimpleSuneung이 Supabase에 저장)
    if (onSaveSimpleGrade && simpleGrades) {
      onSaveSimpleGrade(simpleGrades);
    }
    if (onSaveSimpleSuneung && simpleSuneung) {
      onSaveSimpleSuneung(simpleSuneung);
    }
    
    // 상세 성적도 저장 (onSubmit을 통해 App.tsx에서 Supabase에 저장됨)
    if (onSubmit) {
      onSubmit(grades);
    }
    
    // 분석리포트 페이지로 이동
    if (onComplete) {
      onComplete();
    }
  };

  // 간단한 성적 입력 업데이트
  const updateSimpleGrade = (subject: keyof SimpleGradeData, semester: string, grade: number) => {
    setSimpleGrades(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [semester]: grade
      }
    }));
  };

  // 간단한 수능 성적 입력 업데이트
  const updateSimpleSuneung = (subject: keyof SimpleSuneungData, field: string, value: number) => {
    setSimpleSuneung(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: value
      }
    }));
  };

  // 다회차 수능/모의고사 성적 입력 상태
  const [examYear, setExamYear] = useState<number | null>(null);
  const [examMonth, setExamMonth] = useState<string>('');
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [examGrades, setExamGrades] = useState<{
    korean_raw_score?: number | null;
    korean_std_score?: number | null;
    korean_percentile?: number | null;
    korean_grade?: number | null;
    math_raw_score?: number | null;
    math_std_score?: number | null;
    math_percentile?: number | null;
    math_grade?: number | null;
    english_raw_score?: number | null;
    english_grade?: number | null;
    inquiry1_raw_score?: number | null;
    inquiry1_std_score?: number | null;
    inquiry1_percentile?: number | null;
    inquiry1_grade?: number | null;
    inquiry2_raw_score?: number | null;
    inquiry2_std_score?: number | null;
    inquiry2_percentile?: number | null;
    inquiry2_grade?: number | null;
    k_history_raw_score?: number | null;
    k_history_grade?: number | null;
  }>({});
  const [isFieldsEnabled, setIsFieldsEnabled] = useState(false);
  const [isSavingExamGrades, setIsSavingExamGrades] = useState(false);

  // 연도와 월이 모두 선택되었을 때 데이터 로드
  useEffect(() => {
    if (examYear && examMonth && loadExamGrades) {
      setIsLoadingGrades(true);
      setIsFieldsEnabled(false);
      
      loadExamGrades(studentId, examYear, examMonth)
        .then((data) => {
          if (data) {
            setExamGrades(data);
          } else {
            // 데이터가 없으면 빈 상태로 초기화
            setExamGrades({});
          }
          setIsFieldsEnabled(true);
        })
        .catch((error) => {
          console.error('성적 데이터 로드 오류:', error);
          setExamGrades({});
          setIsFieldsEnabled(true);
        })
        .finally(() => {
          setIsLoadingGrades(false);
        });
    } else {
      setIsFieldsEnabled(false);
      setExamGrades({});
    }
  }, [examYear, examMonth, studentId, loadExamGrades]);

  // 성적 필드 업데이트 및 자동 저장
  const updateExamGrade = async (field: string, value: number | null) => {
    if (!isFieldsEnabled) return;

    const newGrades = { ...examGrades, [field]: value };
    setExamGrades(newGrades);

    // 자동 저장
    if (examYear && examMonth && saveExamGrades) {
      setIsSavingExamGrades(true);
      try {
        await saveExamGrades(studentId, examYear, examMonth, newGrades);
      } catch (error) {
        console.error('성적 저장 오류:', error);
      } finally {
        setIsSavingExamGrades(false);
      }
    }
  };

  // 연도 옵션 생성 (현재 연도 기준으로 최근 3년)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // 월 옵션
  const monthOptions = ['3월', '4월', '6월', '7월', '9월', '10월', '수능'];

  // 다회차 수능/모의고사 성적 입력 섹션 렌더링
  const renderMultiExamSuneungSection = () => (
    <Card className="shadow-lg border-navy-200">
      <CardHeader className="bg-navy-50">
        <CardTitle className="text-navy-800">수능/모의고사 성적 입력</CardTitle>
        <p className="text-navy-600">회차를 선택한 후 성적을 입력해주세요.</p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* 회차 선택 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-navy-50 rounded-lg">
          <div className="space-y-2">
            <Label className="text-navy-700 font-medium">응시 연도</Label>
            <Select
              value={examYear?.toString() || ''}
              onValueChange={(value) => setExamYear(parseInt(value))}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="연도 선택" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-navy-700 font-medium">월</Label>
            <Select
              value={examMonth}
              onValueChange={(value) => setExamMonth(value)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="월 선택" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 로딩 상태 */}
        {isLoadingGrades && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-300 border-t-navy-600"></div>
            <span className="ml-3 text-navy-600">성적 데이터를 불러오는 중...</span>
          </div>
        )}

        {/* 성적 입력 필드 */}
        {!isLoadingGrades && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 국어 */}
              <Card className="border-navy-200">
                <CardHeader className="bg-navy-50 pb-3">
                  <CardTitle className="text-lg text-navy-800">국어</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-navy-600">원점수</Label>
                      <Input
                        type="number"
                        placeholder="원점수"
                        value={examGrades.korean_raw_score || ''}
                        onChange={(e) => updateExamGrade('korean_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('korean_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">표준점수</Label>
                      <Input
                        type="number"
                        placeholder="표준점수"
                        value={examGrades.korean_std_score || ''}
                        onChange={(e) => updateExamGrade('korean_std_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('korean_std_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">백분위</Label>
                      <Input
                        type="number"
                        placeholder="백분위"
                        value={examGrades.korean_percentile || ''}
                        onChange={(e) => updateExamGrade('korean_percentile', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('korean_percentile', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">등급</Label>
                      <Select
                        value={examGrades.korean_grade?.toString() || ''}
                        onValueChange={(value) => updateExamGrade('korean_grade', parseInt(value))}
                        disabled={!isFieldsEnabled}
                      >
                        <SelectTrigger className={!isFieldsEnabled ? 'bg-gray-100' : ''}>
                          <SelectValue placeholder="등급" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                            <SelectItem key={grade} value={grade.toString()}>
                              {grade}등급
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 수학 */}
              <Card className="border-navy-200">
                <CardHeader className="bg-navy-50 pb-3">
                  <CardTitle className="text-lg text-navy-800">수학</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-navy-600">원점수</Label>
                      <Input
                        type="number"
                        placeholder="원점수"
                        value={examGrades.math_raw_score || ''}
                        onChange={(e) => updateExamGrade('math_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('math_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">표준점수</Label>
                      <Input
                        type="number"
                        placeholder="표준점수"
                        value={examGrades.math_std_score || ''}
                        onChange={(e) => updateExamGrade('math_std_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('math_std_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">백분위</Label>
                      <Input
                        type="number"
                        placeholder="백분위"
                        value={examGrades.math_percentile || ''}
                        onChange={(e) => updateExamGrade('math_percentile', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('math_percentile', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">등급</Label>
                      <Select
                        value={examGrades.math_grade?.toString() || ''}
                        onValueChange={(value) => updateExamGrade('math_grade', parseInt(value))}
                        disabled={!isFieldsEnabled}
                      >
                        <SelectTrigger className={!isFieldsEnabled ? 'bg-gray-100' : ''}>
                          <SelectValue placeholder="등급" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                            <SelectItem key={grade} value={grade.toString()}>
                              {grade}등급
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 영어 */}
              <Card className="border-navy-200">
                <CardHeader className="bg-navy-50 pb-3">
                  <CardTitle className="text-lg text-navy-800">영어</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-navy-600">원점수</Label>
                      <Input
                        type="number"
                        placeholder="원점수"
                        value={examGrades.english_raw_score || ''}
                        onChange={(e) => updateExamGrade('english_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('english_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">등급</Label>
                      <Select
                        value={examGrades.english_grade?.toString() || ''}
                        onValueChange={(value) => updateExamGrade('english_grade', parseInt(value))}
                        disabled={!isFieldsEnabled}
                      >
                        <SelectTrigger className={!isFieldsEnabled ? 'bg-gray-100' : ''}>
                          <SelectValue placeholder="등급" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                            <SelectItem key={grade} value={grade.toString()}>
                              {grade}등급
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 한국사 */}
              <Card className="border-navy-200">
                <CardHeader className="bg-navy-50 pb-3">
                  <CardTitle className="text-lg text-navy-800">한국사</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-navy-600">원점수</Label>
                      <Input
                        type="number"
                        placeholder="원점수"
                        value={examGrades.k_history_raw_score || ''}
                        onChange={(e) => updateExamGrade('k_history_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('k_history_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">등급</Label>
                      <Select
                        value={examGrades.k_history_grade?.toString() || ''}
                        onValueChange={(value) => updateExamGrade('k_history_grade', parseInt(value))}
                        disabled={!isFieldsEnabled}
                      >
                        <SelectTrigger className={!isFieldsEnabled ? 'bg-gray-100' : ''}>
                          <SelectValue placeholder="등급" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                            <SelectItem key={grade} value={grade.toString()}>
                              {grade}등급
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 탐구1 */}
              <Card className="border-navy-200">
                <CardHeader className="bg-navy-50 pb-3">
                  <CardTitle className="text-lg text-navy-800">탐구1</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-navy-600">원점수</Label>
                      <Input
                        type="number"
                        placeholder="원점수"
                        value={examGrades.inquiry1_raw_score || ''}
                        onChange={(e) => updateExamGrade('inquiry1_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('inquiry1_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">표준점수</Label>
                      <Input
                        type="number"
                        placeholder="표준점수"
                        value={examGrades.inquiry1_std_score || ''}
                        onChange={(e) => updateExamGrade('inquiry1_std_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('inquiry1_std_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">백분위</Label>
                      <Input
                        type="number"
                        placeholder="백분위"
                        value={examGrades.inquiry1_percentile || ''}
                        onChange={(e) => updateExamGrade('inquiry1_percentile', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('inquiry1_percentile', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">등급</Label>
                      <Select
                        value={examGrades.inquiry1_grade?.toString() || ''}
                        onValueChange={(value) => updateExamGrade('inquiry1_grade', parseInt(value))}
                        disabled={!isFieldsEnabled}
                      >
                        <SelectTrigger className={!isFieldsEnabled ? 'bg-gray-100' : ''}>
                          <SelectValue placeholder="등급" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                            <SelectItem key={grade} value={grade.toString()}>
                              {grade}등급
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 탐구2 */}
              <Card className="border-navy-200">
                <CardHeader className="bg-navy-50 pb-3">
                  <CardTitle className="text-lg text-navy-800">탐구2</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-navy-600">원점수</Label>
                      <Input
                        type="number"
                        placeholder="원점수"
                        value={examGrades.inquiry2_raw_score || ''}
                        onChange={(e) => updateExamGrade('inquiry2_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('inquiry2_raw_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">표준점수</Label>
                      <Input
                        type="number"
                        placeholder="표준점수"
                        value={examGrades.inquiry2_std_score || ''}
                        onChange={(e) => updateExamGrade('inquiry2_std_score', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('inquiry2_std_score', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">백분위</Label>
                      <Input
                        type="number"
                        placeholder="백분위"
                        value={examGrades.inquiry2_percentile || ''}
                        onChange={(e) => updateExamGrade('inquiry2_percentile', e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={(e) => updateExamGrade('inquiry2_percentile', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!isFieldsEnabled}
                        className={!isFieldsEnabled ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-navy-600">등급</Label>
                      <Select
                        value={examGrades.inquiry2_grade?.toString() || ''}
                        onValueChange={(value) => updateExamGrade('inquiry2_grade', parseInt(value))}
                        disabled={!isFieldsEnabled}
                      >
                        <SelectTrigger className={!isFieldsEnabled ? 'bg-gray-100' : ''}>
                          <SelectValue placeholder="등급" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                            <SelectItem key={grade} value={grade.toString()}>
                              {grade}등급
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 저장 상태 표시 */}
            {isSavingExamGrades && (
              <div className="flex items-center justify-center p-4 bg-navy-50 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-navy-300 border-t-navy-600"></div>
                <span className="ml-2 text-sm text-navy-600">저장 중...</span>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="mt-6 p-4 bg-navy-50 rounded-lg">
              <h5 className="font-medium text-navy-800 mb-2">💡 수능/모의고사 성적 입력 가이드</h5>
              <ul className="text-sm text-navy-600 space-y-1">
                <li>• 먼저 응시 연도와 월을 선택해주세요</li>
                <li>• 국어, 수학, 탐구1, 탐구2: 원점수, 표준점수, 백분위, 등급 입력</li>
                <li>• 영어, 한국사: 원점수, 등급 입력</li>
                <li>• 입력한 성적은 자동으로 저장됩니다</li>
                <li>• 여러 회차의 성적을 각각 입력할 수 있습니다</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 간단한 수능 성적 입력 섹션 렌더링 (기존 구조 유지 - 다른 곳에서 사용할 수 있으므로 유지)
  const renderSimpleSuneungSection = () => (
    <Card className="shadow-lg border-navy-200">
      <CardHeader className="bg-navy-50">
        <CardTitle className="text-navy-800">수능 성적 입력</CardTitle>
        <p className="text-navy-600">각 과목의 등급, 표준점수, 원점수를 입력해주세요.</p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 국어 */}
          <Card className="border-navy-200">
            <CardHeader className="bg-navy-50 pb-3">
              <CardTitle className="text-lg text-navy-800">국어</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm text-navy-600">등급</Label>
                  <Select value={simpleSuneung.korean.grade?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('korean', 'grade', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="등급" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-navy-600">표준점수</Label>
                  <Input
                    type="number"
                    placeholder="표준점수"
                    value={simpleSuneung.korean.standardScore || ''}
                    onChange={(e) => updateSimpleSuneung('korean', 'standardScore', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-sm text-navy-600">원점수</Label>
                  <Input
                    type="number"
                    placeholder="원점수"
                    value={simpleSuneung.korean.rawScore || ''}
                    onChange={(e) => updateSimpleSuneung('korean', 'rawScore', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 수학 */}
          <Card className="border-navy-200">
            <CardHeader className="bg-navy-50 pb-3">
              <CardTitle className="text-lg text-navy-800">수학</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm text-navy-600">등급</Label>
                  <Select value={simpleSuneung.math.grade?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('math', 'grade', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="등급" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-navy-600">표준점수</Label>
                  <Input
                    type="number"
                    placeholder="표준점수"
                    value={simpleSuneung.math.standardScore || ''}
                    onChange={(e) => updateSimpleSuneung('math', 'standardScore', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-sm text-navy-600">원점수</Label>
                  <Input
                    type="number"
                    placeholder="원점수"
                    value={simpleSuneung.math.rawScore || ''}
                    onChange={(e) => updateSimpleSuneung('math', 'rawScore', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 영어 */}
          <Card className="border-navy-200">
            <CardHeader className="bg-navy-50 pb-3">
              <CardTitle className="text-lg text-navy-800">영어</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-navy-600">등급</Label>
                  <Select value={simpleSuneung.english.grade?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('english', 'grade', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="등급" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-navy-600">원점수</Label>
                  <Input
                    type="number"
                    placeholder="원점수"
                    value={simpleSuneung.english.rawScore || ''}
                    onChange={(e) => updateSimpleSuneung('english', 'rawScore', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 한국사 */}
          <Card className="border-navy-200">
            <CardHeader className="bg-navy-50 pb-3">
              <CardTitle className="text-lg text-navy-800">한국사</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-navy-600">등급</Label>
                  <Select value={simpleSuneung.koreanHistory.grade?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('koreanHistory', 'grade', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="등급" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-navy-600">원점수</Label>
                  <Input
                    type="number"
                    placeholder="원점수"
                    value={simpleSuneung.koreanHistory.rawScore || ''}
                    onChange={(e) => updateSimpleSuneung('koreanHistory', 'rawScore', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 탐구1 */}
          <Card className="border-navy-200">
            <CardHeader className="bg-navy-50 pb-3">
              <CardTitle className="text-lg text-navy-800">탐구1</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm text-navy-600">등급</Label>
                  <Select value={simpleSuneung.inquiry1.grade?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('inquiry1', 'grade', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="등급" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-navy-600">표준점수</Label>
                  <Input
                    type="number"
                    placeholder="표준점수"
                    value={simpleSuneung.inquiry1.standardScore || ''}
                    onChange={(e) => updateSimpleSuneung('inquiry1', 'standardScore', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-sm text-navy-600">원점수</Label>
                  <Input
                    type="number"
                    placeholder="원점수"
                    value={simpleSuneung.inquiry1.rawScore || ''}
                    onChange={(e) => updateSimpleSuneung('inquiry1', 'rawScore', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 탐구2 */}
          <Card className="border-navy-200">
            <CardHeader className="bg-navy-50 pb-3">
              <CardTitle className="text-lg text-navy-800">탐구2</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm text-navy-600">등급</Label>
                  <Select value={simpleSuneung.inquiry2.grade?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('inquiry2', 'grade', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="등급" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-navy-600">표준점수</Label>
                  <Input
                    type="number"
                    placeholder="표준점수"
                    value={simpleSuneung.inquiry2.standardScore || ''}
                    onChange={(e) => updateSimpleSuneung('inquiry2', 'standardScore', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-sm text-navy-600">원점수</Label>
                  <Input
                    type="number"
                    placeholder="원점수"
                    value={simpleSuneung.inquiry2.rawScore || ''}
                    onChange={(e) => updateSimpleSuneung('inquiry2', 'rawScore', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6 p-4 bg-navy-50 rounded-lg">
          <h5 className="font-medium text-navy-800 mb-2">💡 수능 성적 입력 가이드</h5>
          <ul className="text-sm text-navy-600 space-y-1">
            <li>• 국어, 수학, 탐구1, 탐구2: 등급, 표준점수, 원점수 모두 입력</li>
            <li>• 영어, 한국사: 등급, 원점수만 입력 (표준점수 제외)</li>
            <li>• 아직 시험을 보지 않은 과목은 입력하지 않으셔도 됩니다</li>
            <li>• 입력한 성적은 대학 추천에 활용됩니다</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  // 개인정보 업데이트
  const updatePersonalInfo = (field: keyof StudentPersonalInfo, value: string) => {
    console.log('개인정보 업데이트:', { field, value });
    
    setGrades(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));

    // simpleGradeData에도 개인정보 저장
    setSimpleGrades(prev => {
      const newPersonalInfo = {
        name: prev.personalInfo?.name || '',
        address: prev.personalInfo?.address || '',
        schoolType: prev.personalInfo?.schoolType || '',
        trackType: prev.personalInfo?.trackType || '',
        preferredMajor1: prev.personalInfo?.preferredMajor1 || '',
        preferredMajor2: prev.personalInfo?.preferredMajor2 || '',
        preferredMajor3: prev.personalInfo?.preferredMajor3 || '',
        customMajor: prev.personalInfo?.customMajor || '',
        [field]: value
      };
      
      console.log('simpleGradeData 개인정보 업데이트:', newPersonalInfo);
      
      return {
        ...prev,
        personalInfo: newPersonalInfo
      };
    });
  };

  // 내신 성적 업데이트 (원점수 포함)
  const updateSchoolSubject = (gradeLevel: keyof SchoolGrades, semester: 'semester1' | 'semester2', subject: string, field: 'grade' | 'credits' | 'rawScore', value: string) => {
    const numValue = parseInt(value) || 0;
    setGrades(prev => ({
      ...prev,
      school: {
        ...prev.school,
        [gradeLevel]: {
          ...prev.school[gradeLevel],
          [semester]: {
            ...prev.school[gradeLevel][semester],
            [subject]: {
              ...prev.school[gradeLevel][semester][subject],
              [field]: numValue,
              grade: field === 'grade' ? numValue : prev.school[gradeLevel][semester][subject]?.grade || 0,
              credits: field === 'credits' ? numValue : prev.school[gradeLevel][semester][subject]?.credits || 0,
              rawScore: field === 'rawScore' ? numValue : prev.school[gradeLevel][semester][subject]?.rawScore || 0
            }
          }
        }
      }
    }));
  };

  // 수능 성적 업데이트 (원점수 포함)
  const updateSuneungSubject = (subject: keyof SuneungGrades, field: keyof SuneungSubject, value: string | number) => {
    setGrades(prev => ({
      ...prev,
      suneung: {
        ...prev.suneung,
        [subject]: {
          ...prev.suneung[subject],
          [field]: typeof value === 'string' ? value : (parseInt(value.toString()) || 0)
        }
      }
    }));
  };

  const handleSemesterTabChange = (gradeLevel: keyof SchoolGrades, semester: string) => {
    setActiveSemesterTabs(prev => ({
      ...prev,
      [gradeLevel]: semester
    }));
  };

  // 지망학과 선택 처리 함수
  const handleMajorSelection = (field: 'preferredMajor1' | 'preferredMajor2' | 'preferredMajor3', value: string) => {
    console.log('지망학과 선택:', { field, value });
    
    // 먼저 선택된 학과 업데이트
    updatePersonalInfo(field, value);
    
    // "기타(직접입력)"을 선택하지 않으면 customMajor 필드 초기화
    if (value !== '기타(직접입력)') {
      console.log('customMajor 초기화');
      // customMajor만 별도로 업데이트 (다른 필드에 영향 주지 않음)
      setGrades(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          customMajor: ''
        }
      }));
      
      setSimpleGrades(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          customMajor: ''
        }
      }));
    }
  };

  // 지망학과 렌더링 함수
  const renderMajorSelect = (field: 'preferredMajor1' | 'preferredMajor2' | 'preferredMajor3', label: string) => {
    // simpleGradeData의 개인정보를 우선 사용
    const selectedValue = simpleGrades.personalInfo?.[field] || grades.personalInfo[field];
    const showCustomInput = selectedValue === '기타(직접입력)';
    
    console.log(`지망학과 렌더링 (${field}):`, {
      selectedValue,
      showCustomInput,
      fromSimpleGrades: simpleGrades.personalInfo?.[field],
      fromGrades: grades.personalInfo[field],
      allSimplePersonalInfo: simpleGrades.personalInfo,
      allGradesPersonalInfo: grades.personalInfo
    });
    
    return (
      <div className="space-y-2">
        <Label className="text-sm text-navy-500">{label}</Label>
        <Select value={selectedValue} onValueChange={(value) => handleMajorSelection(field, value)}>
          <SelectTrigger className="border-navy-200 focus:border-gold-500 focus:ring-gold-500">
            <SelectValue placeholder={`${label} 학과 선택`} />
          </SelectTrigger>
          <SelectContent>
            {MAJOR_OPTIONS.map(major => (
              <SelectItem key={major} value={major}>{major}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {showCustomInput && (
          <Input
            placeholder="희망 학과를 직접 입력하세요"
            value={simpleGrades.personalInfo?.customMajor || grades.personalInfo.customMajor || ''}
            onChange={(e) => updatePersonalInfo('customMajor', e.target.value)}
            className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
          />
        )}
      </div>
    );
  };

  // 간단한 성적 입력 섹션 렌더링
  const renderSimpleGradeSection = () => (
    <div className="space-y-6">
      <Card className="shadow-lg border-navy-200">
        <CardHeader className="bg-navy-50">
          <CardTitle className="text-navy-800">간편 내신 성적 입력</CardTitle>
          <p className="text-navy-600">각 과목별로 대표적인 등급을 입력하세요. 더 정확한 분석을 원하면 상세 입력을 이용하세요.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 주요 교과 */}
            <div className="space-y-4">
              <h4 className="font-medium text-navy-800 border-b border-navy-200 pb-2">주요 교과</h4>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-navy-600">국어 평균 등급</Label>
                  <Select value={simpleGrades.korean['전체평균']?.toString() || ''} onValueChange={(value) => updateSimpleGrade('korean', '전체평균', parseInt(value))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="등급 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm text-navy-600">수학 평균 등급</Label>
                  <Select value={simpleGrades.math['전체평균']?.toString() || ''} onValueChange={(value) => updateSimpleGrade('math', '전체평균', parseInt(value))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="등급 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm text-navy-600">영어 평균 등급</Label>
                  <Select value={simpleGrades.english['전체평균']?.toString() || ''} onValueChange={(value) => updateSimpleGrade('english', '전체평균', parseInt(value))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="등급 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* 탐구 교과 */}
            <div className="space-y-4">
              <h4 className="font-medium text-navy-800 border-b border-navy-200 pb-2">탐구 교과</h4>
              
              <div>
                <Label className="text-sm text-navy-600">탐구 평균 등급</Label>
                <p className="text-xs text-navy-500 mb-2">사회/과학 탐구 과목의 평균 등급</p>
                <Select value={simpleGrades.inquiry['전체평균']?.toString() || ''} onValueChange={(value) => updateSimpleGrade('inquiry', '전체평균', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="등급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                      <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* 전문교과 */}
            <div className="space-y-4 bg-gold-50 p-4 rounded-lg border border-gold-200">
              <h4 className="font-medium text-navy-800 border-b border-gold-300 pb-2">전문교과 (선택사항)</h4>
              
              <div>
                <Label className="text-sm text-navy-600">전문교과 평균 등급</Label>
                <p className="text-xs text-navy-500 mb-2">전공어, 고급, 실험 등 전문교과 평균</p>
                <Select value={simpleGrades.specialtySubjects['전체평균']?.toString() || ''} onValueChange={(value) => updateSimpleGrade('specialtySubjects', '전체평균', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="등급 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">전문교과 없음</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                      <SelectItem key={grade} value={grade.toString()}>{grade}등급</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-navy-50 rounded-lg">
            <h5 className="font-medium text-navy-800 mb-2">💡 간편 입력 가이드</h5>
            <ul className="text-sm text-navy-600 space-y-1">
              <li>• 각 과목의 전체 학기 평균 등급을 입력하세요</li>
              <li>• 더 정확한 분석을 원한다면 '상세 입력' 탭을 이용하세요</li>
              <li>• 전문교과가 없다면 '전문교과 없음'을 선택하세요</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 개인정보 입력 섹션 렌더링
  const renderPersonalInfoSection = () => (
    <Card className="shadow-lg border-navy-200 mb-6">
      <CardHeader className="bg-navy-50">
        <CardTitle className="text-navy-800">학생 개인정보</CardTitle>
        <p className="text-navy-600">입시 상담을 위한 기본 정보를 입력해주세요.</p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 이름 */}
          <div className="space-y-2">
            <Label className="text-navy-600">이름</Label>
            <Input
              placeholder="학생 이름"
              value={simpleGrades.personalInfo?.name || grades.personalInfo.name || ''}
              onChange={(e) => updatePersonalInfo('name', e.target.value)}
              className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
            />
          </div>

          {/* 주소 */}
          <div className="space-y-2">
            <Label className="text-navy-600">
              주소 <span className="text-sm text-navy-400">(상담시 학생 구분 목적으로 사용)</span>
            </Label>
            <Input
              placeholder="거주 지역"
              value={simpleGrades.personalInfo?.address || grades.personalInfo.address || ''}
              onChange={(e) => updatePersonalInfo('address', e.target.value)}
              className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
            />
          </div>

          {/* 학교 유형 */}
          <div className="space-y-2">
            <Label className="text-navy-600">학교 유형</Label>
            <Select value={simpleGrades.personalInfo?.schoolType || grades.personalInfo.schoolType || ''} onValueChange={(value) => updatePersonalInfo('schoolType', value)}>
              <SelectTrigger className="border-navy-200 focus:border-gold-500 focus:ring-gold-500">
                <SelectValue placeholder="학교 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_TYPE_OPTIONS.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 계열 */}
          <div className="space-y-2">
            <Label className="text-navy-600">계열</Label>
            <Select value={simpleGrades.personalInfo?.trackType || grades.personalInfo.trackType || ''} onValueChange={(value) => updatePersonalInfo('trackType', value)}>
              <SelectTrigger className="border-navy-200 focus:border-gold-500 focus:ring-gold-500">
                <SelectValue placeholder="계열을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {TRACK_TYPE_OPTIONS.map(track => (
                  <SelectItem key={track} value={track}>{track}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* 지망 계열/학과 */}
        <div className="space-y-4">
          <Label className="text-navy-600">지망 계열/학과 (최대 3개)</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderMajorSelect('preferredMajor1', '1순위')}
            {renderMajorSelect('preferredMajor2', '2순위')}
            {renderMajorSelect('preferredMajor3', '3순위')}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 내신 과목 입력 렌더링 (원점수 포함)
  const renderSchoolSubjectInputs = (gradeLevel: keyof SchoolGrades, semester: 'semester1' | 'semester2', subjects: string[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map(subject => (
          <div key={subject} className="p-4 border border-navy-200 rounded-lg space-y-3 bg-white">
            <div className="font-medium text-center text-navy-800">{subject}</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-navy-600">등급</Label>
                <Select 
                  value={grades.school[gradeLevel][semester][subject]?.grade?.toString() || ''} 
                  onValueChange={(value) => updateSchoolSubject(gradeLevel, semester, subject, 'grade', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="등급" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                      <SelectItem key={grade} value={grade.toString()}>
                        {grade}등급
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-navy-600">이수단위</Label>
                <Input
                  type="number"
                  min="1"
                  max="8"
                  placeholder="단위"
                  value={grades.school[gradeLevel][semester][subject]?.credits || ''}
                  onChange={(e) => updateSchoolSubject(gradeLevel, semester, subject, 'credits', e.target.value)}
                  className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-navy-600">원점수</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="원점수"
                  value={grades.school[gradeLevel][semester][subject]?.rawScore || ''}
                  onChange={(e) => updateSchoolSubject(gradeLevel, semester, subject, 'rawScore', e.target.value)}
                  className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 수능 과목 입력 렌더링 (원점수 포함)
  const renderSuneungSubjectInput = (subject: keyof SuneungGrades, subjectName: string, options?: string[], hasOptions = false) => {
    const subjectData = grades.suneung[subject];
    
    return (
      <Card key={subject} className="p-4 border-navy-200">
        <div className="space-y-4">
          <div className="text-center font-medium text-navy-800">{subjectName}</div>
          
          {hasOptions && options && (
            <div className="space-y-2">
              <Label className="text-sm text-navy-600">선택과목</Label>
              <Select 
                value={subjectData.selectedOption || ''} 
                onValueChange={(value) => updateSuneungSubject(subject, 'selectedOption', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택과목을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {options.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label className="text-sm text-navy-600">표준점수</Label>
              <Input
                type="number"
                min="0"
                max="200"
                placeholder="표준점수"
                value={subjectData.standardScore || ''}
                onChange={(e) => updateSuneungSubject(subject, 'standardScore', e.target.value)}
                className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-navy-600">백분위</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="백분위"
                value={subjectData.percentile || ''}
                onChange={(e) => updateSuneungSubject(subject, 'percentile', e.target.value)}
                className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-navy-600">등급</Label>
              <Select 
                value={subjectData.grade?.toString() || ''} 
                onValueChange={(value) => updateSuneungSubject(subject, 'grade', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="등급" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                    <SelectItem key={grade} value={grade.toString()}>
                      {grade}등급
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-navy-600">원점수</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="원점수"
                value={subjectData.rawScore || ''}
                onChange={(e) => updateSuneungSubject(subject, 'rawScore', e.target.value)}
                className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
              />
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // 내신 학년별 콘텐츠 렌더링
  const renderSchoolGradeContent = (gradeLevel: keyof SchoolGrades, gradeNumber: string, subjects: string[]) => (
    <div className="space-y-6">
      {/* 일반 교과 */}
      <Card className="shadow-lg border-navy-200">
        <CardHeader className="bg-navy-50">
          <CardTitle className="text-navy-800">{gradeNumber} 성적 입력</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs 
            value={activeSemesterTabs[gradeLevel]} 
            onValueChange={(value) => handleSemesterTabChange(gradeLevel, value)}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="semester1">1학기</TabsTrigger>
              <TabsTrigger value="semester2">2학기</TabsTrigger>
            </TabsList>

            <TabsContent value="semester1" className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-center text-navy-800">{gradeNumber} 1학기</h3>
                <p className="text-sm text-navy-600 text-center mt-1">각 과목의 등급, 이수단위, 원점수를 입력해주세요</p>
              </div>
              {renderSchoolSubjectInputs(gradeLevel, 'semester1', subjects)}
            </TabsContent>

            <TabsContent value="semester2" className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-center text-navy-800">{gradeNumber} 2학기</h3>
                <p className="text-sm text-navy-600 text-center mt-1">각 과목의 등급, 이수단위, 원점수를 입력해주세요</p>
              </div>
              {renderSchoolSubjectInputs(gradeLevel, 'semester2', subjects)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 전문교과 */}
      <Card className="shadow-lg border-navy-200">
        <CardHeader className="bg-gold-50">
          <CardTitle className="text-navy-800">전문교과 (전공어, 고급, 실험 등)</CardTitle>
          <p className="text-navy-600">전문교과 성적이 있는 경우 입력해주세요.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs 
            value={activeSemesterTabs[gradeLevel]} 
            onValueChange={(value) => handleSemesterTabChange(gradeLevel, value)}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="semester1">1학기</TabsTrigger>
              <TabsTrigger value="semester2">2학기</TabsTrigger>
            </TabsList>

            <TabsContent value="semester1" className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-center text-navy-800">{gradeNumber} 1학기 전문교과</h3>
                <p className="text-sm text-navy-600 text-center mt-1">전문교과의 등급, 이수단위, 원점수를 입력해주세요</p>
              </div>
              {renderSchoolSubjectInputs(gradeLevel, 'semester1', VOCATIONAL_SUBJECTS)}
            </TabsContent>

            <TabsContent value="semester2" className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-center text-navy-800">{gradeNumber} 2학기 전문교과</h3>
                <p className="text-sm text-navy-600 text-center mt-1">전문교과의 등급, 이수단위, 원점수를 입력해주세요</p>
              </div>
              {renderSchoolSubjectInputs(gradeLevel, 'semester2', VOCATIONAL_SUBJECTS)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button onClick={onBack} variant="outline" className="mb-4 border-navy-300 text-navy-700 hover:bg-navy-100">
            ← 이전으로
          </Button>
          <h1 className="text-3xl mb-2 text-navy-900">성적 입력</h1>
          <p className="text-navy-600">안녕하세요, {studentName}님! 개인정보와 성적 정보를 입력해주세요.</p>
          
          {/* 자동저장 상태 표시 */}
          <div className="mt-4 p-3 bg-navy-50 rounded-lg border border-navy-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-navy-300 border-t-navy-600"></div>
                    <span className="text-sm text-navy-600">자동 저장 중...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-navy-600">
                      {lastSaved ? `마지막 저장: ${lastSaved.toLocaleTimeString()}` : '저장 준비됨'}
                    </span>
                  </>
                )}
              </div>
              <span className="text-xs text-navy-500">💾 모든 변경사항이 자동으로 저장됩니다</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 개인정보 섹션을 별도 박스로 최상단에 위치 */}
          {renderPersonalInfoSection()}

          <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="simple">간편 입력</TabsTrigger>
              <TabsTrigger value="school">내신 성적</TabsTrigger>
              <TabsTrigger value="suneung">수능/모의고사</TabsTrigger>
            </TabsList>

            {/* 간편 내신 성적 입력 탭 */}
            <TabsContent value="simple">
              {renderSimpleGradeSection()}
            </TabsContent>

            {/* 내신 상세 탭 */}
            <TabsContent value="school">
              <Tabs value={activeGradeTab} onValueChange={setActiveGradeTab}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="grade1">1학년</TabsTrigger>
                  <TabsTrigger value="grade2">2학년</TabsTrigger>
                  <TabsTrigger value="grade3">3학년</TabsTrigger>
                </TabsList>

                <TabsContent value="grade1" className="space-y-6">
                  {renderSchoolGradeContent('grade1', '1학년', GRADE1_SUBJECTS)}
                </TabsContent>

                <TabsContent value="grade2" className="space-y-6">
                  {renderSchoolGradeContent('grade2', '2학년', GRADE23_SUBJECTS)}
                </TabsContent>

                <TabsContent value="grade3" className="space-y-6">
                  {renderSchoolGradeContent('grade3', '3학년', GRADE23_SUBJECTS)}
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* 수능 탭 */}
            <TabsContent value="suneung">
              {renderMultiExamSuneungSection()}
            </TabsContent>
          </Tabs>

          {/* 입력 완료 버튼 */}
          <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-navy-200">
            <div className="text-center">
              <h3 className="text-lg font-medium text-navy-800 mb-2">성적 입력 완료</h3>
              <p className="text-navy-600 mb-4">
                모든 성적 정보가 실시간으로 저장되었습니다. 아래 버튼을 클릭하여 분석 리포트를 확인하세요.
              </p>
              <Button 
                onClick={handleComplete}
                className="bg-gold-500 hover:bg-gold-600 text-white px-8 py-3 text-lg font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                📊 분석 리포트 보기
              </Button>
              <p className="text-sm text-navy-500 mt-3">
                💡 입력한 모든 데이터는 자동으로 저장되어 언제든지 수정할 수 있습니다.
              </p>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}