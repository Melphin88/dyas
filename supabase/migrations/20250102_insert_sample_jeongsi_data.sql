-- 정시 합격 예측 시스템 샘플 데이터 삽입
-- 이 파일은 테스트 및 개발을 위한 샘플 데이터를 제공합니다.

-- 1. university_config 샘플 데이터
INSERT INTO university_config (
  university_name, 
  department_name, 
  admission_type, 
  korean_weight, 
  math_weight, 
  inquiry_weight, 
  english_penalty, 
  k_history_penalty, 
  base_score, 
  exam_year
) VALUES
  (
    '서울대학교',
    '컴퓨터공학부',
    '정시-가군',
    0.3,
    0.4,
    0.2,
    '{"1": 0, "2": 1.5, "3": 4.0, "4": 7.0, "5": 10.0, "6": 13.0, "7": 16.0, "8": 19.0, "9": 22.0}'::jsonb,
    '{"1": 0, "2": 2.0, "3": 4.0, "4": 6.0, "5": 8.0, "6": 10.0, "7": 12.0, "8": 14.0, "9": 16.0}'::jsonb,
    0,
    2024
  ),
  (
    '연세대학교',
    '컴퓨터과학과',
    '정시-가군',
    0.25,
    0.35,
    0.25,
    '{"1": 0, "2": 1.5, "3": 4.0, "4": 7.0, "5": 10.0, "6": 13.0, "7": 16.0, "8": 19.0, "9": 22.0}'::jsonb,
    '{"1": 0, "2": 2.0, "3": 4.0, "4": 6.0, "5": 8.0, "6": 10.0, "7": 12.0, "8": 14.0, "9": 16.0}'::jsonb,
    0,
    2024
  ),
  (
    '고려대학교',
    '전기전자공학부',
    '정시-나군',
    0.3,
    0.35,
    0.2,
    '{"1": 0, "2": 1.5, "3": 4.0, "4": 7.0, "5": 10.0, "6": 13.0, "7": 16.0, "8": 19.0, "9": 22.0}'::jsonb,
    '{"1": 0, "2": 2.0, "3": 4.0, "4": 6.0, "5": 8.0, "6": 10.0, "7": 12.0, "8": 14.0, "9": 16.0}'::jsonb,
    0,
    2024
  )
ON CONFLICT (university_name, department_name, admission_type, exam_year) 
DO UPDATE SET
  korean_weight = EXCLUDED.korean_weight,
  math_weight = EXCLUDED.math_weight,
  inquiry_weight = EXCLUDED.inquiry_weight,
  english_penalty = EXCLUDED.english_penalty,
  k_history_penalty = EXCLUDED.k_history_penalty,
  base_score = EXCLUDED.base_score,
  updated_at = NOW();

-- 2. inquiry_conversion 샘플 데이터 (서울대학교 예시)
-- 백분위 1~100까지의 변환표준점수 샘플 (실제 데이터는 대학별로 다를 수 있음)
INSERT INTO inquiry_conversion (university_name, inquiry_percentile, converted_score, exam_year)
SELECT 
  '서울대학교' as university_name,
  percentile as inquiry_percentile,
  -- 예시: 백분위가 높을수록 변환점수도 높게 (실제 데이터로 대체 필요)
  CASE 
    WHEN percentile >= 99 THEN 100.0
    WHEN percentile >= 95 THEN 95.0
    WHEN percentile >= 90 THEN 90.0
    WHEN percentile >= 85 THEN 85.0
    WHEN percentile >= 80 THEN 80.0
    WHEN percentile >= 75 THEN 75.0
    WHEN percentile >= 70 THEN 70.0
    WHEN percentile >= 65 THEN 65.0
    WHEN percentile >= 60 THEN 60.0
    WHEN percentile >= 50 THEN 50.0
    WHEN percentile >= 40 THEN 40.0
    WHEN percentile >= 30 THEN 30.0
    WHEN percentile >= 20 THEN 20.0
    WHEN percentile >= 10 THEN 10.0
    ELSE 5.0
  END as converted_score,
  2024 as exam_year
FROM generate_series(1, 100) as percentile
ON CONFLICT (university_name, inquiry_percentile, exam_year)
DO UPDATE SET
  converted_score = EXCLUDED.converted_score,
  updated_at = NOW();

-- 3. cutline_nubaek 샘플 데이터
INSERT INTO cutline_nubaek (
  university_name,
  department_name,
  appropriate_nubaek,
  expected_nubaek,
  minimum_nubaek,
  exam_year
) VALUES
  (
    '서울대학교',
    '컴퓨터공학부',
    95.0, -- 적정 합격선 누백 (80% 추정)
    92.0, -- 예상 합격선 누백 (50% 추정)
    88.0, -- 소신 합격선 누백 (20% 추정)
    2024
  ),
  (
    '연세대학교',
    '컴퓨터과학과',
    92.0,
    89.0,
    85.0,
    2024
  ),
  (
    '고려대학교',
    '전기전자공학부',
    90.0,
    87.0,
    83.0,
    2024
  )
ON CONFLICT (university_name, department_name, exam_year)
DO UPDATE SET
  appropriate_nubaek = EXCLUDED.appropriate_nubaek,
  expected_nubaek = EXCLUDED.expected_nubaek,
  minimum_nubaek = EXCLUDED.minimum_nubaek,
  updated_at = NOW();



