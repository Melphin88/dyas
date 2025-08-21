import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Printer, Search } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { SusiUniversityCard } from './SusiUniversityCard';
import { JeongsiUniversityCard } from './JeongsiUniversityCard';
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
  groupPastData
} from '../utils/universityCalculations';

interface UniversityRecommendationsProps {
  gradeData?: SimpleGradeData | null;
  suneungData?: SimpleSuneungData | null;
  onBack?: () => void;
  onViewReport?: () => void;
  onViewPrintReport?: () => void;
}

export function UniversityRecommendations({ 
  gradeData, 
  suneungData, 
  onBack, 
  onViewReport, 
  onViewPrintReport 
}: UniversityRecommendationsProps) {
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
  
  const [loading, setLoading] = useState(true);
  const [susiData, setSusiData] = useState<SusiUniversityData[]>([]);
  const [jeongsiData, setJeongsiData] = useState<JeongsiUniversityData[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [desiredMajor, setDesiredMajor] = useState<string>('');
  const [showMajorInput, setShowMajorInput] = useState(true);

  useEffect(() => {
    console.log('🔍 UniversityRecommendations 초기화');
    loadRealData();
  }, []);

  useEffect(() => {
    if (dataLoaded && (susiData.length > 0 || jeongsiData.length > 0)) {
      generateRecommendations();
    }
  }, [gradeData, suneungData, susiData, jeongsiData, dataLoaded, desiredMajor]);

  // 실제 Supabase 데이터 로드
  const loadRealData = async () => {
    console.log('🌐 Supabase에서 실제 데이터 로드 시작...');
    setLoading(true);
    setDebugInfo('데이터 로드 중...');

    try {
      console.log('📊 Supabase 클라이언트 사용 시작');

      // 수시 데이터 로드
      console.log('📈 수시 데이터 로드 중...');
      const { data: susiResult, error: susiError } = await supabase
        .from('susi_university_data')
        .select('*');

      if (susiError) {
        console.error('❌ 수시 데이터 로드 오류:', susiError);
        setDebugInfo(`수시 데이터 로드 실패: ${susiError.message}`);
      } else {
        console.log('✅ 수시 데이터 로드 성공:', susiResult?.length || 0, '개');
        
        // 대학별 데이터 분포 확인
        const universityCount = susiResult?.reduce((acc: any, item) => {
          acc[item.university] = (acc[item.university] || 0) + 1;
          return acc;
        }, {}) || {};
        
        console.log('🏫 수시 대학별 데이터 분포:', universityCount);
        console.log('📊 수시 데이터 샘플:', susiResult?.slice(0, 3));
      }

      // 정시 데이터 로드
      console.log('📈 정시 데이터 로드 중...');
      const { data: jeongsiResult, error: jeongsiError } = await supabase
        .from('jeongsi_university_data')
        .select('*');

      if (jeongsiError) {
        console.error('❌ 정시 데이터 로드 오류:', jeongsiError);
        setDebugInfo(`정시 데이터 로드 실패: ${jeongsiError.message}`);
      } else {
        console.log('✅ 정시 데이터 로드 성공:', jeongsiResult?.length || 0, '개');
        
        // 대학별 데이터 분포 확인
        const universityCount = jeongsiResult?.reduce((acc: any, item) => {
          acc[item.university] = (acc[item.university] || 0) + 1;
          return acc;
        }, {}) || {};
        
        console.log('🏫 정시 대학별 데이터 분포:', universityCount);
        console.log('📊 정시 데이터 샘플:', jeongsiResult?.slice(0, 3));
      }

      setSusiData(susiResult || []);
      setJeongsiData(jeongsiResult || []);
      setDataLoaded(true);
      
      const totalData = (susiResult?.length || 0) + (jeongsiResult?.length || 0);
      setDebugInfo(`데이터 로드 완료: 수시 ${susiResult?.length || 0}개, 정시 ${jeongsiResult?.length || 0}개 (총 ${totalData}개)`);
      
      console.log('✅ 실제 데이터 로드 완료:', {
        수시: susiResult?.length || 0,
        정시: jeongsiResult?.length || 0,
        총합: totalData
      });
      
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
      setDebugInfo(`데이터 로드 실패: ${error}`);
      setSusiData([]);
      setJeongsiData([]);
      setDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  // 학과 관련성 점수 계산
  const calculateMajorRelevance = (department: string, desiredMajor: string): number => {
    if (!desiredMajor.trim()) return 0;
    
    const major = desiredMajor.toLowerCase();
    const dept = department.toLowerCase();
    
    // 정확한 일치
    if (dept.includes(major) || major.includes(dept)) return 100;
    
    // 주요 키워드 매칭
    const keywords = major.split(/[\s,]+/).filter(k => k.length > 1);
    let score = 0;
    
    keywords.forEach(keyword => {
      if (dept.includes(keyword)) {
        score += 30;
      }
    });
    
    // 학과 분야별 가중치
    const fieldWeights: { [key: string]: number } = {
      '공학': ['공학', '기계', '전자', '컴퓨터', '정보', '건설', '화학', '생명'],
      '의학': ['의학', '치의학', '한의학', '약학', '간호', '보건'],
      '경영': ['경영', '경제', '무역', '회계', '마케팅', '경영학'],
      '문학': ['문학', '국어', '영어', '독어', '불어', '중어', '일어'],
      '사학': ['사학', '역사', '고고학', '문화재'],
      '교육': ['교육', '초등', '중등', '특수교육'],
      '예술': ['예술', '미술', '음악', '디자인', '연극', '영화'],
      '자연': ['자연', '수학', '물리', '화학', '생물', '지구'],
      '사회': ['사회', '정치', '행정', '법학', '사회학', '심리학']
    };
    
    Object.entries(fieldWeights).forEach(([field, terms]) => {
      if (terms.some(term => major.includes(term) || dept.includes(term))) {
        score += 20;
      }
    });
    
    return Math.min(100, score);
  };

  const generateRecommendations = () => {
    console.log('🔄 추천 대학 생성 시작...');
    console.log('📊 현재 데이터 상태:', {
      수시데이터: susiData.length,
      정시데이터: jeongsiData.length,
      내신성적: gradeData ? '있음' : '없음',
      수능성적: suneungData ? '있음' : '없음',
      지망학과: desiredMajor
    });
    
    if (susiData.length === 0 && jeongsiData.length === 0) {
      console.log('❌ 대학 데이터가 없습니다');
      setRecommendations({ susi: [], jeongsi_ga: [], jeongsi_na: [], jeongsi_da: [] });
      return;
    }

    const gradeAvg = gradeData ? calculateGradeAverage(gradeData) : 0;
    const suneungAvg = suneungData ? calculateSuneungAverage(suneungData) : 0;

    console.log('📈 성적 평균:', { 
      내신평균: gradeAvg, 
      수능평균: suneungAvg,
      내신데이터: gradeData,
      수능데이터: suneungData
    });

    // 수시 추천 (지망학과 우선순위 적용)
    const susiFiltered = susiData.filter(uni => {
      const hasGrade = gradeAvg > 0;
      const hasCutGrade = uni.grade_70_cut > 0 || uni.grade_50_cut > 0;
      console.log(`수시 필터링: ${uni.university} ${uni.department} - 성적있음:${hasGrade}, 컷등급있음:${hasCutGrade}`);
      return hasGrade && hasCutGrade;
    });

    console.log('🔍 수시 필터링 후 대학 수:', susiFiltered.length);
    console.log('🏫 수시 필터링 후 대학 목록:', susiFiltered.map(u => `${u.university} ${u.department}`).slice(0, 10));

    const susiRecommendations = susiFiltered
      .map(uni => {
        const probability = calculateSusiProbability(uni, gradeAvg);
        const majorRelevance = calculateMajorRelevance(uni.department, desiredMajor);
        console.log(`수시 계산: ${uni.university} ${uni.department} - 합격률:${probability}%, 학과관련성:${majorRelevance}%`);
        return {
          ...uni,
          예상합격률: Math.round(probability),
          합격가능성등급: getSuccessGrade(probability),
          학과관련성: majorRelevance,
          과거데이터: groupPastData(susiData, uni.university, uni.department)
        } as RecommendedSusiUniversity & { 학과관련성: number };
      })
      .sort((a, b) => {
        // 1순위: 학과 관련성 (지망학과가 있는 경우)
        if (desiredMajor.trim()) {
          if (a.학과관련성 !== b.학과관련성) {
            return b.학과관련성 - a.학과관련성;
          }
        }
        
        // 2순위: 합격 가능성 등급
        const gradeOrder = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
        if (gradeOrder[a.합격가능성등급] !== gradeOrder[b.합격가능성등급]) {
          return gradeOrder[b.합격가능성등급] - gradeOrder[a.합격가능성등급];
        }
        
        // 3순위: 합격률
        return b.예상합격률 - a.예상합격률;
      })
      .slice(0, 20);

    console.log('📊 수시 추천 결과:', susiRecommendations.length, '개');
    console.log('🏆 수시 추천 상위 5개:', susiRecommendations.slice(0, 5).map(u => `${u.university} ${u.department} (관련성:${u.학과관련성}%, 합격률:${u.예상합격률}%)`));

    // 정시 추천 (가/나/다군으로 분류, 각각 5개씩)
    const jeongsiFiltered = jeongsiData.filter(uni => {
      const hasSuneung = suneungAvg > 0;
      const hasCutGrade = uni.grade_70_cut > 0 || uni.grade_50_cut > 0;
      console.log(`정시 필터링: ${uni.university} ${uni.department} - 수능있음:${hasSuneung}, 컷등급있음:${hasCutGrade}`);
      return hasSuneung && hasCutGrade;
    });

    console.log('🔍 정시 필터링 후 대학 수:', jeongsiFiltered.length);

    const jeongsiRecommendations = jeongsiFiltered
      .map(uni => {
        const probability = calculateJeongsiProbability(uni, suneungAvg);
        const majorRelevance = calculateMajorRelevance(uni.department, desiredMajor);
        console.log(`정시 계산: ${uni.university} ${uni.department} - 합격률:${probability}%, 학과관련성:${majorRelevance}%`);
        return {
          ...uni,
          예상합격률: Math.round(probability),
          합격가능성등급: getSuccessGrade(probability),
          학과관련성: majorRelevance,
          과거데이터: groupPastData(jeongsiData, uni.university, uni.department)
        } as RecommendedJeongsiUniversity & { 학과관련성: number };
      });

    const sortByRelevanceAndGrade = (a: RecommendedJeongsiUniversity & { 학과관련성: number }, b: RecommendedJeongsiUniversity & { 학과관련성: number }) => {
      // 1순위: 학과 관련성 (지망학과가 있는 경우)
      if (desiredMajor.trim()) {
        if (a.학과관련성 !== b.학과관련성) {
          return b.학과관련성 - a.학과관련성;
        }
      }
      
      // 2순위: 합격 가능성 등급
      const gradeOrder = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
      if (gradeOrder[a.합격가능성등급] !== gradeOrder[b.합격가능성등급]) {
        return gradeOrder[b.합격가능성등급] - gradeOrder[a.합격가능성등급];
      }
      
      // 3순위: 합격률
      return b.예상합격률 - a.예상합격률;
    };

    const jeongsiGa = jeongsiRecommendations
      .filter(uni => uni.admission_type.includes('가') || uni.admission_type.includes('정시(가)'))
      .sort(sortByRelevanceAndGrade)
      .slice(0, 5);

    const jeongsiNa = jeongsiRecommendations
      .filter(uni => uni.admission_type.includes('나') || uni.admission_type.includes('정시(나)'))
      .sort(sortByRelevanceAndGrade)
      .slice(0, 5);

    const jeongsiDa = jeongsiRecommendations
      .filter(uni => uni.admission_type.includes('다') || uni.admission_type.includes('정시(다)'))
      .sort(sortByRelevanceAndGrade)
      .slice(0, 5);

    setRecommendations({
      susi: susiRecommendations,
      jeongsi_ga: jeongsiGa,
      jeongsi_na: jeongsiNa,
      jeongsi_da: jeongsiDa
    });

    const totalRecommendations = susiRecommendations.length + jeongsiGa.length + jeongsiNa.length + jeongsiDa.length;
    setDebugInfo(`추천 완료: 수시 ${susiRecommendations.length}개, 정시 ${jeongsiGa.length + jeongsiNa.length + jeongsiDa.length}개 (총 ${totalRecommendations}개)${desiredMajor ? ` | 지망학과: ${desiredMajor}` : ''}`);

    console.log('✅ 추천 완료:', {
      수시: susiRecommendations.length,
      정시가군: jeongsiGa.length,
      정시나군: jeongsiNa.length,
      정시다군: jeongsiDa.length,
      총합: totalRecommendations,
      지망학과: desiredMajor
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto mb-4"></div>
              <p className="text-navy-600">대학 데이터를 로드하는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gradeData && !suneungData) {
    return (
      <div className="min-h-screen bg-navy-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-navy-900 mb-2">성적 입력이 필요합니다</h3>
            <p className="text-navy-600">내신 성적 또는 수능 성적을 먼저 입력해주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  if (dataLoaded && susiData.length === 0 && jeongsiData.length === 0) {
    return (
      <div className="min-h-screen bg-navy-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🏫</div>
            <h3 className="text-lg font-medium text-navy-900 mb-2">대학 데이터가 없습니다</h3>
            <p className="text-navy-600">
              관리자가 대학 데이터를 업로드해야 추천이 가능합니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalRecommendations = recommendations.susi.length + recommendations.jeongsi_ga.length + recommendations.jeongsi_na.length + recommendations.jeongsi_da.length;

  return (
    <div className="min-h-screen bg-navy-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 디버그 정보 */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <strong>디버그 정보:</strong> {debugInfo}
        </div>

        {onBack && (
          <button onClick={onBack} className="mb-4 px-4 py-2 border border-navy-300 text-navy-700 hover:bg-navy-100 rounded-md">
            ← 이전으로
          </button>
        )}
        
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl text-navy-900 mb-2">대학 추천 결과</h1>
            <p className="text-navy-600">입력한 성적을 바탕으로 총 {totalRecommendations}개 대학을 추천합니다</p>
            {gradeData && (
              <p className="text-sm text-navy-500 mt-1">내신 평균: {calculateGradeAverage(gradeData).toFixed(2)}등급</p>
            )}
            {suneungData && (
              <p className="text-sm text-navy-500">수능 평균: {calculateSuneungAverage(suneungData).toFixed(2)}등급</p>
            )}
          </div>
          <div className="flex space-x-2">
            {onViewPrintReport && (
              <Button onClick={onViewPrintReport} className="bg-navy-600 hover:bg-navy-700 text-white">
                <Printer className="w-4 h-4 mr-2" />
                인쇄용 보고서
              </Button>
            )}
            {onViewReport && (
              <button onClick={onViewReport} className="px-6 py-2 bg-gold-600 text-white hover:bg-gold-700 rounded-md font-medium">
                상세 분석 리포트 보기
              </button>
            )}
          </div>
        </div>

        {/* 지망학과 입력 */}
        {showMajorInput && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-navy-900 mb-4 flex items-center">
              <Search className="w-5 h-5 mr-2 text-gold-600" />
              지망학과 입력 (선택사항)
            </h3>
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="예: 컴퓨터공학, 의학, 경영학..."
                value={desiredMajor}
                onChange={(e) => setDesiredMajor(e.target.value)}
                className="flex-1 p-3 border border-navy-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <Button 
                onClick={() => setShowMajorInput(false)}
                className="px-6 py-3 bg-gold-600 text-white hover:bg-gold-700"
              >
                추천 받기
              </Button>
            </div>
            <p className="text-sm text-navy-500 mt-2">
              지망학과를 입력하면 관련 학과를 우선적으로 추천해드립니다.
            </p>
          </div>
        )}

        {/* 지망학과 표시 및 수정 */}
        {!showMajorInput && desiredMajor && (
          <div className="mb-6 bg-gold-50 border border-gold-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gold-800 font-medium">지망학과:</span>
                <span className="ml-2 text-gold-900">{desiredMajor}</span>
              </div>
              <Button 
                onClick={() => setShowMajorInput(true)}
                variant="outline"
                size="sm"
                className="text-gold-700 border-gold-300 hover:bg-gold-100"
              >
                수정
              </Button>
            </div>
          </div>
        )}
        
        <div className="space-y-8">
          {/* 수시 추천 */}
          {gradeData && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-xl font-medium text-navy-900 mb-4">수시 추천 대학 ({recommendations.susi.length}/20)</h3>
              {recommendations.susi.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.susi.map((uni, index) => (
                    <SusiUniversityCard key={`susi-${index}`} university={uni} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-navy-500">
                  <div className="text-4xl mb-4">🎓</div>
                  <p>현재 성적으로 추천할 수시 대학이 없습니다.</p>
                  <p className="text-sm mt-2">성적을 다시 확인하거나 관리자에게 문의해주세요.</p>
                </div>
              )}
            </div>
          )}

          {/* 정시 추천 */}
          {suneungData && (
            <div className="space-y-6">
              {[
                { key: 'jeongsi_ga', name: '가군', data: recommendations.jeongsi_ga },
                { key: 'jeongsi_na', name: '나군', data: recommendations.jeongsi_na },
                { key: 'jeongsi_da', name: '다군', data: recommendations.jeongsi_da }
              ].map(group => (
                <div key={group.key} className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-xl font-medium text-navy-900 mb-4">정시 {group.name} 추천 대학 ({group.data.length}/5)</h3>
                  {group.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.data.map((uni, index) => (
                        <JeongsiUniversityCard key={`${group.key}-${index}`} university={uni} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-navy-500">
                      <div className="text-4xl mb-4">📝</div>
                      <p>현재 성적으로 추천할 정시 {group.name} 대학이 없습니다.</p>
                      <p className="text-sm mt-2">성적을 다시 확인하거나 관리자에게 문의해주세요.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 안내 정보 */}
          <div className="bg-gold-50 border border-gold-200 rounded-lg p-6">
            <h4 className="font-medium text-gold-900 mb-4">추천 시스템 안내</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <h5 className="font-medium text-gold-800 mb-2">추천 우선순위:</h5>
                <ol className="list-decimal list-inside space-y-1 text-gold-700">
                  <li>지망학과 관련성 (입력한 경우)</li>
                  <li>합격 가능성 등급 (S &gt; A &gt; B &gt; C)</li>
                  <li>예상 합격률</li>
                </ol>
              </div>
              <div>
                <h5 className="font-medium text-gold-800 mb-2">합격 가능성 등급:</h5>
                <div className="space-y-1 text-gold-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-emerald-700 rounded"></div>
                    <span>S등급: 안전권 (80%+)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>A등급: 적정권 (50-79%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>B등급: 소신권 (20-49%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>C등급: 도전권 (20% 미만)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-gold-800 text-sm space-y-2">
              <p>* 추천 결과는 실제 입시 데이터를 바탕으로 한 예측치이며, 실제 결과와 다를 수 있습니다.</p>
              <p>* 합격 가능성은 경쟁률, 모집인원, 지난 해 컷 등급 등을 종합적으로 고려하여 산출됩니다.</p>
              <p>* 최종 지원 전에 반드시 해당 대학의 입시요강을 확인하시기 바랍니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}