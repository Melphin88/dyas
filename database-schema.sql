-- CSV 파일 메타데이터 테이블
CREATE TABLE IF NOT EXISTS csv_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_count INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false,
  type TEXT CHECK (type IN ('susi', 'jeongsi')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 수시 대학 데이터 테이블
CREATE TABLE IF NOT EXISTS susi_university_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES csv_files(id) ON DELETE CASCADE,
  region TEXT,
  university TEXT,
  category TEXT,
  highschool_type TEXT,
  admission_type TEXT,
  year INTEGER,
  department TEXT,
  perfect_score NUMERIC,
  convert_50_cut NUMERIC,
  convert_70_cut NUMERIC,
  grade_50_cut NUMERIC,
  grade_70_cut NUMERIC,
  recruitment_count INTEGER,
  competition_rate NUMERIC,
  additional_pass INTEGER,
  total_apply INTEGER,
  pass_num INTEGER,
  real_competition_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 정시 대학 데이터 테이블
CREATE TABLE IF NOT EXISTS jeongsi_university_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES csv_files(id) ON DELETE CASCADE,
  region TEXT,
  university TEXT,
  category TEXT,
  admission_type TEXT,
  year INTEGER,
  department TEXT,
  perfect_score NUMERIC,
  convert_50_cut NUMERIC,
  convert_70_cut NUMERIC,
  grade_50_cut NUMERIC,
  grade_70_cut NUMERIC,
  korean NUMERIC,
  math NUMERIC,
  inquiry NUMERIC,
  average NUMERIC,
  english NUMERIC,
  recruitment_count INTEGER,
  competition_rate NUMERIC,
  additional_pass INTEGER,
  total_apply INTEGER,
  pass_num INTEGER,
  real_competition_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_csv_files_type ON csv_files(type);
CREATE INDEX IF NOT EXISTS idx_csv_files_active ON csv_files(is_active);
CREATE INDEX IF NOT EXISTS idx_susi_file_id ON susi_university_data(file_id);
CREATE INDEX IF NOT EXISTS idx_jeongsi_file_id ON jeongsi_university_data(file_id);
CREATE INDEX IF NOT EXISTS idx_susi_university ON susi_university_data(university);
CREATE INDEX IF NOT EXISTS idx_jeongsi_university ON jeongsi_university_data(university);

-- RLS (Row Level Security) 설정
ALTER TABLE csv_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE susi_university_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE jeongsi_university_data ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Allow public read access" ON csv_files FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON susi_university_data FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON jeongsi_university_data FOR SELECT USING (true);

-- 관리자만 쓰기 가능하도록 정책 설정
CREATE POLICY "Allow authenticated insert" ON csv_files FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON susi_university_data FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON jeongsi_university_data FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 