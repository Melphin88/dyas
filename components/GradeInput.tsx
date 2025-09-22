import { useState, useEffect } from 'react';
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
  '의학과', '치의학과', '한의학과', '수의학과', '약학과', '간호학과', '의료기술학과',
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

export function GradeInput({ studentId, studentName, initialGrades, onSubmit, onSaveSimpleGrade, onSaveSimpleSuneung, initialSimpleGrades, initialSimpleSuneung, onBack }: GradeInputProps) {
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
    specialtySubjects: {}
  });

  // 간단한 수능 성적 입력 상태
  const [simpleSuneung, setSimpleSuneung] = useState<SimpleSuneungData>(initialSimpleSuneung || {
    korean: 0,
    math: 0,
    english: 0,
    inquiry1: 0,
    inquiry2: 0
  });
  
  // 각 학년별 학기 탭 상태 관리
  const [activeSemesterTabs, setActiveSemesterTabs] = useState({
    grade1: 'semester1',
    grade2: 'semester1',
    grade3: 'semester1'
  });

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
    }

    if (initialSimpleGrades) {
      setSimpleGrades(initialSimpleGrades);
    }
  }, [initialGrades, initialSimpleGrades]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeMainTab === 'simple' && onSaveSimpleGrade) {
      onSaveSimpleGrade(simpleGrades);
    } else if (activeMainTab === 'suneung' && onSaveSimpleSuneung) {
      onSaveSimpleSuneung(simpleSuneung);
    } else {
      onSubmit(grades);
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
  const updateSimpleSuneung = (subject: keyof SimpleSuneungData, grade: number) => {
    setSimpleSuneung(prev => ({
      ...prev,
      [subject]: grade
    }));
  };

  // 간단한 수능 성적 입력 섹션 렌더링
  const renderSimpleSuneungSection = () => (
    <Card className="shadow-lg border-navy-200">
      <CardHeader className="bg-navy-50">
        <CardTitle className="text-navy-800">수능 성적 입력</CardTitle>
        <p className="text-navy-600">각 과목의 등급을 입력해주세요.</p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 국어 */}
          <div className="space-y-2">
            <Label className="text-navy-600">국어</Label>
            <Select value={simpleSuneung.korean?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('korean', parseInt(value))}>
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

          {/* 수학 */}
          <div className="space-y-2">
            <Label className="text-navy-600">수학</Label>
            <Select value={simpleSuneung.math?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('math', parseInt(value))}>
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

          {/* 영어 */}
          <div className="space-y-2">
            <Label className="text-navy-600">영어</Label>
            <Select value={simpleSuneung.english?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('english', parseInt(value))}>
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

          {/* 탐구1 */}
          <div className="space-y-2">
            <Label className="text-navy-600">탐구1</Label>
            <Select value={simpleSuneung.inquiry1?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('inquiry1', parseInt(value))}>
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

          {/* 탐구2 */}
          <div className="space-y-2">
            <Label className="text-navy-600">탐구2</Label>
            <Select value={simpleSuneung.inquiry2?.toString() || ''} onValueChange={(value) => updateSimpleSuneung('inquiry2', parseInt(value))}>
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
        
        <div className="mt-6 p-4 bg-navy-50 rounded-lg">
          <h5 className="font-medium text-navy-800 mb-2">💡 수능 성적 입력 가이드</h5>
          <ul className="text-sm text-navy-600 space-y-1">
            <li>• 각 과목의 등급을 입력하세요</li>
            <li>• 아직 시험을 보지 않은 과목은 선택하지 않으셔도 됩니다</li>
            <li>• 입력한 성적은 대학 추천에 활용됩니다</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  // 개인정보 업데이트
  const updatePersonalInfo = (field: keyof StudentPersonalInfo, value: string) => {
    setGrades(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
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
    updatePersonalInfo(field, value);
    
    // "기타(직접입력)"을 선택하지 않으면 customMajor 필드 초기화
    if (value !== '기타(직접입력)') {
      updatePersonalInfo('customMajor', '');
    }
  };

  // 지망학과 렌더링 함수
  const renderMajorSelect = (field: 'preferredMajor1' | 'preferredMajor2' | 'preferredMajor3', label: string) => {
    const selectedValue = grades.personalInfo[field];
    const showCustomInput = selectedValue === '기타(직접입력)';
    
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
            value={grades.personalInfo.customMajor || ''}
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
              value={grades.personalInfo.name}
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
              value={grades.personalInfo.address}
              onChange={(e) => updatePersonalInfo('address', e.target.value)}
              className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
            />
          </div>

          {/* 학교 유형 */}
          <div className="space-y-2">
            <Label className="text-navy-600">학교 유형</Label>
            <Select value={grades.personalInfo.schoolType} onValueChange={(value) => updatePersonalInfo('schoolType', value)}>
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
            <Select value={grades.personalInfo.trackType} onValueChange={(value) => updatePersonalInfo('trackType', value)}>
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
        </div>

        <form onSubmit={handleSubmit}>
          {/* 개인정보 섹션을 별도 박스로 최상단에 위치 */}
          {renderPersonalInfoSection()}

          <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="simple">간편 입력</TabsTrigger>
              <TabsTrigger value="school">성적 입력</TabsTrigger>
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
              {renderSimpleSuneungSection()}
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-center">
            <Button type="submit" className="w-full max-w-md bg-gold-600 hover:bg-gold-700 text-white shadow-lg">
              {activeMainTab === 'simple' ? '간편 성적 저장하고 다음 단계로' : 
               activeMainTab === 'suneung' ? '수능 성적 저장하고 분석 결과 보기' : '분석 결과 보기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}