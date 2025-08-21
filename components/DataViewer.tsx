import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Database, GraduationCap } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'susi' | 'jeongsi'>('susi');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // 데이터 로드 함수
  const loadData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(selectedType === 'susi' ? 'susi_university_data' : 'jeongsi_university_data')
        .select('*')
        .limit(100);

      // 필터 적용
      if (searchTerm) {
        query = query.or(`university.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`);
      }
      if (selectedRegion) {
        query = query.eq('region', selectedRegion);
      }
      if (selectedYear) {
        query = query.eq('year', parseInt(selectedYear));
      }

      const { data: result, error } = await query;

      if (error) {
        console.error('데이터 로드 오류:', error);
        return;
      }

      setData(result || []);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, [selectedType, selectedRegion, selectedYear]);

  // 검색 실행
  const handleSearch = () => {
    loadData();
  };

  return (
    <div className="min-h-screen bg-navy-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl mb-2 text-navy-900 flex items-center">
            <Database className="w-8 h-8 mr-3 text-gold-600" />
            대학 입시 데이터 뷰어
          </h1>
          <p className="text-navy-600">
            Supabase에서 직접 로드한 대학 입시 데이터를 확인할 수 있습니다.
          </p>
        </div>

        {/* 필터 섹션 */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-navy-800">데이터 필터</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-navy-700">입시 유형</Label>
                <Select value={selectedType} onValueChange={(value: 'susi' | 'jeongsi') => setSelectedType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="susi">수시</SelectItem>
                    <SelectItem value="jeongsi">정시</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-navy-700">검색어</Label>
                <div className="flex">
                  <Input
                    placeholder="대학명 또는 학과명"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-r-none"
                  />
                  <Button onClick={handleSearch} className="rounded-l-none">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-navy-700">지역</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 지역" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체 지역</SelectItem>
                    <SelectItem value="서울">서울</SelectItem>
                    <SelectItem value="경기">경기</SelectItem>
                    <SelectItem value="인천">인천</SelectItem>
                    <SelectItem value="강원">강원</SelectItem>
                    <SelectItem value="충북">충북</SelectItem>
                    <SelectItem value="충남">충남</SelectItem>
                    <SelectItem value="대전">대전</SelectItem>
                    <SelectItem value="세종">세종</SelectItem>
                    <SelectItem value="전북">전북</SelectItem>
                    <SelectItem value="전남">전남</SelectItem>
                    <SelectItem value="광주">광주</SelectItem>
                    <SelectItem value="경북">경북</SelectItem>
                    <SelectItem value="경남">경남</SelectItem>
                    <SelectItem value="대구">대구</SelectItem>
                    <SelectItem value="울산">울산</SelectItem>
                    <SelectItem value="부산">부산</SelectItem>
                    <SelectItem value="제주">제주</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-navy-700">연도</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 연도" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체 연도</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={loadData} className="w-full bg-gold-600 hover:bg-gold-700">
                  새로고침
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 데이터 테이블 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-navy-800 flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-gold-600" />
              {selectedType === 'susi' ? '수시' : '정시'} 데이터 ({data.length}개)
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
                조건에 맞는 데이터가 없습니다.
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
                    {data.map((row) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}