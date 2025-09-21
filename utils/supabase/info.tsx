// Supabase 설정 정보

// 개발 모드 기본값
const DEVELOPMENT_PROJECT_ID = 'development-project';
const DEVELOPMENT_ANON_KEY = 'development-anon-key';

// 환경변수에서 값 가져오기 (Vite 방식)
function getEnvVar(name: string): string {
  // Vite에서는 import.meta.env를 사용
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name] || '';
  }
  
  return '';
}

// Supabase 설정 값들
export const projectId = getEnvVar('VITE_SUPABASE_PROJECT_ID') || DEVELOPMENT_PROJECT_ID;
export const publicAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || DEVELOPMENT_ANON_KEY;

// 설정 상태 확인 함수들
export const isSupabaseConfigured = (): boolean => {
  return projectId !== DEVELOPMENT_PROJECT_ID && 
         publicAnonKey !== DEVELOPMENT_ANON_KEY &&
         projectId.trim().length > 0 &&
         publicAnonKey.trim().length > 0 &&
         !projectId.includes('undefined') &&
         !publicAnonKey.includes('undefined');
};

export const isDevelopmentMode = (): boolean => {
  const isConfigured = isSupabaseConfigured();
  
  // 디버깅용 로그 (한 번만 출력)
  if (typeof window !== 'undefined' && !(window as any).__dev_mode_logged__) {
    console.log('🔍 개발 모드 체크:', {
      projectId: projectId.substring(0, 20) + '...',
      publicAnonKey: publicAnonKey.substring(0, 20) + '...',
      isConfigured,
      finalIsDevelopmentMode: !isConfigured
    });
    (window as any).__dev_mode_logged__ = true;
  }
  
  return !isConfigured;
};

// 개발 정보 출력 (초기화 시에만)
if (typeof console !== 'undefined') {
  const configured = isSupabaseConfigured();
  
  if (configured) {
    console.log('✅ Supabase 환경 설정 완료');
    console.log(`🌐 Project ID: ${projectId.substring(0, 8)}...`);
    console.log(`🔑 Anon Key: ${publicAnonKey.substring(0, 20)}...`);
  } else {
    console.log('⚠️ Supabase 개발 모드 실행 중');
    console.log('📋 로컬 스토리지 기반 데이터 사용');
    console.log('💡 실제 배포를 위해서는 환경변수 설정 필요:');
    console.log('   - VITE_SUPABASE_PROJECT_ID');
    console.log('   - VITE_SUPABASE_ANON_KEY');
    console.log('현재 값들:', {
      projectId,
      publicAnonKey,
      envProjectId: getEnvVar('VITE_SUPABASE_PROJECT_ID'),
      envAnonKey: getEnvVar('VITE_SUPABASE_ANON_KEY')
    });
  }
}