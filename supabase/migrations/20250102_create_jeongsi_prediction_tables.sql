-- 정시 합격 예측 시스템을 위한 테이블 생성
-- 이 마이그레이션은 대학별 전형 설정, 탐구 변환표준점수표, 합격선 누적백분위표를 생성합니다.

-- 1. university_config (대학별 전형 설정 테이블)
-- 목적: 대학별 수능 반영 비율 및 감점 기준 저장
CREATE TABLE IF NOT EXISTS university_config (
  university_id SERIAL PRIMARY KEY,
  university_name TEXT NOT NULL,
  department_name TEXT NOT NULL,
  admission_type TEXT NOT NULL, -- 예: '정시-가군', '정시-나군', '정시-다군'
  korean_weight REAL NOT NULL CHECK (korean_weight >= 0 AND korean_weight <= 1), -- 국어 반영 비율 (0~1)
  math_weight REAL NOT NULL CHECK (math_weight >= 0 AND math_weight <= 1), -- 수학 반영 비율 (0~1)
  inquiry_weight REAL NOT NULL CHECK (inquiry_weight >= 0 AND inquiry_weight <= 1), -- 탐구 반영 비율 (0~1)
  english_penalty JSONB NOT NULL DEFAULT '{}', -- 영어 등급별 감점: {"1": 0, "2": 1.5, "3": 4.0, ...}
  k_history_penalty JSONB NOT NULL DEFAULT '{}', -- 한국사 등급별 감점: {"1": 0, "2": 2.0, ...}
  base_score INT DEFAULT 0, -- 환산점수 만점/기준점수
  exam_year INT NOT NULL, -- 수능 연도
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 동일 대학/학과/전형/연도 조합은 중복 방지
  CONSTRAINT unique_university_config UNIQUE (university_name, department_name, admission_type, exam_year)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_university_config_name ON university_config(university_name);
CREATE INDEX IF NOT EXISTS idx_university_config_department ON university_config(department_name);
CREATE INDEX IF NOT EXISTS idx_university_config_admission_type ON university_config(admission_type);
CREATE INDEX IF NOT EXISTS idx_university_config_year ON university_config(exam_year);
CREATE INDEX IF NOT EXISTS idx_university_config_name_year ON university_config(university_name, exam_year);

-- 2. inquiry_conversion (탐구 변환표준점수표)
-- 목적: 탐구 백분위에 따른 대학별 변환표준점수 매핑
CREATE TABLE IF NOT EXISTS inquiry_conversion (
  conversion_id SERIAL PRIMARY KEY,
  university_name TEXT NOT NULL,
  inquiry_percentile INT NOT NULL CHECK (inquiry_percentile >= 1 AND inquiry_percentile <= 100), -- 1부터 100까지의 백분위
  converted_score REAL NOT NULL, -- 해당 백분위에 해당하는 대학의 변환 표준점수
  exam_year INT NOT NULL, -- 수능 연도
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 동일 대학/백분위/연도 조합은 중복 방지
  CONSTRAINT unique_inquiry_conversion UNIQUE (university_name, inquiry_percentile, exam_year)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_inquiry_conversion_university ON inquiry_conversion(university_name);
CREATE INDEX IF NOT EXISTS idx_inquiry_conversion_percentile ON inquiry_conversion(inquiry_percentile);
CREATE INDEX IF NOT EXISTS idx_inquiry_conversion_year ON inquiry_conversion(exam_year);
CREATE INDEX IF NOT EXISTS idx_inquiry_conversion_university_year ON inquiry_conversion(university_name, exam_year);

-- 3. cutline_nubaek (과거 합격선 누적백분위표)
-- 목적: 합격 가능성 예측 기준이 되는 과거 합격선 누적백분위 저장
CREATE TABLE IF NOT EXISTS cutline_nubaek (
  cutline_id SERIAL PRIMARY KEY,
  university_name TEXT NOT NULL,
  department_name TEXT NOT NULL,
  appropriate_nubaek REAL NOT NULL CHECK (appropriate_nubaek >= 0 AND appropriate_nubaek <= 100), -- 적정 합격선 누백 (80% 추정)
  expected_nubaek REAL NOT NULL CHECK (expected_nubaek >= 0 AND expected_nubaek <= 100), -- 예상 합격선 누백 (50% 추정)
  minimum_nubaek REAL NOT NULL CHECK (minimum_nubaek >= 0 AND minimum_nubaek <= 100), -- 소신 합격선 누백 (20% 추정)
  exam_year INT NOT NULL, -- 수능 연도
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 동일 대학/학과/연도 조합은 중복 방지
  CONSTRAINT unique_cutline_nubaek UNIQUE (university_name, department_name, exam_year),
  
  -- 누백 값의 논리적 검증: 적정 >= 예상 >= 소신
  CONSTRAINT check_nubaek_order CHECK (appropriate_nubaek >= expected_nubaek AND expected_nubaek >= minimum_nubaek)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_cutline_nubaek_university ON cutline_nubaek(university_name);
CREATE INDEX IF NOT EXISTS idx_cutline_nubaek_department ON cutline_nubaek(department_name);
CREATE INDEX IF NOT EXISTS idx_cutline_nubaek_year ON cutline_nubaek(exam_year);
CREATE INDEX IF NOT EXISTS idx_cutline_nubaek_university_year ON cutline_nubaek(university_name, exam_year);

-- updated_at 자동 업데이트 트리거 함수 (이미 존재할 수 있으므로 CREATE OR REPLACE 사용)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 자동 업데이트 트리거 생성
CREATE TRIGGER update_university_config_updated_at
  BEFORE UPDATE ON university_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiry_conversion_updated_at
  BEFORE UPDATE ON inquiry_conversion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cutline_nubaek_updated_at
  BEFORE UPDATE ON cutline_nubaek
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 정책 설정
ALTER TABLE university_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_conversion ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutline_nubaek ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Allow public read access" ON university_config
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON inquiry_conversion
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON cutline_nubaek
  FOR SELECT USING (true);

-- 인증된 사용자만 쓰기 가능하도록 정책 설정 (선택적)
-- 필요에 따라 주석을 해제하여 사용하세요
-- CREATE POLICY "Allow authenticated insert" ON university_config
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow authenticated update" ON university_config
--   FOR UPDATE USING (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow authenticated delete" ON university_config
--   FOR DELETE USING (auth.role() = 'authenticated');

-- 테이블 코멘트 추가 (선택적, PostgreSQL 9.1+)
COMMENT ON TABLE university_config IS '대학별 정시 전형 설정 정보 (수능 반영 비율, 감점 기준 등)';
COMMENT ON TABLE inquiry_conversion IS '탐구 백분위에 따른 대학별 변환표준점수 매핑표';
COMMENT ON TABLE cutline_nubaek IS '과거 합격선 누적백분위표 (합격 가능성 예측 기준)';

COMMENT ON COLUMN university_config.korean_weight IS '국어 반영 비율 (0~1 사이의 값, 예: 0.3 = 30%)';
COMMENT ON COLUMN university_config.math_weight IS '수학 반영 비율 (0~1 사이의 값)';
COMMENT ON COLUMN university_config.inquiry_weight IS '탐구 반영 비율 (0~1 사이의 값)';
COMMENT ON COLUMN university_config.english_penalty IS '영어 등급별 감점 JSON 객체 (예: {"1": 0, "2": 1.5, "3": 4.0})';
COMMENT ON COLUMN university_config.k_history_penalty IS '한국사 등급별 감점 JSON 객체';
COMMENT ON COLUMN inquiry_conversion.inquiry_percentile IS '탐구 백분위 (1~100)';
COMMENT ON COLUMN inquiry_conversion.converted_score IS '해당 백분위에 해당하는 대학의 변환 표준점수';
COMMENT ON COLUMN cutline_nubaek.appropriate_nubaek IS '적정 합격선 누적백분위 (80% 추정)';
COMMENT ON COLUMN cutline_nubaek.expected_nubaek IS '예상 합격선 누적백분위 (50% 추정)';
COMMENT ON COLUMN cutline_nubaek.minimum_nubaek IS '소신 합격선 누적백분위 (20% 추정)';



