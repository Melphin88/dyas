import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Database, GraduationCap, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface UniversityData {
  id: string;
  region: string;
  university: string;
  department: string;
  year: number;
  grade_50_cut?: number;
  grade_70_cut?: number;
  korean?: number;
  math?: number;
  english?: number;
  inquiry?: number;
  recruitment_count: number;
  competition_rate: number;
  created_at: string;
}

export function DataViewer() {
  const [data, setData] = useState<UniversityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드 함수
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Supabase 클라이언트 동적 import
      const { createClient } = await import('@supabase/supabase-js');
      
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!projectId || !anonKey) {
        throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
      }
      
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        anonKey
      );

      const { data: result, error: supabaseError } = await supabase
        .from('susi_university_data')
        .select('*')
        .limit(20);

      if (supabaseError) {
        console.error('Supabase 에러:', supabaseError);
        throw new Error(`데이터 로드 실패: ${supabaseError.message}`);
      }

      setData(result || []);
    } catch (err) {
      console.error('데이터 로드 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  // 뒤로가기 함수
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-navy-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 뒤로가기 버튼 */}
        <div className="mb-4">
          <Button 
            onClick={handleBack}
            variant="outline" 
            className="border-navy-300 text-navy-700 hover:bg-navy-100"
          >
            ← 뒤로가기
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl mb-2 text-navy-900 flex items-center">
            <Database className="w-8 h-8 mr-3 text-gold-600" />
            대학 입시 데이터 뷰어
          </h1>
          <p className="text-navy-600">
            Supabase에서 직접 로드한 대학 입시 데이터를 확인할 수 있습니다.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 새로고침 버튼 */}
        <div className="mb-6">
          <Button onClick={loadData} className="bg-gold-600 hover:bg-gold-700">
            데이터 새로고침
          </Button>
        </div>

        {/* 데이터 테이블 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-navy-800 flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-gold-600" />
              수시 데이터 ({data.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-2"></div>
                데이터를 로드하는 중...
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-8 text-navy-500">
                데이터가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>지역</TableHead>
                      <TableHead>대학</TableHead>
                      <TableHead>학과</TableHead>
                      <TableHead>연도</TableHead>
                      <TableHead>등급 50%</TableHead>
                      <TableHead>등급 70%</TableHead>
                      <TableHead>모집인원</TableHead>
                      <TableHead>경쟁률</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm">{row.region}</TableCell>
                        <TableCell className="font-medium">{row.university}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.year}</TableCell>
                        <TableCell>{row.grade_50_cut > 0 ? `${row.grade_50_cut}등급` : '-'}</TableCell>
                        <TableCell>{row.grade_70_cut > 0 ? `${row.grade_70_cut}등급` : '-'}</TableCell>
                        <TableCell>{row.recruitment_count}</TableCell>
                        <TableCell>{row.competition_rate}:1</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}