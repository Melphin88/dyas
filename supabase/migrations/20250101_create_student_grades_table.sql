-- 학생 성적 데이터 테이블 생성
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL, -- accounts 테이블의 username과 연결
  simple_grade_data JSONB, -- 간단한 내신 성적 데이터
  simple_suneung_data JSONB, -- 간단한 수능 성적 데이터
  detailed_grade_data JSONB, -- 상세 성적 데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id) -- 한 학생당 하나의 레코드만
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_student_grades_student_id ON student_grades(student_id);

-- RLS 정책 설정
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 데이터를 읽을 수 있도록
CREATE POLICY "Allow users to read own data" ON student_grades
  FOR SELECT USING (true);

-- 모든 사용자가 자신의 데이터를 삽입할 수 있도록
CREATE POLICY "Allow users to insert own data" ON student_grades
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 자신의 데이터를 업데이트할 수 있도록
CREATE POLICY "Allow users to update own data" ON student_grades
  FOR UPDATE USING (true);

-- 모든 사용자가 자신의 데이터를 삭제할 수 있도록
CREATE POLICY "Allow users to delete own data" ON student_grades
  FOR DELETE USING (true);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_student_grades_updated_at
  BEFORE UPDATE ON student_grades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

