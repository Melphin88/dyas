/**
 * 대학 추천 API 클라이언트 유틸리티
 * 
 * Supabase Edge Function을 호출하여 대학 추천 목록을 가져옵니다.
 */

import { supabase } from './supabase/client';

export interface RecommendationResult {
  success: boolean;
  data?: {
    student_id: string;
    exam_yyyymm: number;
    exam_type: 'science' | 'liberal';
    s_ref: number;
    nubaek: number;
    preferred_majors: string[];
    recommendations: Array<{
      university_name: string;
      department_name: string;
      exam_type: string;
      appropriate_nubaek: number;
      expected_nubaek: number;
      minimum_nubaek: number;
      exam_year: number;
      student_nubaek: number;
      nubaek_difference: number;
      match_score: number;
      pass_rate: number;
      color_code: 'Green' | 'LightGreen' | 'Yellow' | 'Red';
    }>;
    metadata: {
      lookup_yyyymm_used: number;
      cutline_year_used: number;
      total_cutlines_found: number;
      recommendations_count: number;
    };
  };
  error?: string;
}

/**
 * 대학 추천 API 호출
 * 
 * @param studentId - 학생 ID
 * @param examYyyymm - 시험 연월 (예: 202509)
 * @param examType - 시험 유형 ('science' 또는 'liberal')
 * @returns 추천 결과
 */
export async function getUniversityRecommendations(
  studentId: string,
  examYyyymm: number,
  examType: 'science' | 'liberal'
): Promise<RecommendationResult> {
  try {
    // Supabase Edge Function URL 구성
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
    const supabaseUrl = `https://${projectId}.supabase.co`;
    const functionName = 'recommendations';
    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}/${studentId}/${examYyyymm}/${examType}`;

    console.log('대학 추천 API 호출:', { studentId, examYyyymm, examType, functionUrl });

    // Edge Function 호출
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: RecommendationResult = await response.json();
    return result;

  } catch (error) {
    console.error('대학 추천 API 호출 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

