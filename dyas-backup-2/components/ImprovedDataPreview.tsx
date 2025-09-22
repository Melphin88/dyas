import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImprovedDataPreviewProps {
  data: any[];
  headers: string[];
  totalCount: number;
  type: 'susi' | 'jeongsi';
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function ImprovedDataPreview({
  data,
  headers,
  totalCount,
  type,
  onSort,
  onPageChange,
  currentPage,
  totalPages,
  sortBy,
  sortOrder
}: ImprovedDataPreviewProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-navy-500">
        데이터가 없습니다. 파일을 선택해주세요.
      </div>
    );
  }

  // 불필요한 컬럼들 제거
  const filteredHeaders = headers.filter(header => 
    !['id', 'file_id', 'created_at'].includes(header)
  );

  // 한글 헤더명 매핑
  const getKoreanHeader = (header: string) => {
    const headerMap: { [key: string]: string } = {
      'region': '지역',
      'university': '대학',
      'category': '계열',
      'highschool_type': '고교유형',
      'admission_type': '전형',
      'year': '연도',
      'department': '학과',
      'perfect_score': '만점',
      'convert_50_cut': '50% 컷',
      'convert_70_cut': '70% 컷',
      'grade_50_cut': '50% 등급',
      'grade_70_cut': '70% 등급',
      'recruitment_count': '모집인원',
      'competition_rate': '경쟁률',
      'additional_pass': '추가합격',
      'total_apply': '지원자수',
      'pass_num': '합격자수',
      'real_competition_rate': '실경쟁률',
      'korean': '국어',
      'math': '수학',
      'inquiry': '탐구',
      'average': '평균',
      'english': '영어'
    };
    return headerMap[header] || header;
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-navy-800 flex items-center">
          📊 {type === 'susi' ? '수시' : '정시'} 데이터 미리보기
        </CardTitle>
        <div className="text-sm text-navy-600">
          <strong>총 {totalCount.toLocaleString()}개</strong> 데이터 중 <strong>{data.length}개</strong> 표시 중
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {filteredHeaders.map((header, index) => (
                  <TableHead 
                    key={index} 
                    className="cursor-pointer hover:bg-gray-100 text-xs font-medium whitespace-nowrap"
                    onClick={() => onSort(header)}
                  >
                    <div className="flex items-center gap-2">
                      {getKoreanHeader(header)}
                      {getSortIcon(header)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  {filteredHeaders.map((header, colIndex) => (
                    <TableCell key={colIndex} className="text-xs whitespace-nowrap">
                      {row[header] || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              이전
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
                return (
                  <Button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              다음
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* 페이지 정보 */}
        <div className="text-center mt-4 text-sm text-navy-600">
          페이지 {currentPage} / {totalPages} 
          (총 {Math.ceil(totalCount / 100)}개 페이지)
        </div>
      </CardContent>
    </Card>
  );
}