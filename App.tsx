import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey, isSupabaseConfigured, isDevelopmentMode } from './utils/supabase/info';
import { LoginForm } from './components/LoginForm';
import { AdminPanel } from './components/AdminPanel';
import { GradeInput } from './components/GradeInput';
import { SuneungInput } from './components/SuneungInput';
import { UniversityRecommendations } from './components/UniversityRecommendations';
import { AnalysisReport } from './components/AnalysisReport';
import { PrintReport } from './components/PrintReport';
import { SimpleGradeData, SimpleSuneungData } from './types/university';

// Supabase 클라이언트 (안전한 생성)
let supabase: any = null;

try {
  if (isSupabaseConfigured()) {
    supabase = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );
    console.log('✅ Supabase 클라이언트 초기화 완료');
  } else {
    console.log('⚠️ Supabase 개발 모드 실행 중');
    console.log('📁 로컬 스토리지 기반으로 실행됩니다.');
  }
} catch (error) {
  console.error('Supabase 클라이언트 생성 오류:', error);
  console.log('💡 로컬 모드로 전환합니다.');
}

// 계정 정보 인터페이스
interface Account {
  id: string;
  name: string;
  password: string;
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
  const [currentView, setCurrentView] = useState<'login' | 'admin' | 'grade' | 'suneung' | 'recommendations' | 'report' | 'print'>('login');
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 계정 관리 (로컬 스토리지)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [studentGrades, setStudentGrades] = useState<{[key: string]: GradeData}>({});
  
  // 새로운 간단한 성적 데이터 (Supabase 연동)
  const [simpleGradeData, setSimpleGradeData] = useState<SimpleGradeData | null>(null);
  const [simpleSuneungData, setSimpleSuneungData] = useState<SimpleSuneungData | null>(null);
  
  // 인쇄 보고서용 상태
  const [printStudentId, setPrintStudentId] = useState<string | null>(null);
  const [printStudentName, setPrintStudentName] = useState<string | null>(null);
  
  // Supabase 인증 상태
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // 초기 로드
  useEffect(() => {
    loadAccounts();
    loadStudentGrades();
    loadLocalSimpleGrades(); // 로컬 간단 성적 로드 추가
    
    // 개발 모드가 아닐 때만 Supabase 연결 시도
    if (supabase && isSupabaseConfigured() && !isDevelopmentMode()) {
      console.log('🔄 Supabase 세션 확인 중...');
      checkSupabaseSession();
    } else if (isDevelopmentMode()) {
      console.log('📱 로컬 개발 모드로 초기화 완료');
    }
  }, []);

  // 로컬 저장된 간단 성적 로드
  const loadLocalSimpleGrades = () => {
    const savedGrades = localStorage.getItem('universityApp_simpleGrades');
    const savedSuneung = localStorage.getItem('universityApp_suneungData');
    
    if (savedGrades) {
      try {
        setSimpleGradeData(JSON.parse(savedGrades));
      } catch (error) {
        console.warn('저장된 간단 성적 로드 실패:', error);
      }
    }
    
    if (savedSuneung) {
      try {
        setSimpleSuneungData(JSON.parse(savedSuneung));
      } catch (error) {
        console.warn('저장된 수능 성적 로드 실패:', error);
      }
    }
  };

  // Supabase 세션 확인 (개발 모드에서는 호출하지 않음)
  const checkSupabaseSession = async () => {
    if (!supabase || isDevelopmentMode()) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSupabaseUser(session.user);
        setAccessToken(session.access_token);
        loadMyScores(session.access_token);
      }
    } catch (error) {
      console.log('세션 확인 오류:', error);
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

  // 로컬 스토리지에서 성적 로드
  const loadStudentGrades = () => {
    const saved = localStorage.getItem('universityApp_studentGrades');
    if (saved) {
      setStudentGrades(JSON.parse(saved));
    }
  };

  // Supabase에서 내 성적 로드 (개발 모드에서는 호출하지 않음)
  const loadMyScores = async (token: string) => {
    if (!supabase || isDevelopmentMode()) return;
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/my-scores`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (response.ok && result.scores?.scores) {
        const scores = result.scores.scores;
        
        // 간단한 내신 데이터 변환
        if (scores.내신등급) {
          setSimpleGradeData({
            korean: { '전체평균': scores.내신등급 },
            math: { '전체평균': scores.내신등급 },
            english: { '전체평균': scores.내신등급 },
            inquiry: { '전체평균': scores.내신등급 },
            specialtySubjects: scores.전문교과등급 ? { '전체평균': scores.전문교과등급 } : {}
          });
        }
        
        // 수능 데이터 변환
        if (scores.수능국어) {
          setSimpleSuneungData({
            korean: scores.수능국어,
            math: scores.수능수학,
            english: scores.수능영어,
            inquiry1: scores.수능탐구1 || 0,
            inquiry2: scores.수능탐구2 || 0,
            total_score: (scores.수능국어 + scores.수능수학 + scores.수능영어 + (scores.수능탐구1 || 0) + (scores.수능탐구2 || 0)) / 5
          });
        }
      }
    } catch (error) {
      console.log('내 성적 로드 오류:', error);
    }
  };

  // 로그인 처리
  const handleLogin = async (id: string, password: string, adminLogin: boolean = false) => {
    if (adminLogin) {
      setIsAdmin(true);
      setCurrentView('admin');
      return true;
    }

    const account = accounts.find(acc => acc.id === id && acc.password === password);
    if (account) {
      setCurrentUser(account);
      setIsAdmin(false);
      
      // Supabase 로그인 시도 (개발 모드가 아닐 때만)
      if (supabase && isSupabaseConfigured() && !isDevelopmentMode()) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: `${id}@university.app`, // 가상 이메일
            password: password
          });
          
          if (data.session) {
            setSupabaseUser(data.user);
            setAccessToken(data.session.access_token);
            loadMyScores(data.session.access_token);
          }
        } catch (error) {
          console.log('Supabase 로그인 선택사항 오류:', error);
        }
      }
      
      setCurrentView('grade');
      return true;
    }
    return false;
  };

  // 계정 추가
  const handleAddAccount = (account: Account) => {
    const newAccounts = [...accounts, account];
    setAccounts(newAccounts);
    localStorage.setItem('universityApp_accounts', JSON.stringify(newAccounts));
    
    // Supabase에 계정 생성 (개발 모드가 아닐 때만)
    if (supabase && isSupabaseConfigured() && !isDevelopmentMode()) {
      supabase.auth.admin.createUser({
        email: `${account.id}@university.app`,
        password: account.password,
        user_metadata: { name: account.name },
        email_confirm: true
      }).catch((error: any) => console.log('Supabase 계정 생성 선택사항 오류:', error));
    }
  };

  // 계정 삭제
  const handleDeleteAccount = (id: string) => {
    const newAccounts = accounts.filter(acc => acc.id !== id);
    setAccounts(newAccounts);
    localStorage.setItem('universityApp_accounts', JSON.stringify(newAccounts));
    
    const newGrades = { ...studentGrades };
    delete newGrades[id];
    setStudentGrades(newGrades);
    localStorage.setItem('universityApp_studentGrades', JSON.stringify(newGrades));
  };

  // 학생 성적 업데이트
  const handleUpdateStudentGrades = (studentId: string, grades: GradeData) => {
    const newGrades = { ...studentGrades, [studentId]: grades };
    setStudentGrades(newGrades);
    localStorage.setItem('universityApp_studentGrades', JSON.stringify(newGrades));
  };

  // 간단한 내신 성적 저장
  const handleSaveSimpleGrade = async (data: SimpleGradeData) => {
    setSimpleGradeData(data);
    
    // 항상 로컬 스토리지에 저장
    localStorage.setItem('universityApp_simpleGrades', JSON.stringify(data));
    
    // Supabase에 저장 (개발 모드가 아니고 설정된 경우에만)
    if (accessToken && supabase && isSupabaseConfigured() && !isDevelopmentMode()) {
      try {
        // 전체 평균 계산
        const allGrades: number[] = [];
        Object.values(data).forEach((subjectData) => {
          Object.values(subjectData).forEach(grade => {
            if (typeof grade === 'number' && grade > 0) {
              allGrades.push(grade);
            }
          });
        });
        const average = allGrades.length > 0 ? allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length : 0;
        
        const specialtyAverage = Object.values(data.specialtySubjects || {}).filter(g => g > 0);
        const specialtyGrade = specialtyAverage.length > 0 ? specialtyAverage.reduce((sum, grade) => sum + grade, 0) / specialtyAverage.length : null;
        
        const scores = {
          내신등급: parseFloat(average.toFixed(2)),
          전문교과등급: specialtyGrade ? parseFloat(specialtyGrade.toFixed(2)) : null
        };

        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/save-scores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ scores })
        });
      } catch (error) {
        console.log('성적 저장 오류:', error);
      }
    }
  };

  // 간단한 수능 성적 저장
  const handleSaveSimpleSuneung = async (data: SimpleSuneungData) => {
    setSimpleSuneungData(data);
    
    // 항상 로컬 스토리지에 저장
    localStorage.setItem('universityApp_suneungData', JSON.stringify(data));
    
    // Supabase에 저장 (개발 모드가 아니고 설정된 경우에만)
    if (accessToken && supabase && isSupabaseConfigured() && !isDevelopmentMode()) {
      try {
        const scores = {
          수능국어: data.korean,
          수능수학: data.math,
          수능영어: data.english,
          수능탐구1: data.inquiry1 || null,
          수능탐구2: data.inquiry2 || null
        };

        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/save-scores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ scores })
        });
      } catch (error) {
        console.log('수능 성적 저장 오류:', error);
      }
    }
  };

  // 인쇄 보고서 보기
  const handleViewPrintReport = (studentId?: string) => {
    if (studentId) {
      // 관리자가 특정 학생의 보고서를 보는 경우
      const account = accounts.find(acc => acc.id === studentId);
      setPrintStudentId(studentId);
      setPrintStudentName(account?.name || '학생');
      // TODO: 해당 학생의 성적 데이터를 로드해야 함
    } else {
      // 현재 로그인한 사용자의 보고서를 보는 경우
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
    
    // Supabase 로그아웃 (개발 모드가 아닐 때만)
    if (supabase && isSupabaseConfigured() && !isDevelopmentMode()) {
      await supabase.auth.signOut();
    }
    setSupabaseUser(null);
    setAccessToken(null);
  };

  // 개발 모드 알림 컴포넌트 (개선됨)
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
    if (currentView === 'login' || currentView === 'admin') return null;

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
                로���아웃
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
              내신 성적 입력
            </button>
            <button
              onClick={() => setCurrentView('suneung')}
              className={`pb-2 border-b-2 transition-colors ${
                currentView === 'suneung'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-navy-600 hover:text-navy-800'
              }`}
            >
              수능 성적 입력
            </button>
            <button
              onClick={() => setCurrentView('recommendations')}
              className={`pb-2 border-b-2 transition-colors ${
                currentView === 'recommendations'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-navy-600 hover:text-navy-800'
              }`}
            >
              대학 추천
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
              accounts={accounts}
              onLogin={handleLogin}
              onAdminLogin={() => {
                setIsAdmin(true);
                setCurrentView('admin');
              }}
            />
          </div>
        )}

        {currentView === 'admin' && (
          <div>
            <DevelopmentModeAlert />
            <AdminPanel
              accounts={accounts}
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
            studentId={currentUser.id}
            studentName={currentUser.name}
            initialGrades={studentGrades[currentUser.id]}
            onSubmit={(grades) => {
              handleUpdateStudentGrades(currentUser.id, grades);
              setCurrentView('recommendations');
            }}
            onSaveSimpleGrade={handleSaveSimpleGrade}
            initialSimpleGrades={simpleGradeData}
            onBack={() => setCurrentView('login')}
          />
        )}

        {currentView === 'suneung' && (
          <SuneungInput
            initialData={simpleSuneungData}
            onSave={handleSaveSimpleSuneung}
            onBack={() => setCurrentView('grade')}
            onViewResults={() => setCurrentView('recommendations')}
          />
        )}

        {currentView === 'recommendations' && (
          <UniversityRecommendations
            gradeData={simpleGradeData}
            suneungData={simpleSuneungData}
            onBack={() => setCurrentView('suneung')}
            onViewReport={() => setCurrentView('report')}
            onViewPrintReport={() => handleViewPrintReport()}
          />
        )}

        {currentView === 'report' && currentUser && (
          <AnalysisReport
            studentId={currentUser.id}
            studentName={currentUser.name}
            grades={studentGrades[currentUser.id]}
            simpleGradeData={simpleGradeData}
            simpleSuneungData={simpleSuneungData}
            onBack={() => setCurrentView('recommendations')}
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
                setCurrentView('recommendations');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;