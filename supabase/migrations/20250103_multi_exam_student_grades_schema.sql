-- 다회차 시험 성적 관리를 위한 student_grades 테이블 스키마 변경
-- 마이그레이션: 2025-01-03

-- 1. 기존 UNIQUE 제약 조건 제거 (student_id에 대한)
ALTER TABLE student_grades DROP CONSTRAINT IF EXISTS student_grades_student_id_key;

-- 2. simple_suneung_data 컬럼 제거
ALTER TABLE student_grades DROP COLUMN IF EXISTS simple_suneung_data;

-- 3. 회차 구분 컬럼 추가
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS exam_year INTEGER NOT NULL DEFAULT 2025;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS exam_month TEXT NOT NULL DEFAULT '수능';

-- 4. 성적 상세 컬럼 추가 (19개, 모두 NULL 허용)
-- 국어 (4개)
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS korean_raw_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS korean_std_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS korean_percentile FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS korean_grade INTEGER;

-- 수학 (4개)
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS math_raw_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS math_std_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS math_percentile FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS math_grade INTEGER;

-- 영어 (2개)
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS english_raw_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS english_grade INTEGER;

-- 탐구1 (4개)
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS inquiry1_raw_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS inquiry1_std_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS inquiry1_percentile FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS inquiry1_grade INTEGER;

-- 탐구2 (4개)
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS inquiry2_raw_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS inquiry2_std_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS inquiry2_percentile FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS inquiry2_grade INTEGER;

-- 한국사 (2개)
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS k_history_raw_score FLOAT;
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS k_history_grade INTEGER;

-- 5. 새로운 UNIQUE 제약 조건 추가 (student_id, exam_year, exam_month)
ALTER TABLE student_grades ADD CONSTRAINT student_grades_unique_exam 
  UNIQUE (student_id, exam_year, exam_month);

-- 6. 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_student_grades_student_exam 
  ON student_grades(student_id, exam_year, exam_month);

-- 7. exam_month에 대한 CHECK 제약 조건 추가 (유효한 값만 허용)
ALTER TABLE student_grades ADD CONSTRAINT check_exam_month 
  CHECK (exam_month IN ('3월', '4월', '6월', '7월', '9월', '10월', '수능'));

-- 8. exam_year에 대한 CHECK 제약 조건 추가 (합리적인 범위)
ALTER TABLE student_grades ADD CONSTRAINT check_exam_year 
  CHECK (exam_year >= 2020 AND exam_year <= 2100);

