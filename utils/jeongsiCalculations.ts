/**
 * 정시 대학 추천 분석 로직
 * 
 * 이 모듈은 정시 전형(수능 기반) 대학 추천을 위한 계산 로직을 제공합니다.
 * 수시 전형(내신 기반) 추천과는 완전히 분리되어 있으며, 오직 수능 점수만을 기반으로 계산됩니다.
 * 
 * @module jeongsiCalculations
 */

/**
 * 학생의 수능 점수 타입 정의
 * 내신 성적 관련 필드는 포함하지 않으며, 오직 수능 점수만을 포함합니다.
 */
export interface StudentScores {
  /** 국어 표준점수 (Percentile Score) */
  koreanPs: number;
  /** 수학 표준점수 (Percentile Score) */
  mathPs: number;
  /** 탐구 표준점수 (Percentile Score) - 탐구1과 탐구2의 합계 또는 평균 */
  inquiryPs: number;
  /** 영어 등급 (1~9등급) */
  englishGrade: number;
  /** 한국사 등급 (1~9등급) */
  kHistoryGrade: number;
}

/**
 * 대학의 정시 전형 설정 정보
 * 반영 비율, 감점표, 예상 합격선 등을 포함합니다.
 */
export interface UniversityConfig {
  /** 대학명 */
  universityName: string;
  /** 전형 유형 (항상 '정시') */
  admissionType: '정시';
  /** 국어 반영 비율 (0~1 사이의 값, 예: 0.3 = 30%) */
  koreanWeight: number;
  /** 수학 반영 비율 (0~1 사이의 값) */
  mathWeight: number;
  /** 탐구 반영 비율 (0~1 사이의 값) */
  inquiryWeight: number;
  /** 영어 등급별 감점표 (등급을 키로, 감점점수를 값으로 가지는 객체) */
  englishPenalty: Record<number, number>;
  /** 한국사 등급별 감점표 (등급을 키로, 감점점수를 값으로 가지는 객체) - 향후 추가 예정 */
  // kHistoryPenalty: Record<number, number>;
  /** 예상 합격선 환산점수 (이 점수를 기준으로 경쟁력 점수를 계산) */
  cutlineExpectedScore: number;
  /** 기본 점수 (선택적, 일부 대학에서 사용) */
  baseScore?: number;
}

/**
 * 정시 분석 결과 타입 정의
 */
export interface AnalysisResult {
  /** 계산된 총 환산점수 */
  totalScore: number;
  /** 경쟁력 점수 (0~100점, 합격선 대비 상대적 점수) */
  competitivenessScore: number;
  /** 예측 결과 텍스트 (안전권, 적정권, 도전권 등) */
  predictionText: string;
  /** 상세 분석 설명 */
  analysisDescription: string;
  /** 대학명 */
  universityName: string;
  /** 계산에 사용된 세부 점수 */
  scoreBreakdown: {
    koreanScore: number;
    mathScore: number;
    inquiryScore: number;
    englishPenalty: number;
    // kHistoryPenalty: number; // 향후 추가 예정
  };
}

/**
 * 정시 대학 추천 분석 계산 함수
 * 
 * 이 함수는 정시 전형에만 적용되며, 수능 점수만을 기반으로 대학별 환산점수와 경쟁력 점수를 계산합니다.
 * 수시 전형 추천에는 별도의 내신 기반 로직이 필요합니다.
 * 
 * @param studentScores - 학생의 수능 점수 (내신 성적 제외)
 * @param universityConfig - 대학의 정시 전형 설정 정보
 * @returns 정시 분석 결과 (환산점수, 경쟁력 점수, 예측 결과 등)
 * 
 * @example
 * ```typescript
 * const studentScores: StudentScores = {
 *   koreanPs: 135,
 *   mathPs: 140,
 *   inquiryPs: 130,
 *   englishGrade: 2,
 *   kHistoryGrade: 1
 * };
 * 
 * const config: UniversityConfig = {
 *   universityName: '서울대학교',
 *   admissionType: '정시',
 *   koreanWeight: 0.3,
 *   mathWeight: 0.4,
 *   inquiryWeight: 0.2,
 *   englishPenalty: { 1: 0, 2: -5, 3: -10, 4: -15, 5: -20 },
 *   cutlineExpectedScore: 500,
 *   baseScore: 0
 * };
 * 
 * const result = calculateGainsAnalysis(studentScores, config);
 * console.log(result.competitivenessScore); // 경쟁력 점수
 * ```
 */
export function calculateGainsAnalysis(
  studentScores: StudentScores,
  universityConfig: UniversityConfig
): AnalysisResult {
  // 입력값 유효성 검사
  if (!studentScores || !universityConfig) {
    throw new Error('학생 점수와 대학 설정 정보가 필요합니다.');
  }

  // A. 대학별 환산점수 계산 (정시)
  // 각 과목의 표준점수에 반영 비율을 곱하여 가중 평균 계산
  const koreanScore = studentScores.koreanPs * universityConfig.koreanWeight;
  const mathScore = studentScores.mathPs * universityConfig.mathWeight;
  const inquiryScore = studentScores.inquiryPs * universityConfig.inquiryWeight;

  // 영어 등급별 감점 적용
  const englishPenalty = universityConfig.englishPenalty[studentScores.englishGrade] || 0;

  // 한국사 감점은 로직 단순화를 위해 일단 제외하고, 나중에 추가할 수 있도록 주석으로만 표시
  // const kHistoryPenalty = universityConfig.kHistoryPenalty?.[studentScores.kHistoryGrade] || 0;

  // 기본 점수가 있으면 추가
  const baseScore = universityConfig.baseScore || 0;

  // 총 환산점수 계산
  const totalScore = koreanScore + mathScore + inquiryScore - englishPenalty + baseScore;
  // 향후 한국사 감점 추가 시: const totalScore = koreanScore + mathScore + inquiryScore - englishPenalty - kHistoryPenalty + baseScore;

  // B. 경쟁력 점수 산출 (합격률 대체)
  // 학생의 총 환산점수와 대학의 예상 합격선을 비교하여 100점 만점의 '경쟁력 점수'를 반환
  let competitivenessScore = 0;
  if (universityConfig.cutlineExpectedScore > 0) {
    competitivenessScore = (totalScore / universityConfig.cutlineExpectedScore) * 100;
    // 경쟁력 점수를 0~100 범위로 제한
    competitivenessScore = Math.max(0, Math.min(100, competitivenessScore));
  }

  // 예측 결과 텍스트 생성
  let predictionText: string;
  let analysisDescription: string;

  if (competitivenessScore >= 110) {
    predictionText = '안전권';
    analysisDescription = `현재 점수(${totalScore.toFixed(1)}점)가 예상 합격선(${universityConfig.cutlineExpectedScore}점)보다 ${((competitivenessScore - 100) * universityConfig.cutlineExpectedScore / 100).toFixed(1)}점 높아 안전하게 합격할 가능성이 높습니다.`;
  } else if (competitivenessScore >= 100) {
    predictionText = '적정권';
    analysisDescription = `현재 점수(${totalScore.toFixed(1)}점)가 예상 합격선(${universityConfig.cutlineExpectedScore}점)과 비슷하여 합격 가능성이 적정합니다.`;
  } else if (competitivenessScore >= 90) {
    predictionText = '소신권';
    analysisDescription = `현재 점수(${totalScore.toFixed(1)}점)가 예상 합격선(${universityConfig.cutlineExpectedScore}점)보다 ${((100 - competitivenessScore) * universityConfig.cutlineExpectedScore / 100).toFixed(1)}점 낮아 소신 지원이 가능합니다.`;
  } else {
    predictionText = '도전권';
    analysisDescription = `현재 점수(${totalScore.toFixed(1)}점)가 예상 합격선(${universityConfig.cutlineExpectedScore}점)보다 ${((100 - competitivenessScore) * universityConfig.cutlineExpectedScore / 100).toFixed(1)}점 낮아 도전적인 지원입니다.`;
  }

  // 결과 반환
  return {
    totalScore: Math.round(totalScore * 10) / 10, // 소수점 첫째 자리까지 반올림
    competitivenessScore: Math.round(competitivenessScore * 10) / 10,
    predictionText,
    analysisDescription,
    universityName: universityConfig.universityName,
    scoreBreakdown: {
      koreanScore: Math.round(koreanScore * 10) / 10,
      mathScore: Math.round(mathScore * 10) / 10,
      inquiryScore: Math.round(inquiryScore * 10) / 10,
      englishPenalty: englishPenalty,
      // kHistoryPenalty: kHistoryPenalty // 향후 추가 예정
    }
  };
}

/**
 * 여러 대학에 대한 정시 분석을 일괄 계산하는 헬퍼 함수
 * 
 * @param studentScores - 학생의 수능 점수
 * @param universityConfigs - 여러 대학의 설정 정보 배열
 * @returns 각 대학별 분석 결과 배열
 */
export function calculateMultipleUniversities(
  studentScores: StudentScores,
  universityConfigs: UniversityConfig[]
): AnalysisResult[] {
  return universityConfigs.map(config => 
    calculateGainsAnalysis(studentScores, config)
  );
}

/**
 * 정시 분석 결과를 경쟁력 점수 순으로 정렬하는 헬퍼 함수
 * 
 * @param results - 분석 결과 배열
 * @param ascending - true면 오름차순, false면 내림차순 (기본값: false)
 * @returns 정렬된 분석 결과 배열
 */
export function sortByCompetitiveness(
  results: AnalysisResult[],
  ascending: boolean = false
): AnalysisResult[] {
  return [...results].sort((a, b) => {
    return ascending 
      ? a.competitivenessScore - b.competitivenessScore
      : b.competitivenessScore - a.competitivenessScore;
  });
}



