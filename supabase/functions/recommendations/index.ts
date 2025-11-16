/**
 * 대학 추천 API Edge Function
 * 
 * GET /api/recommendations/{student_id}/{exam_yyyymm}/{exam_type}
 * 
 * 학생의 성적 데이터를 기반으로 대학 추천 목록을 생성합니다.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// 선형 보간 함수
function linearInterpolation(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  if (x2 === x1) return y1;
  return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
}

// 누백 계산 함수
function calculateNubaek(
  sRef: number,
  lookupData: Array<{
    cumulative_percentile: number;
    ref_score_s_science?: number;
    ref_score_s_liberal?: number;
  }>,
  examType: 'science' | 'liberal'
): number | null {
  if (lookupData.length === 0) return null;

  // exam_type에 맞는 컬럼 선택
  const scoreKey = examType === 'science' ? 'ref_score_s_science' : 'ref_score_s_liberal';

  // 정렬된 데이터 (ref_score 기준 오름차순)
  const sortedData = [...lookupData]
    .filter(item => item[scoreKey] !== null && item[scoreKey] !== undefined)
    .sort((a, b) => (a[scoreKey] || 0) - (b[scoreKey] || 0));

  if (sortedData.length === 0) return null;

  // 경계값 확인
  const firstScore = sortedData[0][scoreKey] || 0;
  const lastScore = sortedData[sortedData.length - 1][scoreKey] || 0;

  // 범위 밖인 경우
  if (sRef <= firstScore) {
    return sortedData[0].cumulative_percentile;
  }
  if (sRef >= lastScore) {
    return sortedData[sortedData.length - 1].cumulative_percentile;
  }

  // 선형 보간을 위한 두 점 찾기
  for (let i = 0; i < sortedData.length - 1; i++) {
    const current = sortedData[i][scoreKey] || 0;
    const next = sortedData[i + 1][scoreKey] || 0;

    if (sRef >= current && sRef <= next) {
      return linearInterpolation(
        sRef,
        current,
        sortedData[i].cumulative_percentile,
        next,
        sortedData[i + 1].cumulative_percentile
      );
    }
  }

  return null;
}

// 최신 exam_yyyymm 조회
async function getLatestExamYyyymm(supabase: any, tableName: string): Promise<number | null> {
  const { data, error } = await supabase
    .from(tableName)
    .select('exam_yyyymm')
    .order('exam_yyyymm', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.exam_yyyymm;
}

// 정규분포 누적 분포 함수 (CDF)
// Φ(x) = P(X ≤ x) where X ~ N(0, 1)
function normalCDF(x: number): number {
  // 표준 정규분포 CDF 계산
  // Abramowitz and Stegun approximation
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// 컷라인 분포 표준편차 추정
function estimateCutlineStdDev(appropriateNubaek: number, expectedNubaek: number): number {
  // σ_cut = |appropriate_nubaek - expected_nubaek| / 0.84
  // Z_0.80 ≈ 0.84 (80% percentile of standard normal distribution)
  const z80 = 0.84;
  return Math.abs(appropriateNubaek - expectedNubaek) / z80;
}

// 합격률 계산
function calculatePassRate(
  studentNubaek: number,
  expectedNubaek: number,
  appropriateNubaek: number
): number {
  // 표준편차 추정
  const sigmaCut = estimateCutlineStdDev(appropriateNubaek, expectedNubaek);
  
  // 표준편차가 0이거나 너무 작으면 기본값 반환
  if (sigmaCut <= 0 || !isFinite(sigmaCut)) {
    // 적정 누백과 학생 누백 차이로 간단히 계산
    const diff = studentNubaek - expectedNubaek;
    if (diff <= -5) return 90;
    if (diff <= -2) return 70;
    if (diff <= 0) return 50;
    if (diff <= 2) return 30;
    if (diff <= 5) return 15;
    return 5;
  }

  // μ_cut = expected_nubaek (50% 컷라인)
  const muCut = expectedNubaek;

  // Z-score 계산: (N - μ_cut) / σ_cut
  const zScore = (studentNubaek - muCut) / sigmaCut;

  // P = 1 - Φ((N - μ_cut) / σ_cut)
  // Φ는 표준 정규분포 CDF
  const phiValue = normalCDF(zScore);
  const passRate = (1 - phiValue) * 100;

  // 0~100 범위로 제한
  return Math.max(0, Math.min(100, passRate));
}

// 색상 코드 결정
function determineColorCode(passRate: number): 'Green' | 'LightGreen' | 'Yellow' | 'Red' {
  if (passRate >= 80) return 'Green';
  if (passRate >= 50) return 'LightGreen';
  if (passRate >= 20) return 'Yellow';
  return 'Red';
}

Deno.serve(async (req: Request) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // URL 파라미터 파싱
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Supabase Edge Function 경로: /functions/v1/recommendations/{student_id}/{exam_yyyymm}/{exam_type}
    // 또는 직접 경로: /recommendations/{student_id}/{exam_yyyymm}/{exam_type}
    let studentId: string;
    let examYyyymm: number;
    let examType: 'science' | 'liberal';
    
    // 경로에서 recommendations 찾기
    const recommendationsIndex = pathParts.findIndex(part => part === 'recommendations');
    
    if (recommendationsIndex !== -1 && pathParts.length >= recommendationsIndex + 4) {
      studentId = pathParts[recommendationsIndex + 1];
      examYyyymm = parseInt(pathParts[recommendationsIndex + 2]);
      examType = pathParts[recommendationsIndex + 3] as 'science' | 'liberal';
    } else {
      // 쿼리 파라미터로도 받을 수 있도록 (대안)
      const params = url.searchParams;
      studentId = params.get('student_id') || '';
      examYyyymm = parseInt(params.get('exam_yyyymm') || '0');
      examType = (params.get('exam_type') || '') as 'science' | 'liberal';
    }
    
    if (!studentId || !examYyyymm || !examType) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid parameters. Required: student_id, exam_yyyymm, exam_type' 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // exam_type 검증
    if (examType !== 'science' && examType !== 'liberal') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'exam_type must be "science" or "liberal"' 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Supabase 클라이언트 초기화
    // Edge Function에서는 환경 변수에서 정보를 가져옴
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                               Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Supabase configuration missing' 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // Step 1: 학생 데이터 추출 및 환산점수 계산
    // ============================================
    console.log(`Step 1: 학생 데이터 조회 - student_id: ${studentId}`);

    // 가장 최신 성적 레코드 조회 (exam_year와 exam_month 기준)
    // exam_month 우선순위: 수능 > 10월 > 9월 > 7월 > 6월 > 4월 > 3월
    const monthPriority: Record<string, number> = {
      '수능': 7,
      '10월': 6,
      '9월': 5,
      '7월': 4,
      '6월': 3,
      '4월': 2,
      '3월': 1
    };

    const { data: allStudentGrades, error: studentError } = await supabase
      .from('student_grades')
      .select('*')
      .eq('student_id', studentId);

    if (studentError || !allStudentGrades || allStudentGrades.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '학생 성적 데이터를 찾을 수 없습니다.' 
        }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // exam_year와 exam_month를 기준으로 가장 최신 레코드 선택
    const studentGradesData = allStudentGrades
      .map(record => ({
        ...record,
        monthPriority: monthPriority[record.exam_month] || 0
      }))
      .sort((a, b) => {
        // 먼저 exam_year로 정렬 (내림차순)
        if (b.exam_year !== a.exam_year) {
          return b.exam_year - a.exam_year;
        }
        // exam_year가 같으면 monthPriority로 정렬 (내림차순)
        return b.monthPriority - a.monthPriority;
      })[0];

    if (!studentGradesData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '학생 성적 데이터를 찾을 수 없습니다.' 
        }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // 지망 학과 추출
    const personalInfo = studentGradesData.simple_grade_data?.personalInfo || {};
    const preferredMajors = [
      personalInfo.preferredMajor1,
      personalInfo.preferredMajor2,
      personalInfo.preferredMajor3
    ].filter(Boolean) as string[];

    console.log('추출된 지망 학과:', preferredMajors);

    if (preferredMajors.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '지망 학과 정보가 없습니다.' 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // 기준 환산점수 계산: S_ref = 국어 표준점수 + 수학 표준점수 + 탐구1 표준점수 + 탐구2 표준점수
    const koreanStdScore = studentGradesData.korean_std_score || 0;
    const mathStdScore = studentGradesData.math_std_score || 0;
    const inquiry1StdScore = studentGradesData.inquiry1_std_score || 0;
    const inquiry2StdScore = studentGradesData.inquiry2_std_score || 0;

    const sRef = koreanStdScore + mathStdScore + inquiry1StdScore + inquiry2StdScore;

    console.log(`계산된 S_ref: ${sRef} (국어: ${koreanStdScore}, 수학: ${mathStdScore}, 탐구1: ${inquiry1StdScore}, 탐구2: ${inquiry2StdScore})`);

    // ============================================
    // Step 2: 누백 계산
    // ============================================
    console.log(`Step 2: 누백 계산 - exam_yyyymm: ${examYyyymm}, exam_type: ${examType}`);

    // percentage_lookup_table에서 데이터 조회 (최우선: exam_yyyymm, 없으면 최신)
    let lookupYyyymm = examYyyymm;
    let { data: lookupData, error: lookupError } = await supabase
      .from('percentage_lookup_table')
      .select('*')
      .eq('exam_yyyymm', examYyyymm)
      .order('cumulative_percentile', { ascending: true });

    // 데이터가 없으면 최신 회차 조회
    if (lookupError || !lookupData || lookupData.length === 0) {
      console.log(`exam_yyyymm ${examYyyymm} 데이터가 없어 최신 회차를 조회합니다.`);
      const latestYyyymm = await getLatestExamYyyymm(supabase, 'percentage_lookup_table');
      
      if (latestYyyymm) {
        lookupYyyymm = latestYyyymm;
        const { data: latestData, error: latestError } = await supabase
          .from('percentage_lookup_table')
          .select('*')
          .eq('exam_yyyymm', latestYyyymm)
          .order('cumulative_percentile', { ascending: true });
        
        lookupData = latestData;
        lookupError = latestError;
      }
    }

    if (lookupError || !lookupData || lookupData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '누백 기준표 데이터를 찾을 수 없습니다.' 
        }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // 누백 계산
    const nubaek = calculateNubaek(sRef, lookupData, examType);

    if (nubaek === null) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '누백을 계산할 수 없습니다.' 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    console.log(`계산된 누백: ${nubaek}`);

    // ============================================
    // Step 3: 대학 추천 목록 생성
    // ============================================
    console.log(`Step 3: 대학 추천 목록 생성 - exam_yyyymm: ${examYyyymm}, exam_type: ${examType}`);

    // exam_type을 DB 형식으로 변환 ('science' -> '이과', 'liberal' -> '문과')
    const dbExamType = examType === 'science' ? '이과' : '문과';

    // exam_yyyymm을 exam_year로 변환
    // 202509 (2025년 9월 시험) -> 2026 (2026학년도 입학)
    // exam_yyyymm의 앞 4자리가 연도이고, 9월 시험이면 다음 해 입학이므로 +1
    const examYearBase = Math.floor(examYyyymm / 100); // 202509 -> 2025
    const examMonth = examYyyymm % 100; // 202509 -> 9
    // 9월 이후 시험이면 다음 해 입학, 그 외는 같은 해 입학
    const examYear = examMonth >= 9 ? examYearBase + 1 : examYearBase;

    // cutline_nubaek에서 데이터 조회 (최우선: exam_year, 없으면 최신)
    let cutlineYear = examYear;
    let { data: cutlineData, error: cutlineError } = await supabase
      .from('cutline_nubaek')
      .select('*')
      .eq('exam_type', dbExamType)
      .eq('exam_year', examYear);

    // 데이터가 없으면 최신 회차 조회
    if (cutlineError || !cutlineData || cutlineData.length === 0) {
      console.log(`exam_year ${examYear} 데이터가 없어 최신 회차를 조회합니다.`);
      const { data: latestYearData } = await supabase
        .from('cutline_nubaek')
        .select('exam_year')
        .eq('exam_type', dbExamType)
        .order('exam_year', { ascending: false })
        .limit(1)
        .single();

      if (latestYearData) {
        cutlineYear = latestYearData.exam_year;
        const { data: latestCutlineData, error: latestCutlineError } = await supabase
          .from('cutline_nubaek')
          .select('*')
          .eq('exam_type', dbExamType)
          .eq('exam_year', latestYearData.exam_year);
        
        cutlineData = latestCutlineData;
        cutlineError = latestCutlineError;
      }
    }

    if (cutlineError || !cutlineData || cutlineData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '컷라인 데이터를 찾을 수 없습니다.' 
        }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // 지망 학과와 완전 일치하는 레코드 필터링
    const filteredCutlines = cutlineData.filter(item => 
      preferredMajors.includes(item.department_name)
    );

    console.log(`필터링된 컷라인 데이터: ${filteredCutlines.length}개`);

    // appropriate_nubaek과 학생 누백의 절댓값 차이로 정렬
    const sortedCutlines = filteredCutlines
      .map(item => ({
        ...item,
        nubaekDifference: Math.abs(item.appropriate_nubaek - nubaek)
      }))
      .sort((a, b) => a.nubaekDifference - b.nubaekDifference);

    // 각 지망 학과별로 6개씩 추천 (총 18개 목표)
    const recommendations: any[] = [];
    const majorCounts: Record<string, number> = {};

    for (const cutline of sortedCutlines) {
      const major = cutline.department_name;
      const count = majorCounts[major] || 0;

      if (count < 6) {
        // 합격률 계산
        const passRate = calculatePassRate(
          nubaek,
          cutline.expected_nubaek,
          cutline.appropriate_nubaek
        );

        // 색상 코드 결정
        const colorCode = determineColorCode(passRate);

        recommendations.push({
          university_name: cutline.university_name,
          department_name: cutline.department_name,
          exam_type: cutline.exam_type,
          appropriate_nubaek: cutline.appropriate_nubaek,
          expected_nubaek: cutline.expected_nubaek,
          minimum_nubaek: cutline.minimum_nubaek,
          exam_year: cutline.exam_year,
          student_nubaek: nubaek,
          nubaek_difference: cutline.nubaekDifference,
          match_score: Math.max(0, 100 - cutline.nubaekDifference * 10), // 차이가 작을수록 높은 점수
          pass_rate: Math.round(passRate * 100) / 100, // 소수점 둘째 자리까지
          color_code: colorCode
        });

        majorCounts[major] = count + 1;
      }

      // 총 18개에 도달하면 중단
      if (recommendations.length >= 18) break;
    }

    console.log(`생성된 추천 목록: ${recommendations.length}개`);

    // 응답 반환
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          student_id: studentId,
          exam_yyyymm: examYyyymm,
          exam_type: examType,
          s_ref: sRef,
          nubaek: nubaek,
          preferred_majors: preferredMajors,
          recommendations: recommendations,
          metadata: {
            lookup_yyyymm_used: lookupYyyymm,
            cutline_year_used: cutlineYear,
            total_cutlines_found: filteredCutlines.length,
            recommendations_count: recommendations.length
          }
        }
      }),
      { headers: corsHeaders, status: 200 }
    );

  } catch (error) {
    console.error('대학 추천 API 오류:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});

