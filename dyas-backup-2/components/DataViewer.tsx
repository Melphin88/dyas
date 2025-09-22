import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { ArrowLeft, Database, GraduationCap } from 'lucide-react';

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

export function DataViewer({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<UniversityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'susi' | 'jeongsi'>('susi');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<UniversityData[]>([]);
  const itemsPerPage = 100;

  // 데이터 로드 함수
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 전체 데이터 개수 확인
      const { count, error: countError } = await supabase
        .from(selectedType === 'susi' ? 'susi_university_data' : 'jeongsi_university_data')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('데이터 개수 확인 오류:', countError);
        setError(`데이터 개수 확인 실패: ${countError.message}`);
        return;
      }

      setTotalCount(count || 0);

      // 전체 데이터 로드 (페이지네이션 없이)
      const { data: result, error: dbError } = await supabase
        .from(selectedType === 'susi' ? 'susi_university_data' : 'jeongsi_university_data')
        .select('*')
        .order('university', { ascending: true })
        .order('department', { ascending: true });

      if (dbError) {
        console.error('데이터 로드 오류:', dbError);
        setError(`데이터 로드 실패: ${dbError.message}`);
        return;
      }

      setData(result || []);
      setFilteredData(result || []);
      setCurrentPage(1);
    } catch (err) {
      console.error('예상치 못한 데이터 로드 오류:', err);
      setError(`데이터 로드 중 예상치 못한 오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  useEffect(() => {
    if (data.length > 0) {
      const filtered = data.filter(item => 
        item.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.region.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, data]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, [selectedType]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-navy-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Button onClick={onBack} variant="outline" className="mb-4 border-navy-300 text-navy-700 hover:bg-navy-100">
          <ArrowLeft className="w-4 h-4 mr-2" /> 뒤로가기
        </Button>
        
        <div className="mb-6">
          <h1 className="text-3xl mb-2 text-navy-900 flex items-center">
            <Database className="w-8 h-8 mr-3 text-gold-600" />
            대학 입시 데이터 뷰어
          </h1>
          <p className="text-navy-600">
            Supabase에서 직접 로드한 대학 입시 데이터를 확인할 수 있습니다.
          </p>
        </div>

        {/* 데이터 유형 선택 */}
        <div className="mb-4">
          <Button
            onClick={() => setSelectedType('susi')}
            variant={selectedType === 'susi' ? 'default' : 'outline'}
            className="mr-2"
          >
            수시 데이터
          </Button>
          <Button
            onClick={() => setSelectedType('jeongsi')}
            variant={selectedType === 'jeongsi' ? 'default' : 'outline'}
          >
            정시 데이터
          </Button>
        </div>

        {/* 검색 기능 */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="대학명, 학과명, 지역으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-navy-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>

        {/* 통계 정보 */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-navy-700">
            <strong>총 {totalCount}개</strong> 데이터 중 <strong>{filteredData.length}개</strong> 표시 중 
            (페이지 {currentPage}/{totalPages})
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">오류:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* 데이터 테이블 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-navy-800 flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-gold-600" />
              {selectedType === 'susi' ? '수시' : '정시'} 데이터 ({filteredData.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-2"></div>
                데이터를 로드하는 중...
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-navy-500">
                {searchTerm ? '검색 결과가 없습니다.' : '조건에 맞는 데이터가 없습니다.'}
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
                      {selectedType === 'susi' ? (
                        <>
                          <TableHead>등급 50%</TableHead>
                          <TableHead>등급 70%</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>국어</TableHead>
                          <TableHead>수학</TableHead>
                          <TableHead>영어</TableHead>
                          <TableHead>탐구</TableHead>
                        </>
                      )}
                      <TableHead>모집인원</TableHead>
                      <TableHead>경쟁률</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm">{row.region}</TableCell>
                        <TableCell className="font-medium">{row.university}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.year}</TableCell>
                        {selectedType === 'susi' ? (
                          <>
                            <TableCell>{row.grade_50_cut > 0 ? `${row.grade_50_cut}등급` : '-'}</TableCell>
                            <TableCell>{row.grade_70_cut > 0 ? `${row.grade_70_cut}등급` : '-'}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>{row.korean > 0 ? row.korean : '-'}</TableCell>
                            <TableCell>{row.math > 0 ? row.math : '-'}</TableCell>
                            <TableCell>{row.english > 0 ? row.english : '-'}</TableCell>
                            <TableCell>{row.inquiry > 0 ? row.inquiry : '-'}</TableCell>
                          </>
                        )}
                        <TableCell>{row.recruitment_count}</TableCell>
                        <TableCell>{row.competition_rate}:1</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  이전
                </Button>
                <span className="text-sm text-navy-600">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  다음
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}