import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey, isSupabaseConfigured, isDevelopmentMode } from './utils/supabase/info';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { AdminPanel } from './components/AdminPanel';
import { GradeInput } from './components/GradeInput';
import { SuneungInput } from './components/SuneungInput';
import { AnalysisReport } from './components/AnalysisReport';
import { PrintReport } from './components/PrintReport';
import { SimpleGradeData, SimpleSuneungData } from './types/university';
import { supabase } from './utils/supabase/client';

// 계정 정보 인터페이스
interface Account {
  id: string;
  name: string;
  password: string;
}

// Supabase 계정 정보 인터페이스
interface SupabaseAccount {
  id: string;
  username: string;
  name: string;
  password: string;
  is_admin: boolean;
  created_at: string;
}

// 내신 성적 데이터 구조 (기존 구조)
interface GradeData {
  personalInfo: {
    name: string;
    address: string;
    schoolType: string;
    trackType: string;
    preferredMajor1: string;
    preferredMajor2: string;
    preferredMajor3: string;
    customMajor: string;
  };
  school: {
    grade1: { semester1: any; semester2: any };
    grade2: { semester1: any; semester2: any };
    grade3: { semester1: any; semester2: any };
  };
  suneung: {
    korean: { standardScore: number; percentile: number; grade: number; selectedOption: string };
    math: { standardScore: number; percentile: number; grade: number; selectedOption: string };
    english: { standardScore: number; percentile: number; grade: number };
    koreanHistory: { standardScore: number; percentile: number; grade: number };
    inquiry1: { standardScore: number; percentile: number; grade: number; selectedOption: string };
    inquiry2: { standardScore: number; percentile: number; grade: number; selectedOption: string };
    secondLanguage: { standardScore: number; percentile: number; grade: number; selectedOption: string };
  };
}

function App() {
  // 기본 상태들
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'admin' | 'grade' | 'report' | 'print'>('login');
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 계정 관리 (로컬 스토리지)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [studentGrades, setStudentGrades] = useState<{[key: string]: GradeData}>({});
  
  // Supabase 계정 목록
  const [supabaseAccounts, setSupabaseAccounts] = useState<SupabaseAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // 새로운 간단한 성적 데이터 (Supabase 연동)
  const [simpleGradeData, setSimpleGradeData] = useState<SimpleGradeData | null>(null);
  const [simpleSuneungData, setSimpleSuneungData] = useState<SimpleSuneungData | null>(null);
  
  // 인쇄 보고서용 상태
  const [printStudentId, setPrintStudentId] = useState<string | null>(null);
  const [printStudentName, setPrintStudentName] = useState<string | null>(null);

  // 초기 로드
  useEffect(() => {
    loadAccounts();
    loadStudentGrades();
    loadLocalSimpleGrades(); // 로컬 간단 성적 로드 추가
    loadSupabaseAccounts(); // Supabase 계정 목록 로드 추가
  }, []);

  // 로컬 저장된 간단 성적 로드 (백업용, Supabase가 실패할 경우 사용)
  const loadLocalSimpleGrades = () => {
    // Supabase에서 로드하는 것이 우선이므로, 로컬 스토리지는 백업용으로만 사용
    // 실제 로드는 handleLogin에서 Supabase를 통해 수행
    const savedGrades = localStorage.getItem('universityApp_simpleGrades');
    const savedSuneung = localStorage.getItem('universityApp_suneungData');
    
    // Supabase 데이터가 없을 때만 로컬 스토리지 사용
    if (savedGrades && !simpleGradeData) {
      try {
        setSimpleGradeData(JSON.parse(savedGrades));
      } catch (error) {
        console.warn('저장된 간단 성적 로드 실패:', error);
      }
    }
    
    if (savedSuneung && !simpleSuneungData) {
      try {
        const suneungData = JSON.parse(savedSuneung);
        
        // 이전 구조인지 확인하고 새로운 구조로 변환
        const isOldStructure = suneungData.korean && typeof suneungData.korean === 'number';
        
        if (isOldStructure) {
          // 이전 구조를 새로운 구조로 변환
          const newStructure = {
            korean: { 
              grade: suneungData.korean || 0, 
              standardScore: 0, 
              rawScore: 0 
            },
            math: { 
              grade: suneungData.math || 0, 
              standardScore: 0, 
              rawScore: 0 
            },
            english: { 
              grade: suneungData.english || 0, 
              rawScore: 0 
            },
            koreanHistory: { 
              grade: 0, 
              rawScore: 0 
            },
            inquiry1: { 
              grade: suneungData.inquiry1 || 0, 
              standardScore: 0, 
              rawScore: 0 
            },
            inquiry2: { 
              grade: suneungData.inquiry2 || 0, 
              standardScore: 0, 
              rawScore: 0 
            }
          };
          setSimpleSuneungData(newStructure);
        } else {
          // 이미 새로운 구조
          setSimpleSuneungData(suneungData);
        }
      } catch (error) {
        console.warn('저장된 수능 성적 로드 실패:', error);
      }
    }
  };

  // 로컬 스토리지에서 계정 로드
  const loadAccounts = () => {
    const saved = localStorage.getItem('universityApp_accounts');
    if (saved) {
      setAccounts(JSON.parse(saved));
    } else {
      // 기본 테스트 계정들 추가
      const defaultAccounts = [
        { id: 'student1', name: '김학생', password: 'pass123' },
        { id: 'student2', name: '이학생', password: 'mypass' },
        { id: 'test', name: '테스트', password: '1234' }
      ];
      setAccounts(defaultAccounts);
      localStorage.setItem('universityApp_accounts', JSON.stringify(defaultAccounts));
    }
  };

  // Supabase에서 계정 목록 로드
  const loadSupabaseAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase 계정 목록 로드 오류:', error);
        return;
      }

      console.log('Supabase 계정 목록:', data);
      setSupabaseAccounts(data || []);
    } catch (error) {
      console.error('Supabase 계정 목록 로드 오류:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 로컬 스토리지에서 성적 로드
  const loadStudentGrades = () => {
    const saved = localStorage.getItem('universityApp_studentGrades');
    if (saved) {
      setStudentGrades(JSON.parse(saved));
    }
  };

  // 로그인 처리 (Supabase 연동)
  const handleLogin = async (account: any) => {
    // Supabase 계정의 경우 username을 id로 사용
    const studentId = account.username || account.id;
    const accountWithId = { ...account, id: studentId };
    setCurrentUser(accountWithId);
    setIsAdmin(account.is_admin || false);
    
    // 학생인 경우 Supabase에서 성적 데이터 로드
    if (!account.is_admin) {
      await loadStudentGradesFromSupabase(studentId);
    }
    
    if (account.is_admin) {
      setCurrentView('admin');
    } else {
      setCurrentView('grade');
    }
    return true;
  };

  // 회원가입 성공 처리
  const handleRegisterSuccess = () => {
    setCurrentView('login');
  };

  // 계정 추가 (Supabase 연동)
  const handleAddAccount = async (account: Account) => {
    try {
      // Supabase에 계정 추가
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          username: account.id,
          password: account.password,
          name: account.name,
          is_admin: false
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase 계정 추가 오류:', error);
        return;
      }

      console.log('Supabase 계정 추가 성공:', data);
      
      // 로컬 상태도 업데이트 (기존 기능 유지)
      const newAccounts = [...accounts, account];
      setAccounts(newAccounts);
      localStorage.setItem('universityApp_accounts', JSON.stringify(newAccounts));
      
      // Supabase 계정 목록 새로고침
      loadSupabaseAccounts();
    } catch (error) {
      console.error('계정 추가 오류:', error);
    }
  };

  // 계정 삭제 (Supabase 연동)
  const handleDeleteAccount = async (id: string) => {
    try {
      // Supabase에서 계정 삭제
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('username', id);

      if (error) {
        console.error('Supabase 계정 삭제 오류:', error);
        return;
      }

      console.log('Supabase 계정 삭제 성공');
      
      // 로컬 상태도 업데이트
      const newAccounts = accounts.filter(acc => acc.id !== id);
      setAccounts(newAccounts);
      localStorage.setItem('universityApp_accounts', JSON.stringify(newAccounts));
      
      const newGrades = { ...studentGrades };
      delete newGrades[id];
      setStudentGrades(newGrades);
      localStorage.setItem('universityApp_studentGrades', JSON.stringify(newGrades));
      
      // Supabase 계정 목록 새로고침
      loadSupabaseAccounts();
    } catch (error) {
      console.error('계정 삭제 오류:', error);
    }
  };

  // 학생 성적 업데이트
  const handleUpdateStudentGrades = async (studentId: string, grades: GradeData) => {
    const newGrades = { ...studentGrades, [studentId]: grades };
    setStudentGrades(newGrades);
    
    // localStorage에도 저장 (백업용)
    localStorage.setItem('universityApp_studentGrades', JSON.stringify(newGrades));
    
    // Supabase에 저장
    await saveStudentGradesToSupabase(
      studentId,
      undefined,
      undefined,
      grades
    );
  };

  // Supabase에서 학생 성적 데이터 로드
  const loadStudentGradesFromSupabase = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_grades')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116은 데이터가 없을 때 발생
        console.error('Supabase 성적 데이터 로드 오류:', error);
        return;
      }

      if (data) {
        console.log('Supabase에서 성적 데이터 로드 성공:', data);
        
        // 간단한 내신 성적 데이터 로드
        if (data.simple_grade_data) {
          setSimpleGradeData(data.simple_grade_data);
        }
        
        // 간단한 수능 성적 데이터 로드
        // simple_suneung_data 컬럼은 삭제되었으므로 더 이상 사용하지 않음
        // 대신 student_grades 테이블의 exam_year, exam_month 기반 다회차 성적 관리 사용
        
        // 상세 성적 데이터 로드
        if (data.detailed_grade_data) {
          setStudentGrades(prev => ({
            ...prev,
            [studentId]: data.detailed_grade_data
          }));
        }
      }
    } catch (error) {
      console.error('Supabase 성적 데이터 로드 오류:', error);
    }
  };

  // Supabase에 학생 성적 데이터 저장
  const saveStudentGradesToSupabase = async (
    studentId: string,
    simpleGradeData?: SimpleGradeData | null,
    simpleSuneungData?: SimpleSuneungData | null,
    detailedGradeData?: GradeData | null
  ) => {
    try {
      // 기존 데이터 확인
      const { data: existingData } = await supabase
        .from('student_grades')
        .select('*')
        .eq('student_id', studentId)
        .single();

      const dataToSave: any = {
        student_id: studentId,
        updated_at: new Date().toISOString()
      };

      // 각 데이터가 제공되면 업데이트
      if (simpleGradeData !== undefined) {
        dataToSave.simple_grade_data = simpleGradeData;
      }
      // simple_suneung_data 컬럼은 삭제되었으므로 더 이상 저장하지 않음
      // 대신 student_grades 테이블의 exam_year, exam_month 기반 다회차 성적 관리 사용
      if (detailedGradeData !== undefined) {
        dataToSave.detailed_grade_data = detailedGradeData;
      }

      if (existingData) {
        // 기존 데이터 업데이트
        const { error } = await supabase
          .from('student_grades')
          .update(dataToSave)
          .eq('student_id', studentId);

        if (error) {
          console.error('Supabase 성적 데이터 업데이트 오류:', error);
        } else {
          console.log('Supabase 성적 데이터 업데이트 성공');
        }
      } else {
        // 새 데이터 삽입
        const { error } = await supabase
          .from('student_grades')
          .insert(dataToSave);

        if (error) {
          console.error('Supabase 성적 데이터 삽입 오류:', error);
        } else {
          console.log('Supabase 성적 데이터 삽입 성공');
        }
      }
    } catch (error) {
      console.error('Supabase 성적 데이터 저장 오류:', error);
    }
  };

  // 간단한 내신 성적 저장
  const handleSaveSimpleGrade = async (data: SimpleGradeData) => {
    setSimpleGradeData(data);
    
    // localStorage에도 저장 (백업용)
    localStorage.setItem('universityApp_simpleGrades', JSON.stringify(data));
    
    // Supabase에 저장
    if (currentUser) {
      const studentId = currentUser.id || currentUser.username;
      await saveStudentGradesToSupabase(
        studentId,
        data,
        undefined,
        undefined
      );
    }
  };

  // 간단한 수능 성적 저장
  const handleSaveSimpleSuneung = async (data: SimpleSuneungData) => {
    setSimpleSuneungData(data);
    
    // localStorage에도 저장 (백업용)
    localStorage.setItem('universityApp_suneungData', JSON.stringify(data));
    
    // Supabase에 저장
    if (currentUser) {
      const studentId = currentUser.id || currentUser.username;
      await saveStudentGradesToSupabase(
        studentId,
        undefined,
        data,
        undefined
      );
    }
  };

  // 다회차 수능/모의고사 성적 조회 API
  const loadExamGrades = async (studentId: string, examYear: number, examMonth: string) => {
    try {
      const { data, error } = await supabase
        .from('student_grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('exam_year', examYear)
        .eq('exam_month', examMonth)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('회차 성적 데이터 조회 오류:', error);
        return null;
      }

      if (data) {
        console.log('회차 성적 데이터 조회 성공:', data);
        return {
          korean_raw_score: data.korean_raw_score,
          korean_std_score: data.korean_std_score,
          korean_percentile: data.korean_percentile,
          korean_grade: data.korean_grade,
          math_raw_score: data.math_raw_score,
          math_std_score: data.math_std_score,
          math_percentile: data.math_percentile,
          math_grade: data.math_grade,
          english_raw_score: data.english_raw_score,
          english_grade: data.english_grade,
          inquiry1_raw_score: data.inquiry1_raw_score,
          inquiry1_std_score: data.inquiry1_std_score,
          inquiry1_percentile: data.inquiry1_percentile,
          inquiry1_grade: data.inquiry1_grade,
          inquiry2_raw_score: data.inquiry2_raw_score,
          inquiry2_std_score: data.inquiry2_std_score,
          inquiry2_percentile: data.inquiry2_percentile,
          inquiry2_grade: data.inquiry2_grade,
          k_history_raw_score: data.k_history_raw_score,
          k_history_grade: data.k_history_grade
        };
      }

      return null;
    } catch (error) {
      console.error('회차 성적 데이터 조회 오류:', error);
      return null;
    }
  };

  // 다회차 수능/모의고사 성적 저장/UPSERT API
  const saveExamGrades = async (
    studentId: string,
    examYear: number,
    examMonth: string,
    grades: {
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
    }
  ) => {
    try {
      // 기존 데이터 확인
      const { data: existingData } = await supabase
        .from('student_grades')
        .select('id')
        .eq('student_id', studentId)
        .eq('exam_year', examYear)
        .eq('exam_month', examMonth)
        .single();

      const dataToSave = {
        student_id: studentId,
        exam_year: examYear,
        exam_month: examMonth,
        ...grades,
        updated_at: new Date().toISOString()
      };

      if (existingData) {
        // 기존 데이터 업데이트
        const { error } = await supabase
          .from('student_grades')
          .update(dataToSave)
          .eq('student_id', studentId)
          .eq('exam_year', examYear)
          .eq('exam_month', examMonth);

        if (error) {
          console.error('회차 성적 데이터 업데이트 오류:', error);
          throw error;
        } else {
          console.log('회차 성적 데이터 업데이트 성공');
          return true;
        }
      } else {
        // 새 데이터 삽입
        const { error } = await supabase
          .from('student_grades')
          .insert(dataToSave);

        if (error) {
          console.error('회차 성적 데이터 삽입 오류:', error);
          throw error;
        } else {
          console.log('회차 성적 데이터 삽입 성공');
          return true;
        }
      }
    } catch (error) {
      console.error('회차 성적 데이터 저장 오류:', error);
      throw error;
    }
  };

  // 인쇄 보고서 보기
  const handleViewPrintReport = (studentId?: string) => {
    if (studentId) {
      const account = accounts.find(acc => acc.id === studentId);
      setPrintStudentId(studentId);
      setPrintStudentName(account?.name || '학생');
    } else {
      setPrintStudentId(currentUser?.id || null);
      setPrintStudentName(currentUser?.name || null);
    }
    setCurrentView('print');
  };

  // 로그아웃
  const handleLogout = async () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setCurrentView('login');
    setSimpleGradeData(null);
    setSimpleSuneungData(null);
    setPrintStudentId(null);
    setPrintStudentName(null);
  };

  // 개발 모드 알림 컴포넌트
  const DevelopmentModeAlert = () => {
    if (!isDevelopmentMode()) return null;
    
    return (
      <div className="bg-navy-100 border border-navy-300 text-navy-800 px-4 py-3 rounded mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-navy-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium">로컬 개발 모드</h4>
            <p className="text-sm mt-1">
              현재 로컬 데이터로 실행 중입니다. 모든 데이터는 브라우저에 저장됩니다.
              <br />
              실제 배포를 위해서는 Supabase 환경변수를 설정해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 네비게이션 컴포넌트
  const NavigationBar = () => {
    if (currentView === 'login' || currentView === 'register' || currentView === 'admin') return null;

    return (
      <div className="bg-white shadow-sm border-b border-navy-200 mb-6">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <DevelopmentModeAlert />
          
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-navy-900">
              대학 입시 성적 분석 시스템
            </h1>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <span className="text-navy-600">
                  {currentUser.name}님 환영합니다
                </span>
              )}
              {isDevelopmentMode() && (
                <span className="text-xs bg-navy-100 text-navy-600 px-2 py-1 rounded">
                  로컬 모드
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-navy-600 hover:text-navy-800 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
          
          <div className="flex space-x-6 mt-4">
            <button
              onClick={() => setCurrentView('grade')}
              className={`pb-2 border-b-2 transition-colors ${
                currentView === 'grade'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-navy-600 hover:text-navy-800'
              }`}
            >
              성적 입력
            </button>
            <button
              onClick={() => setCurrentView('report')}
              className={`pb-2 border-b-2 transition-colors ${
                currentView === 'report'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-navy-600 hover:text-navy-800'
              }`}
            >
              분석 리포트
            </button>
            <button
              onClick={() => handleViewPrintReport()}
              className={`pb-2 border-b-2 transition-colors ${
                currentView === 'print'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-navy-600 hover:text-navy-800'
              }`}
            >
              인쇄용 보고서
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-navy-50">
      <NavigationBar />
      
      <div className={currentView === 'print' ? '' : 'max-w-4xl mx-auto px-4 py-6'}>
        {currentView === 'login' && (
          <div>
            <DevelopmentModeAlert />
            <LoginForm
              onLogin={handleLogin}
              onAdminLogin={() => {
                setIsAdmin(true);
                setCurrentView('admin');
              }}
              onShowRegister={() => setCurrentView('register')}
            />
          </div>
        )}

        {currentView === 'register' && (
          <div>
            <DevelopmentModeAlert />
            <RegisterForm
              onBack={() => setCurrentView('login')}
              onRegisterSuccess={handleRegisterSuccess}
            />
          </div>
        )}

        {currentView === 'admin' && (
          <div>
            <DevelopmentModeAlert />
            <AdminPanel
              accounts={supabaseAccounts.map(acc => ({
                id: acc.username, // username(전화번호)을 id로 사용
                name: acc.name,
                password: acc.password
              }))}
              studentGrades={studentGrades}
              onAddAccount={handleAddAccount}
              onDeleteAccount={handleDeleteAccount}
              onUpdateStudentGrades={handleUpdateStudentGrades}
              onBack={() => setCurrentView('login')}
              onViewPrintReport={handleViewPrintReport}
            />
          </div>
        )}

        {currentView === 'grade' && currentUser && (
          <GradeInput
            loadExamGrades={loadExamGrades}
            saveExamGrades={saveExamGrades}
            studentId={currentUser.id || currentUser.username}
            studentName={currentUser.name}
            initialGrades={studentGrades[currentUser.id || currentUser.username]}
            onSubmit={async (grades) => {
              const studentId = currentUser.id || currentUser.username;
              await handleUpdateStudentGrades(studentId, grades);
            }}
            onSaveSimpleGrade={handleSaveSimpleGrade}
            onSaveSimpleSuneung={handleSaveSimpleSuneung}
            initialSimpleGrades={simpleGradeData}
            initialSimpleSuneung={simpleSuneungData}
            onBack={() => setCurrentView('login')}
            onComplete={() => setCurrentView('report')}
          />
        )}



        {currentView === 'report' && currentUser && (
          <AnalysisReport
            studentId={currentUser.id || currentUser.username}
            studentName={currentUser.name}
            grades={studentGrades[currentUser.id || currentUser.username]}
            simpleGradeData={simpleGradeData}
            simpleSuneungData={simpleSuneungData}
            onBack={() => setCurrentView('grade')}
          />
        )}

        {currentView === 'print' && (
          <PrintReport
            studentId={printStudentId || undefined}
            studentName={printStudentName || undefined}
            gradeData={simpleGradeData}
            suneungData={simpleSuneungData}
            onBack={() => {
              if (isAdmin) {
                setCurrentView('admin');
              } else {
                setCurrentView('report');
              }
            }}
          />
        )}

      </div>
    </div>
  );
}

export default App;