import React, { useState } from 'react';
import { projectId, publicAnonKey, isDevelopmentMode } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, Database } from 'lucide-react';

interface SupabaseUploadProps {
  onUploadSuccess: () => void;
}

interface UniversityData {
  university: string;
  department: string;
  admissionType: string;
  군: string;
  내신등급: number;
  수능등급: number;
  합격률: number;
}

export function SupabaseUpload({ onUploadSuccess }: SupabaseUploadProps) {
  const [csvContent, setCsvContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCsvUpload = async () => {
    if (!csvContent.trim()) {
      setMessage('CSV 내용을 입력해주세요');
      return;
    }

    // 개발 모드 체크
    if (isDevelopmentMode()) {
      setMessage('⚠️ 개발 모드에서는 업로드가 지원되지 않습니다. Supabase 환경변수를 설정해주세요.');
      return;
    }

    setLoading(true);
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // 예상 헤더 확인
      const expectedHeaders = ['university', 'department', 'admissionType', '군', '내신등급', '수능등급', '합격률'];
      const hasValidHeaders = expectedHeaders.every(header => 
        headers.some(h => h.includes(header) || h.includes(header.replace('admissionType', '전형')) || h.includes('대학명') || h.includes('학과'))
      );

      if (!hasValidHeaders) {
        setMessage('CSV 헤더를 확인해주세요. 예시: university,department,admissionType,군,내신등급,수능등급,합격률');
        setLoading(false);
        return;
      }

      const csvData: UniversityData[] = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          university: values[0] || '',
          department: values[1] || '',
          admissionType: values[2] || '',
          군: values[3] || '',
          내신등급: parseFloat(values[4]) || 0,
          수능등급: parseFloat(values[5]) || 0,
          합격률: parseFloat(values[6]) || 0
        };
      }).filter(data => data.university && data.department);

      if (csvData.length === 0) {
        setMessage('유효한 데이터가 없습니다.');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/upload-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ csvData })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`✅ ${csvData.length}개의 대학 데이터가 성공적으로 업로드되었습니다!`);
        setCsvContent('');
        onUploadSuccess();
      } else {
        setMessage(`❌ 업로드 오류: ${result.error || 'CSV 업로드에 실패했습니다'}`);
      }
    } catch (error) {
      console.log('CSV 업로드 오류:', error);
      setMessage('❌ CSV 업로드 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const sampleCsv = `university,department,admissionType,군,내신등급,수능등급,합격률
서울대학교,컴퓨터공학부,수시,,1.2,1.5,85
연세대학교,경영학과,정시,가,1.8,2.1,75
고려대학교,의과대학,정시,나,1.1,1.3,92
성균관대학교,법학과,수시,,2.1,2.5,68`;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-navy-800">
          <Database className="w-5 h-5" />
          대학 데이터 CSV 업로드 (Supabase)
        </CardTitle>
        <CardDescription className="text-navy-600">
          {isDevelopmentMode() ? 
            '⚠️ 개발 모드에서는 업로드가 제한됩니다. Supabase 환경변수를 설정해주세요.' :
            'CSV 형식의 대학 데이터를 Supabase 서버에 업로드합니다. 모든 사용자가 동일한 데이터를 확인할 수 있습니다.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert className={message.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription className={message.includes('✅') ? 'text-green-700' : 'text-red-700'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-2">CSV 형식 예시</label>
          <pre className="bg-navy-50 p-3 rounded-md text-xs text-navy-700 overflow-x-auto">
            {sampleCsv}
          </pre>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-2">CSV 데이터 입력</label>
          <textarea
            className="w-full h-64 p-3 border border-navy-200 rounded-md focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm font-mono"
            placeholder="CSV 데이터를 여기에 붙여넣기하세요..."
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <Button 
            onClick={handleCsvUpload}
            disabled={loading}
            className="flex-1 bg-gold-600 hover:bg-gold-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? '업로드 중...' : 'Supabase에 업로드'}
          </Button>
          <Button 
            onClick={() => setCsvContent(sampleCsv)}
            variant="outline"
            className="border-navy-300 text-navy-700 hover:bg-navy-50"
          >
            샘플 데이터 로드
          </Button>
        </div>

        <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
          <h4 className="font-medium text-gold-900 mb-2">📋 CSV 형식 가이드</h4>
          <ul className="text-sm text-gold-800 space-y-1">
            <li>• <strong>필수 컬럼:</strong> university, department, admissionType, 군, 내신등급, 수능등급, 합격률</li>
            <li>• <strong>수시:</strong> '군' 컬럼은 비워두세요</li>
            <li>• <strong>정시:</strong> '군' 컬럼에 '가', '나', '다' 중 하나를 입력하세요</li>
            <li>• <strong>등급:</strong> 1.0~9.0 사이의 숫자로 입력하세요</li>
            <li>• <strong>합격률:</strong> 0~100 사이의 숫자로 입력하세요</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}