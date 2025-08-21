import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  SimpleGradeData,
  SimpleSuneungData,
  SusiUniversityData,
  JeongsiUniversityData,
  RecommendedSusiUniversity,
  RecommendedJeongsiUniversity
} from '../types/university';
import {
  calculateGradeAverage,
  calculateSuneungAverage,
  calculateSusiProbability,
  calculateJeongsiProbability,
  getSuccessGrade,
  groupPastData,
  getProbabilityText
} from '../utils/universityCalculations';

interface PrintReportProps {
  studentId?: string;
  studentName?: string;
  gradeData?: SimpleGradeData | null;
  suneungData?: SimpleSuneungData | null;
  onBack?: () => void;
}

export function PrintReport({ studentId, studentName, gradeData, suneungData, onBack }: PrintReportProps) {
  const [recommendations, setRecommendations] = useState<{
    susi: RecommendedSusiUniversity[];
    jeongsi_ga: RecommendedJeongsiUniversity[];
    jeongsi_na: RecommendedJeongsiUniversity[];
    jeongsi_da: RecommendedJeongsiUniversity[];
  }>({
    susi: [],
    jeongsi_ga: [],
    jeongsi_na: [],
    jeongsi_da: []
  });
  const [loading, setLoading] = useState(false);
  const [susiData, setSusiData] = useState<SusiUniversityData[]>([]);
  const [jeongsiData, setJeongsiData] = useState<JeongsiUniversityData[]>([]);

  useEffect(() => {
    loadUniversityData();
  }, []);

  useEffect(() => {
    if (susiData.length > 0 || jeongsiData.length > 0) {
      generateRecommendations();
    }
  }, [gradeData, suneungData, susiData, jeongsiData]);

  // 대학 데이터 로드
  const loadUniversityData = async () => {
    try {
      setLoading(true);
      
      const susiResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/university-data/susi`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      const jeongsiResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/university-data/jeongsi`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      const susiResult = await susiResponse.json();
      const jeongsiResult = await jeongsiResponse.json();
      
      if (susiResponse.ok) setSusiData(susiResult.data || []);
      if (jeongsiResponse.ok) setJeongsiData(jeongsiResult.data || []);
      
    } catch (error) {
      console.error('대학 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = () => {
    if (susiData.length === 0 && jeongsiData.length === 0) {
      setRecommendations({ susi: [], jeongsi_ga: [], jeongsi_na: [], jeongsi_da: [] });
      return;
    }

    setLoading(true);

    const gradeAvg = gradeData ? calculateGradeAverage(gradeData) : 0;
    const suneungAvg = suneungData ? calculateSuneungAverage(suneungData) : 0;

    // 수시 추천
    const susiRecommendations = susiData
      .filter(uni => gradeAvg > 0 && (uni.grade_70_cut > 0 || uni.grade_50_cut > 0))
      .map(uni => {
        const probability = calculateSusiProbability(uni, gradeAvg);
        return {
          ...uni,
          예상합격률: Math.round(probability),
          합격가능성등급: getSuccessGrade(probability),
          과거데이터: groupPastData(susiData, uni.university, uni.department)
        } as RecommendedSusiUniversity;
      })
      .sort((a, b) => {
        const gradeOrder = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
        if (gradeOrder[a.합격가능성등급] !== gradeOrder[b.합격가능성등급]) {
          return gradeOrder[b.합격가능성등급] - gradeOrder[a.합격가능성등급];
        }
        return b.예상합격률 - a.예상합격률;
      })
      .slice(0, 20);

    // 정시 추천
    const jeongsiRecommendations = jeongsiData
      .filter(uni => suneungAvg > 0 && (uni.grade_70_cut > 0 || uni.grade_50_cut > 0))
      .map(uni => {
        const probability = calculateJeongsiProbability(uni, suneungAvg);
        return {
          ...uni,
          예상합격률: Math.round(probability),
          합격가능성등급: getSuccessGrade(probability),
          과거데이터: groupPastData(jeongsiData, uni.university, uni.department)
        } as RecommendedJeongsiUniversity;
      });

    const sortByGradeAndProbability = (a: RecommendedJeongsiUniversity, b: RecommendedJeongsiUniversity) => {
      const gradeOrder = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
      if (gradeOrder[a.합격가능성등급] !== gradeOrder[b.합격가능성등급]) {
        return gradeOrder[b.합격가능성등급] - gradeOrder[a.합격가능성등급];
      }
      return b.예상합격률 - a.예상합격률;
    };

    const jeongsiGa = jeongsiRecommendations
      .filter(uni => uni.admission_type.includes('가') || uni.admission_type.includes('정시(가)'))
      .sort(sortByGradeAndProbability)
      .slice(0, 5);

    const jeongsiNa = jeongsiRecommendations
      .filter(uni => uni.admission_type.includes('나') || uni.admission_type.includes('정시(나)'))
      .sort(sortByGradeAndProbability)
      .slice(0, 5);

    const jeongsiDa = jeongsiRecommendations
      .filter(uni => uni.admission_type.includes('다') || uni.admission_type.includes('정시(다)'))
      .sort(sortByGradeAndProbability)
      .slice(0, 5);

    setRecommendations({
      susi: susiRecommendations,
      jeongsi_ga: jeongsiGa,
      jeongsi_na: jeongsiNa,
      jeongsi_da: jeongsiDa
    });

    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600"></div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-white">
      {/* 인쇄 버튼 - 인쇄 시 숨김 */}
      <div className="print:hidden bg-navy-50 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          {onBack && (
            <Button onClick={onBack} variant="outline" className="border-navy-300 text-navy-700 hover:bg-navy-100">
              ← 이전으로
            </Button>
          )}
          <Button onClick={handlePrint} className="bg-navy-600 hover:bg-navy-700 text-white">
            🖨️ 인쇄하기
          </Button>
        </div>
      </div>

      {/* A4 인쇄 영역 */}
      <div className="max-w-4xl mx-auto p-8 bg-white print:p-6 print:max-w-none">
        {/* 헤더 */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-2xl print:text-xl font-bold text-navy-900 mb-2">대학 입시 성적 분석 보고서</h1>
          <div className="text-navy-600 print:text-sm">
            <p>학생명: {studentName || '학생'} | 분석일: {currentDate}</p>
          </div>
        </div>

        {/* 성적 요약 */}
        <div className="mb-8 print:mb-6">
          <h2 className="text-lg print:text-base font-semibold text-navy-800 border-b-2 border-navy-200 pb-2 mb-4">성적 요약</h2>
          <div className="grid grid-cols-2 gap-4 print:gap-2">
            {gradeData && (
              <div className="bg-navy-50 print:bg-gray-50 p-4 print:p-3 rounded">
                <h3 className="font-medium text-navy-700 mb-2">내신 성적</h3>
                <p className="text-lg print:text-base font-bold text-navy-900">
                  평균 {calculateGradeAverage(gradeData).toFixed(2)}등급
                </p>
              </div>
            )}
            {suneungData && (
              <div className="bg-navy-50 print:bg-gray-50 p-4 print:p-3 rounded">
                <h3 className="font-medium text-navy-700 mb-2">수능 성적</h3>
                <p className="text-lg print:text-base font-bold text-navy-900">
                  평균 {calculateSuneungAverage(suneungData).toFixed(2)}등급
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 수시 추천 대학 */}
        {gradeData && recommendations.susi.length > 0 && (
          <div className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-lg print:text-base font-semibold text-navy-800 border-b-2 border-navy-200 pb-2 mb-4">
              수시 추천 대학 (상위 {Math.min(recommendations.susi.length, 10)}개)
            </h2>
            <Table className="print:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="print:py-2">대학</TableHead>
                  <TableHead className="print:py-2">학과</TableHead>
                  <TableHead className="print:py-2">전형</TableHead>
                  <TableHead className="print:py-2">등급</TableHead>
                  <TableHead className="print:py-2">합격률</TableHead>
                  <TableHead className="print:py-2">모집인원</TableHead>
                  <TableHead className="print:py-2">경쟁률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.susi.slice(0, 10).map((uni, index) => (
                  <TableRow key={index}>
                    <TableCell className="print:py-1 font-medium">{uni.university}</TableCell>
                    <TableCell className="print:py-1">{uni.department}</TableCell>
                    <TableCell className="print:py-1 text-xs print:text-xs">{uni.admission_type}</TableCell>
                    <TableCell className="print:py-1">
                      <span className={`px-2 py-1 print:px-1 print:py-0 rounded text-xs print:text-xs font-medium ${
                        uni.합격가능성등급 === 'S' ? 'bg-emerald-100 text-emerald-800' :
                        uni.합격가능성등급 === 'A' ? 'bg-green-100 text-green-800' :
                        uni.합격가능성등급 === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getProbabilityText(uni.합격가능성등급)}
                      </span>
                    </TableCell>
                    <TableCell className="print:py-1 font-medium">{uni.예상합격률}%</TableCell>
                    <TableCell className="print:py-1">{uni.recruitment_count}명</TableCell>
                    <TableCell className="print:py-1">{uni.competition_rate}:1</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 정시 추천 대학 */}
        {suneungData && (
          <div className="space-y-6 print:space-y-4">
            {[
              { key: 'jeongsi_ga', name: '가군', data: recommendations.jeongsi_ga },
              { key: 'jeongsi_na', name: '나군', data: recommendations.jeongsi_na },
              { key: 'jeongsi_da', name: '다군', data: recommendations.jeongsi_da }
            ].map(group => (
              group.data.length > 0 && (
                <div key={group.key} className="print:break-inside-avoid">
                  <h2 className="text-lg print:text-base font-semibold text-navy-800 border-b-2 border-navy-200 pb-2 mb-4">
                    정시 {group.name} 추천 대학 ({group.data.length}개)
                  </h2>
                  <Table className="print:text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="print:py-2">대학</TableHead>
                        <TableHead className="print:py-2">학과</TableHead>
                        <TableHead className="print:py-2">전형</TableHead>
                        <TableHead className="print:py-2">등급</TableHead>
                        <TableHead className="print:py-2">합격률</TableHead>
                        <TableHead className="print:py-2">국어</TableHead>
                        <TableHead className="print:py-2">수학</TableHead>
                        <TableHead className="print:py-2">영어</TableHead>
                        <TableHead className="print:py-2">모집인원</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.data.map((uni, index) => (
                        <TableRow key={index}>
                          <TableCell className="print:py-1 font-medium">{uni.university}</TableCell>
                          <TableCell className="print:py-1">{uni.department}</TableCell>
                          <TableCell className="print:py-1 text-xs print:text-xs">{uni.admission_type}</TableCell>
                          <TableCell className="print:py-1">
                            <span className={`px-2 py-1 print:px-1 print:py-0 rounded text-xs print:text-xs font-medium ${
                              uni.합격가능성등급 === 'S' ? 'bg-emerald-100 text-emerald-800' :
                              uni.합격가능성등급 === 'A' ? 'bg-green-100 text-green-800' :
                              uni.합격가능성등급 === 'B' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {getProbabilityText(uni.합격가능성등급)}
                            </span>
                          </TableCell>
                          <TableCell className="print:py-1 font-medium">{uni.예상합격률}%</TableCell>
                          <TableCell className="print:py-1">{uni.korean > 0 ? uni.korean : '-'}</TableCell>
                          <TableCell className="print:py-1">{uni.math > 0 ? uni.math : '-'}</TableCell>
                          <TableCell className="print:py-1">{uni.english > 0 ? uni.english : '-'}</TableCell>
                          <TableCell className="print:py-1">{uni.recruitment_count}명</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ))}
          </div>
        )}

        {/* 안내사항 */}
        <div className="mt-8 print:mt-6 p-4 print:p-3 bg-gold-50 print:bg-gray-50 rounded print:break-inside-avoid">
          <h3 className="font-semibold text-gold-900 print:text-gray-800 mb-2">합격 가능성 등급 안내</h3>
          <div className="grid grid-cols-2 print:grid-cols-4 gap-2 text-sm print:text-xs mb-3">
            <div>• S등급: 안전권 (80%+)</div>
            <div>• A등급: 적정권 (50-79%)</div>
            <div>• B등급: 소신권 (20-49%)</div>
            <div>• C등급: 도전권 (20% 미만)</div>
          </div>
          <p className="text-xs print:text-xs text-gold-800 print:text-gray-600">
            * 본 분석 결과는 입시 데이터를 바탕으로 한 예측치이며, 실제 결과와 다를 수 있습니다. 
            최종 지원 전 반드시 해당 대학의 입시요강을 확인하시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  );
}