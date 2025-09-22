import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface RegisterFormProps {
  onBack: () => void;
  onRegisterSuccess: () => void;
}

export function RegisterForm({ onBack, onRegisterSuccess }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.username || !formData.password || !formData.name) {
      setError('모든 필드를 입력해주세요.');
      return false;
    }

    // 휴대전화번호 형식 검증 (하이픈 없이 11자리 숫자만)
    const phoneRegex = /^01[0-9]{9}$/;
    if (!phoneRegex.test(formData.username)) {
      setError('아이디는 11자리 휴대전화번호로 입력해주세요. (예: 01012345678)');
      return false;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Supabase에 계정 생성
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          username: formData.username,
          password: formData.password, // 실제 프로덕션에서는 해시화 필요
          name: formData.name,
          is_admin: false
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          setError('이미 존재하는 아이디입니다.');
        } else {
          setError(`회원가입 중 오류가 발생했습니다: ${error.message}`);
        }
        return;
      }

      console.log('회원가입 성공:', data);
      onRegisterSuccess();
    } catch (error) {
      console.error('회원가입 오류:', error);
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gold-50 to-gold-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-navy-800 to-navy-900 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle className="text-2xl text-navy-800">회원가입</CardTitle>
          <p className="text-navy-600 mt-2">새 계정을 생성하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-navy-700">아이디 (휴대전화번호)</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="01012345678"
                value={formData.username}
                onChange={handleInputChange}
                className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-navy-700">이름</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="이름을 입력하세요"
                value={formData.name}
                onChange={handleInputChange}
                className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-navy-700">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="6자 이상"
                value={formData.password}
                onChange={handleInputChange}
                className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-navy-700">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                required
              />
            </div>

            <div className="flex space-x-2">
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1 bg-gold-600 hover:bg-gold-700"
              >
                {loading ? '가입 중...' : '회원가입'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onBack}
                className="flex-1 border-navy-300 text-navy-700 hover:bg-navy-50"
              >
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}