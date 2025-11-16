/**
 * Supabase Edge Function: 정시 대학 추천 분석
 * 
 * 이 Edge Function은 정시 전형(수능 기반) 대학 추천 분석을 제공합니다.
 * 수시 전형과는 완전히 분리되어 있으며, 오직 수능 점수만을 기반으로 계산됩니다.
 */

import { calculateGainsAnalysis, StudentScores, UniversityConfig, AnalysisResult } from '../../../utils/jeongsiCalculations.ts';

/**
 * Edge Function 요청 본문 타입
 */
interface JeongsiAnalysisRequest {
  studentScores: StudentScores;
  universityConfigs: UniversityConfig[];
}

/**
 * Edge Function 응답 타입
 */
interface JeongsiAnalysisResponse {
  success: boolean;
  results?: AnalysisResult[];
  error?: string;
}

/**
 * 정시 대학 추천 분석 Edge Function 핸들러
 * 
 * @param req - Edge Function 요청 객체
 * @returns 분석 결과 JSON 응답
 */
export async function handleJeongsiAnalysis(req: Request): Promise<Response> {
  try {
    // CORS 헤더 설정
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405 
        }
      );
    }

    // 요청 본문 파싱
    const body: JeongsiAnalysisRequest = await req.json();

    // 입력값 검증
    if (!body.studentScores) {
      return new Response(
        JSON.stringify({ success: false, error: '학생 점수 정보가 필요합니다.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    if (!body.universityConfigs || body.universityConfigs.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: '대학 설정 정보가 필요합니다.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // 각 대학에 대한 분석 수행
    const results: AnalysisResult[] = body.universityConfigs.map(config => 
      calculateGainsAnalysis(body.studentScores, config)
    );

    // 결과 반환
    const response: JeongsiAnalysisResponse = {
      success: true,
      results
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('정시 분석 오류:', error);
    
    const errorResponse: JeongsiAnalysisResponse = {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json'
        },
        status: 500 
      }
    );
  }
}

// Deno Edge Function 진입점
Deno.serve(async (req: Request) => {
  return handleJeongsiAnalysis(req);
});



