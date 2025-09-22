import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { supabase } from '../utils/supabase/client';

interface LoginFormProps {
  onLogin: (account: any) => void;
  onAdminLogin: () => void;
  onShowRegister: () => void;
}

export function LoginForm({ onLogin, onAdminLogin, onShowRegister }: LoginFormProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Supabase에서 계정 조회
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('username', userId)
        .eq('password', password) // 실제 프로덕션에서는 해시 비교 필요
        .single();

      if (error || !data) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      // 로그인 성공
      onLogin(data);
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminClick = () => {
    onAdminLogin();
  };

  const handleRegisterClick = () => {
    console.log('회원가입 버튼 클릭됨');
    onShowRegister();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 로고/헤더 영역 */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-navy-800 to-navy-900 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl text-navy-900 mb-2">대학 입시 분석 시스템</h1>
          <p className="text-navy-600">로그인하여 맞춤형 대학 분석을 받아보세요</p>
          {/* NEW VERSION INDICATOR */}
          <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mt-2">
            ✨ NEW: 회원가입 기능 추가됨
          </div>
        </div>

        {/* 로그인 카드 */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center text-navy-900">로그인</CardTitle>
            <p className="text-center text-navy-600 text-sm">
              학생 계정으로 로그인하세요
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-navy-700">아이디</Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="휴대전화번호 또는 이메일"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-navy-700">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-navy-800 hover:bg-navy-900 text-white"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
            
            {/* 회원가입 및 관리자 버튼 섹션 */}
            <div className="mt-6 pt-4 border-t border-navy-200">
              <div className="space-y-3">
                {/* 회원가입 버튼 - 빨간색으로 강조 */}
                <Button 
                  onClick={handleRegisterClick}
                  variant="outline"
                  className="w-full border-3 border-red-500 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-600 font-bold text-lg py-3"
                >
                  🆕 새 계정 회원가입
                </Button>
                
                {/* 관리자 페이지 버튼 */}
                <Button 
                  onClick={handleAdminClick}
                  variant="outline"
                  className="w-full border-navy-300 text-navy-700 hover:bg-navy-50"
                >
                  관리자 페이지
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 안내 메시지 */}
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <h3 className="text-sm text-red-800 mb-2 font-bold">🎉 새로운 기능!</h3>
            <p className="text-xs text-red-700">
              <strong>회원가입 버튼</strong>을 클릭하여 새 계정을 생성할 수 있습니다!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}