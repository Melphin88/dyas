import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface Account {
  id: string;
  name: string;
  password: string;
}

interface LoginFormProps {
  accounts: Account[];
  onLogin: (id: string, password: string, adminLogin?: boolean) => Promise<boolean>;
  onAdminLogin: () => void;
}

export function LoginForm({ accounts, onLogin, onAdminLogin }: LoginFormProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await onLogin(userId, password, false);
      if (!success) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminClick = () => {
    onAdminLogin();
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
                  placeholder="아이디를 입력하세요"
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
            
            <div className="mt-6 pt-4 border-t border-navy-200">
              <Button 
                onClick={handleAdminClick}
                variant="outline"
                className="w-full border-gold-300 text-gold-700 hover:bg-gold-50 hover:border-gold-400"
              >
                관리자 페이지
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 샘플 계정 안내 */}
        <Card className="bg-navy-50 border-navy-200">
          <CardContent className="pt-4">
            <h3 className="text-sm text-navy-800 mb-2">테스트 계정 (또는 관리자 페이지에서 계정 추가)</h3>
            <div className="space-y-1 text-xs text-navy-600">
              <div className="flex justify-between">
                <span>student1</span>
                <span>pass123</span>
              </div>
              <div className="flex justify-between">
                <span>student2</span>
                <span>mypass</span>
              </div>
              <div className="flex justify-between">
                <span>test</span>
                <span>1234</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}