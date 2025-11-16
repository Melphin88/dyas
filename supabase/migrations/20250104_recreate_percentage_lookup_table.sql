-- 누적백분위 기준 데이터 테이블 재생성 (새로운 스키마)
-- 마이그레이션: 2025-01-04 (재생성)

-- 기존 테이블 삭제
DROP TABLE IF EXISTS percentage_lookup_table CASCADE;

-- 새로운 percentage_lookup_table 테이블 생성
CREATE TABLE percentage_lookup_table (
  id SERIAL PRIMARY KEY,
  exam_yyyymm INTEGER NOT NULL, -- 시험 연월 (예: 202509)
  cumulative_percentile DECIMAL(5, 2) NOT NULL, -- 누적백분위 (0.00 ~ 100.00)
  ref_score_p_science DECIMAL(10, 2) NOT NULL, -- 이과 기준 환산점수 (백분위 합)
  ref_score_s_science DECIMAL(10, 2) NOT NULL, -- 이과 기준 환산점수 (표준점수 합)
  ref_score_p_liberal DECIMAL(10, 2) NOT NULL, -- 문과 기준 환산점수 (백분위 합)
  ref_score_s_liberal DECIMAL(10, 2) NOT NULL, -- 문과 기준 환산점수 (표준점수 합)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 동일한 시험 연월과 누적백분위 조합은 유일해야 함
  CONSTRAINT unique_percentage_lookup UNIQUE (exam_yyyymm, cumulative_percentile)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX idx_percentage_lookup_exam_yyyymm 
  ON percentage_lookup_table(exam_yyyymm);

CREATE INDEX idx_percentage_lookup_cumulative_percentile 
  ON percentage_lookup_table(cumulative_percentile);

CREATE INDEX idx_percentage_lookup_ref_score_s_science 
  ON percentage_lookup_table(ref_score_s_science);

CREATE INDEX idx_percentage_lookup_ref_score_s_liberal 
  ON percentage_lookup_table(ref_score_s_liberal);

-- 복합 인덱스 (시험 연월과 기준 점수로 조회 시 사용)
CREATE INDEX idx_percentage_lookup_exam_score_science 
  ON percentage_lookup_table(exam_yyyymm, ref_score_s_science);

CREATE INDEX idx_percentage_lookup_exam_score_liberal 
  ON percentage_lookup_table(exam_yyyymm, ref_score_s_liberal);

-- RLS 정책 설정
ALTER TABLE percentage_lookup_table ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 (조회용)
CREATE POLICY "Allow public read" ON percentage_lookup_table
  FOR SELECT USING (true);

-- 모든 사용자가 삽입할 수 있도록 (마이그레이션용)
CREATE POLICY "Allow public insert" ON percentage_lookup_table
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 업데이트할 수 있도록 (마이그레이션용)
CREATE POLICY "Allow public update" ON percentage_lookup_table
  FOR UPDATE USING (true);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_percentage_lookup_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_percentage_lookup_updated_at
  BEFORE UPDATE ON percentage_lookup_table
  FOR EACH ROW
  EXECUTE FUNCTION update_percentage_lookup_updated_at();

