import React, { useState } from 'react';
import { projectId, publicAnonKey, isDevelopmentMode } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, Database } from 'lucide-react';

interface SupabaseUploadProps {
  onUploadSuccess: () => void;
}

interface UniversityData {
  region: string;
  university: string;
  category: string;
  highschool_type: string;
  admission_type: string;
  year: number;
  department: string;
  perfect_score: number;
  convert_50_cut: number;
  convert_70_cut: number;
  grade_50_cut: number;
  grade_70_cut: number;
  recruitment_count: number;
  competition_rate: number;
  additional_pass: number;
  total_apply: number;
  pass_num: number;
  real_competition_rate: number;
}

export function SupabaseUpload({ onUploadSuccess }: SupabaseUploadProps) {
  const [csvContent, setCsvContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dataType, setDataType] = useState<'susi' | 'jeongsi'>('susi');

  const handleCsvUpload = async () => {
    if (!csvContent.trim()) {
      setMessage('CSV 내용을 입력해주세요');
      return;
    }

    // 개발 모드 체크
    if (isDevelopmentMode()) {
      setMessage('개발 모드에서는 업로드가 제한됩니다. Supabase 설정을 확인해주세요.');
      return;
    }

    setLoading(true);
    setMessage('업로드 시작...');
    
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      // 헤더 검증 - 실제 CSV 형식에 맞게 수정
      const expectedHeaders = ['region', 'university', 'category', 'highschool_type', 'admission_type', 'year', 'department'];
      const hasValidHeaders = expectedHeaders.every(header =>
        headers.includes(header)
      );

      if (!hasValidHeaders) {
        setMessage('CSV 헤더를 확인해주세요. 예상 헤더: region,university,category,highschool_type,admission_type,year,department,...');
        setLoading(false);
        return;
      }

      const csvData: UniversityData[] = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          region: values[0] || '',
          university: values[1] || '',
          category: values[2] || '',
          highschool_type: values[3] || '',
          admission_type: values[4] || '',
          year: parseInt(values[5]) || 0,
          department: values[6] || '',
          perfect_score: parseFloat(values[7]) || 0,
          convert_50_cut: parseFloat(values[8]) || 0,
          convert_70_cut: parseFloat(values[9]) || 0,
          grade_50_cut: parseFloat(values[10]) || 0,
          grade_70_cut: parseFloat(values[11]) || 0,
          recruitment_count: parseInt(values[12]) || 0,
          competition_rate: parseFloat(values[13]) || 0,
          additional_pass: parseInt(values[14]) || 0,
          total_apply: parseInt(values[15]) || 0,
          pass_num: parseInt(values[16]) || 0,
          real_competition_rate: parseFloat(values[17]) || 0
        };
      }).filter(data => data.university && data.department);

      if (csvData.length === 0) {
        setMessage('유효한 데이터가 없습니다.');
        setLoading(false);
        return;
      }

      console.log('업로드 시도:', {
        projectId,
        dataCount: csvData.length,
        dataType,
        supabaseUrl: supabase.supabaseUrl,
        supabaseKey: supabase.supabaseKey?.substring(0, 20) + '...'
      });

      setMessage('CSV 파일 메타데이터 생성 중...');

      // CSV 파일 메타데이터 먼저 생성
      const { data: fileData, error: fileError } = await supabase
        .from('csv_files')
        .insert({
          filename: `${dataType}_data_${new Date().toISOString()}.csv`,
          data_count: csvData.length,
          type: dataType,
          is_active: true
        })
        .select()
        .single();

      if (fileError) {
        console.error('파일 메타데이터 생성 오류:', fileError);
        setMessage(`❌ 파일 메타데이터 생성 오류: ${fileError.message}`);
        setLoading(false);
        return;
      }

      console.log('파일 메타데이터 생성 성공:', fileData);

      setMessage('데이터베이스에 데이터 삽입 중...');

      // 데이터에 file_id 추가
      const dataWithFileId = csvData.map(item => ({
        ...item,
        file_id: fileData.id
      }));

      // 올바른 테이블에 데이터 삽입
      const tableName = dataType === 'susi' ? 'susi_university_data' : 'jeongsi_university_data';
      console.log('테이블명:', tableName);
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(dataWithFileId);

      console.log('Supabase 응답:', { data, error });

      if (error) {
        console.error('Supabase 오류:', error);
        setMessage(`❌ 데이터베이스 오류: ${error.message}`);
        setLoading(false);
        return;
      }

      console.log('업로드 성공:', data);

      setMessage(`✅ ${csvData.length}개의 ${dataType === 'susi' ? '수시' : '정시'} 데이터가 성공적으로 업로드되었습니다!`);
      setCsvContent('');
      onUploadSuccess();
    } catch (error) {
      console.error('CSV 업로드 오류:', error);
      setMessage(`❌ CSV 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const sampleCsv = `region,university,category,highschool_type,admission_type,year,department,perfect_score,convert_50_cut,convert_70_cut,grade_50_cut,grade_70_cut,recruitment_count,competition_rate,additional_pass,total_apply,pass_num,real_competition_rate
강원,국립강릉원주대,자연,종합,종합(해람인재),2023,화학신소재학과,1000,842.5,814.2,4.45,5.16,10,0.9,0,9,10,0.9
강원,국립강릉원주대,자연,교과,교과(지역),2022,화학신소재학과,1000,842.5,814.2,4.45,5.16,6,2.17,3,13.02,9,1.44667`;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          CSV 데이터 업로드
        </CardTitle>
        <CardDescription>
          CSV 파일 내용을 입력하여 Supabase 데이터베이스에 업로드합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="data-type" className="text-sm font-medium">
            데이터 타입
          </label>
          <select
            id="data-type"
            value={dataType}
            onChange={(e) => setDataType(e.target.value as 'susi' | 'jeongsi')}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="susi">수시 데이터</option>
            <option value="jeongsi">정시 데이터</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="csv-content" className="text-sm font-medium">
            CSV 내용
          </label>
          <textarea
            id="csv-content"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="CSV 내용을 여기에 붙여넣으세요..."
            className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none"
          />
        </div>

        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleCsvUpload}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {loading ? '업로드 중...' : '업로드'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setCsvContent(sampleCsv)}
            disabled={loading}
          >
            샘플 데이터
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          <p>필수 헤더: region,university,category,highschool_type,admission_type,year,department,...</p>
          <p>프로젝트 ID: {projectId}</p>
          <p>현재 선택: {dataType === 'susi' ? '수시 데이터' : '정시 데이터'}</p>
          <p>개발 모드: {isDevelopmentMode() ? '예' : '아니오'}</p>
        </div>
      </CardContent>
    </Card>
  );
}