// 간단한 성적 데이터 인터페이스
export interface SimpleGradeData {
  korean: { [semester: string]: number };
  math: { [semester: string]: number };
  english: { [semester: string]: number };
  inquiry: { [semester: string]: number };
  specialtySubjects: { [semester: string]: number };
}

export interface SimpleSuneungData {
  korean: number;
  math: number;
  english: number;
  inquiry1: number;
  inquiry2: number;
  total_score?: number;
}

// 수시 CSV 데이터 구조
export interface SusiUniversityData {
  region: string;
  university: string;
  category: string;
  highschool_type: string;
  admission_type: string;
  year: number;
  department: string;
  perfect_score: number;
  convert_50_cut: number;
  convert_70_cut: number;
  grade_50_cut: number;
  grade_70_cut: number;
  recruitment_count: number;
  competition_rate: number;
  additional_pass: number;
  total_apply: number;
  pass_num: number;
  real_competition_rate: number;
}

// 정시 CSV 데이터 구조
export interface JeongsiUniversityData {
  region: string;
  university: string;
  category: string;
  admission_type: string;
  year: number;
  department: string;
  perfect_score: number;
  convert_50_cut: number;
  convert_70_cut: number;
  grade_50_cut: number;
  grade_70_cut: number;
  korean: number;
  math: number;
  inquiry: number;
  average: number;
  english: number;
  recruitment_count: number;
  competition_rate: number;
  additional_pass: number;
  total_apply: number;
  pass_num: number;
  real_competition_rate: number;
}

// 추천 대학 인터페이스
export interface RecommendedSusiUniversity extends SusiUniversityData {
  예상합격률: number;
  합격가능성등급: 'S' | 'A' | 'B' | 'C';
  과거데이터: SusiUniversityData[];
}

export interface RecommendedJeongsiUniversity extends JeongsiUniversityData {
  예상합격률: number;
  합격가능성등급: 'S' | 'A' | 'B' | 'C';
  과거데이터: JeongsiUniversityData[];
}

export type SuccessGrade = 'S' | 'A' | 'B' | 'C';