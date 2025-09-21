-- 대학 데이터 테이블 생성 (실제 CSV 형식에 맞게 수정)
CREATE TABLE IF NOT EXISTS universities (
  id SERIAL PRIMARY KEY,
  region TEXT NOT NULL,
  university TEXT NOT NULL,
  category TEXT NOT NULL,
  highschool_type TEXT NOT NULL,
  admission_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  department TEXT NOT NULL,
  perfect_score DECIMAL(10,2),
  convert_50_cut DECIMAL(10,2),
  convert_70_cut DECIMAL(10,2),
  grade_50_cut DECIMAL(10,2),
  grade_70_cut DECIMAL(10,2),
  recruitment_count INTEGER,
  competition_rate DECIMAL(10,2),
  additional_pass INTEGER,
  total_apply INTEGER,
  pass_num INTEGER,
  real_competition_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_universities_region ON universities(region);
CREATE INDEX IF NOT EXISTS idx_universities_university ON universities(university);
CREATE INDEX IF NOT EXISTS idx_universities_category ON universities(category);
CREATE INDEX IF NOT EXISTS idx_universities_admission_type ON universities(admission_type);
CREATE INDEX IF NOT EXISTS idx_universities_year ON universities(year);
CREATE INDEX IF NOT EXISTS idx_universities_department ON universities(department);

-- RLS 정책 설정
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Allow public read access" ON universities
  FOR SELECT USING (true);

-- 모든 사용자가 삽입 가능 (CSV 업로드용)
CREATE POLICY "Allow public insert" ON universities
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 업데이트 가능
CREATE POLICY "Allow public update" ON universities
  FOR UPDATE USING (true);

-- 모든 사용자가 삭제 가능
CREATE POLICY "Allow public delete" ON universities
  FOR DELETE USING (true);