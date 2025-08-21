import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Printer } from 'lucide-react';
import { projectId, publicAnonKey, isDevelopmentMode } from '../utils/supabase/info';
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

// 개발 모드용 목업 데이터 (컴포넌트 외부에 정의)
const MOCK_SUSI_DATA: SusiUniversityData[] = [
  {
    region: '서울',
    university: '서울대학교',
    category: '국립',
    highschool_type: '일반고',
    admission_type: '학생부종합전형',
    year: 2024,
    department: '경영학과',
    perfect_score: 100,
    convert_50_cut: 85.0,
    convert_70_cut: 82.0,
    grade_50_cut: 1.2,
    grade_70_cut: 1.5,
    recruitment_count: 30,
    competition_rate: 15.2,
    additional_pass: 3,
    total_apply: 456,
    pass_num: 30,
    real_competition_rate: 15.2
  },
  {
    region: '서울',
    university: '연세대학교',
    category: '사립',
    highschool_type: '일반고',
    admission_type: '학생부종합전형',
    year: 2024,
    department: '경제학부',
    perfect_score: 100,
    convert_50_cut: 82.5,
    convert_70_cut: 80.0,
    grade_50_cut: 1.5,
    grade_70_cut: 1.8,
    recruitment_count: 25,
    competition_rate: 12.8,
    additional_pass: 2,
    total_apply: 320,
    pass_num: 25,
    real_competition_rate: 12.8
  },
  {
    region: '서울',
    university: '고려대학교',
    category: '사립',
    highschool_type: '일반고',
    admission_type: '학생부종합전형',
    year: 2024,
    department: '컴퓨터학과',
    perfect_score: 100,
    convert_50_cut: 80.0,
    convert_70_cut: 77.5,
    grade_50_cut: 1.8,
    grade_70_cut: 2.1,
    recruitment_count: 20,
    competition_rate: 18.5,
    additional_pass: 1,
    total_apply: 370,
    pass_num: 20,
    real_competition_rate: 18.5
  },
  {
    region: '서울',
    university: '성균관대학교',
    category: '사립',
    highschool_type: '일반고',
    admission_type: '학생부종합전형',
    year: 2024,
    department: '전기전자공학부',
    perfect_score: 100,
    convert_50_cut: 78.0,
    convert_70_cut: 75.5,
    grade_50_cut: 2.0,
    grade_70_cut: 2.3,
    recruitment_count: 40,
    competition_rate: 12.1,
    additional_pass: 3,
    total_apply: 484,
    pass_num: 40,
    real_competition_rate: 12.1
  },
  {
    region: '서울',
    university: '한양대학교',
    category: '사립',
    highschool_type: '일반고',
    admission_type: '학생부종합전형',
    year: 2024,
    department: '기계공학부',
    perfect_score: 100,
    convert_50_cut: 75.5,
    convert_70_cut: 73.0,
    grade_50_cut: 2.2,
    grade_70_cut: 2.5,
    recruitment_count: 35,
    competition_rate: 10.8,
    additional_pass: 2,
    total_apply: 378,
    pass_num: 35,
    real_competition_rate: 10.8
  }
];

const MOCK_JEONGSI_DATA: JeongsiUniversityData[] = [
  {
    region: '서울',
    university: '서울대학교',
    category: '국립',
    admission_type: '정시(가군)',
    year: 2024,
    department: '의학과',
    perfect_score: 100,
    convert_50_cut: 95.0,
    convert_70_cut: 92.0,
    grade_50_cut: 1.0,
    grade_70_cut: 1.2,
    korean: 140,
    math: 145,
    inquiry: 142,
    average: 142.3,
    english: 1,
    recruitment_count: 15,
    competition_rate: 25.6,
    additional_pass: 2,
    total_apply: 384,
    pass_num: 15,
    real_competition_rate: 25.6
  },
  {
    region: '서울',
    university: '연세대학교',
    category: '사립',
    admission_type: '정시(나군)',
    year: 2024,
    department: '경영학과',
    perfect_score: 100,
    convert_50_cut: 88.5,
    convert_70_cut: 85.0,
    grade_50_cut: 1.3,
    grade_70_cut: 1.6,
    korean: 135,
    math: 140,
    inquiry: 138,
    average: 137.7,
    english: 1,
    recruitment_count: 35,
    competition_rate: 14.2,
    additional_pass: 4,
    total_apply: 497,
    pass_num: 35,
    real_competition_rate: 14.2
  },
  {
    region: '서울',
    university: '고려대학교',
    category: '사립',
    admission_type: '정시(다군)',
    year: 2024,
    department: '법학과',
    perfect_score: 100,
    convert_50_cut: 85.0,
    convert_70_cut: 82.5,
    grade_50_cut: 1.6,
    grade_70_cut: 1.9,
    korean: 132,
    math: 130,
    inquiry: 135,
    average: 132.3,
    english: 1,
    recruitment_count: 25,
    competition_rate: 16.8,
    additional_pass: 3,
    total_apply: 420,
    pass_num: 25,
    real_competition_rate: 16.8
  },
  {
    region: '서울',
    university: '성균관대학교',
    category: '사립',
    admission_type: '정시(가군)',
    year: 2024,
    department: '소프트웨어학과',
    perfect_score: 100,
    convert_50_cut: 82.0,
    convert_70_cut: 79.5,
    grade_50_cut: 1.7,
    grade_70_cut: 2.0,
    korean: 128,
    math: 135,
    inquiry: 132,
    average: 131.7,
    english: 2,
    recruitment_count: 30,
    competition_rate: 13.4,
    additional_pass: 2,
    total_apply: 402,
    pass_num: 30,
    real_competition_rate: 13.4
  },
  {
    region: '서울',
    university: '한양대학교',
    category: '사립',
    admission_type: '정시(나군)',
    year: 2024,
    department: '건축학부',
    perfect_score: 100,
    convert_50_cut: 79.5,
    convert_70_cut: 77.0,
    grade_50_cut: 1.9,
    grade_70_cut: 2.2,
    korean: 125,
    math: 130,
    inquiry: 128,
    average: 127.7,
    english: 2,
    recruitment_count: 25,
    competition_rate: 11.6,
    additional_pass: 1,
    total_apply: 290,
    pass_num: 25,
    real_competition_rate: 11.6
  }
];

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

  // 절대적인 개발 모드 체크
  const isDevMode = () => {
    return isDevelopmentMode() || 
           projectId === 'development-project' || 
           publicAnonKey === 'development-anon-key' ||
           !projectId || 
           !publicAnonKey ||
           projectId.includes('development') ||
           publicAnonKey.includes('development');
  };

  useEffect(() => {
    console.log('🔍 UniversityRecommendations 초기화');
    console.log('개발 모드 체크:', {
      isDevelopmentMode: isDevelopmentMode(),
      projectId,
      publicAnonKey,
      isDevMode: isDevMode()
    });

    if (isDevMode()) {
      console.log('🎯 개발 모드 확정: 목업 데이터 사용');
      initializeMockData();
    } else {
      console.log('🌐 운영 모드: API 호출 시작');
      loadRealData();
    }
  }, []);

  useEffect(() => {
    if (dataLoaded && (susiData.length > 0 || jeongsiData.length > 0)) {
      generateRecommendations();
    }
  }, [gradeData, suneungData, susiData, jeongsiData, dataLoaded]);

  // 목업 데이터 초기화 (개발 모드)
  const initializeMockData = () => {
    console.log('📝 목업 데이터 로드 시작...');
    setLoading(true);
    
    // 실제 로딩처럼 보이게 하기 위한 지연
    setTimeout(() => {
      setSusiData([...MOCK_SUSI_DATA]);
      setJeongsiData([...MOCK_JEONGSI_DATA]);
      setDataLoaded(true);
      setLoading(false);
      console.log('✅ 목업 데이터 로드 완료:', MOCK_SUSI_DATA.length + MOCK_JEONGSI_DATA.length, '개 대학');
    }, 800);
  };

  // 실제 API 데이터 로드 (운영 모드)
  const loadRealData = async () => {
    console.log('🌐 실제 API 데이터 로드 시작...');
    setLoading(true);

    try {
      // 실제 Supabase API 호출
      const [susiResponse, jeongsiResponse] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/university-data/susi`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/university-data/jeongsi`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        })
      ]);

      const susiResult = susiResponse.ok ? await susiResponse.json() : { data: [] };
      const jeongsiResult = jeongsiResponse.ok ? await jeongsiResponse.json() : { data: [] };

      setSusiData(susiResult.data || []);
      setJeongsiData(jeongsiResult.data || []);
      setDataLoaded(true);
      
      console.log('✅ 실제 데이터 로드 완료');
      
    } catch (error) {
      console.error('❌ API 로드 실패, 목업 데이터로 전환:', error);
      // API 실패 시 목업 데이터로 전환
      setSusiData([...MOCK_SUSI_DATA]);
      setJeongsiData([...MOCK_JEONGSI_DATA]);
      setDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = () => {
    console.log('🔄 추천 대학 생성 시작...');
    
    if (susiData.length === 0 && jeongsiData.length === 0) {
      setRecommendations({ susi: [], jeongsi_ga: [], jeongsi_na: [], jeongsi_da: [] });
      return;
    }

    const gradeAvg = gradeData ? calculateGradeAverage(gradeData) : 0;
    const suneungAvg = suneungData ? calculateSuneungAverage(suneungData) : 0;

    console.log('성적 평균:', { gradeAvg, suneungAvg });

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

    // 정시 추천 (가/나/다군으로 분류)
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

    console.log('✅ 추천 완료:', {
      수시: susiRecommendations.length,
      정시가군: jeongsiGa.length,
      정시나군: jeongsiNa.length,
      정시다군: jeongsiDa.length
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto mb-4"></div>
              <p className="text-navy-600">
                {isDevMode() ? '샘플 대학 데이터를 로드하는 중...' : '대학 데이터를 로드하는 중...'}
              </p>
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
              {isDevMode() ? 
                '개발 모드에서는 샘플 대학 데이터를 사용합니다. 새로고침해보세요.' :
                '관리자가 대학 데이터를 업로드해야 추천이 가능합니다.'
              }
            </p>
            {isDevMode() && (
              <div className="mt-4 p-3 bg-navy-50 border border-navy-200 rounded text-sm text-navy-600">
                <p>현재 로컬 개발 모드로 실행 중입니다.</p>
                <p>샘플 데이터로 대학 추천 기능을 테스트할 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const totalRecommendations = recommendations.susi.length + recommendations.jeongsi_ga.length + recommendations.jeongsi_na.length + recommendations.jeongsi_da.length;

  return (
    <div className="min-h-screen bg-navy-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 개발 모드 알림 */}
        {isDevMode() && (
          <div className="mb-4 p-4 bg-navy-100 border border-navy-300 rounded-lg">
            <div className="flex items-center space-x-2 text-navy-800">
              <svg className="w-5 h-5 text-navy-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h3 className="font-medium">로컬 개발 모드</h3>
            </div>
            <p className="text-sm text-navy-700 mt-2">
              현재 샘플 대학 데이터를 사용하여 추천 기능을 테스트하고 있습니다.
              실제 데이터를 사용하려면 Supabase 환경변수를 설정해주세요.
            </p>
          </div>
        )}
        
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
            <h4 className="font-medium text-gold-900 mb-4">합격 가능성 등급 안내</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-emerald-700 rounded"></div>
                <span className="text-navy-700">S등급: 안전권 (80%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-navy-700">A등급: 적정권 (50-79%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-navy-700">B등급: 소신권 (20-49%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-navy-700">C등급: 도전권 (20% 미만)</span>
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