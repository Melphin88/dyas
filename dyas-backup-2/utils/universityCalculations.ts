import { SimpleGradeData, SimpleSuneungData, SusiUniversityData, JeongsiUniversityData, SuccessGrade } from '../types/university';

// 내신 평균 계산
export const calculateGradeAverage = (data: SimpleGradeData): number => {
  const allGrades: number[] = [];
  Object.values(data).forEach((subjectData) => {
    Object.values(subjectData).forEach(grade => {
      if (typeof grade === 'number' && grade > 0) {
        allGrades.push(grade);
      }
    });
  });
  return allGrades.length > 0 ? allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length : 0;
};

// 수능 평균 계산 
export const calculateSuneungAverage = (data: SimpleSuneungData): number => {
  const validScores = [data.korean, data.math, data.english, data.inquiry1, data.inquiry2].filter(score => score > 0);
  return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
};

// 수시 합격 확률 계산
export const calculateSusiProbability = (
  university: SusiUniversityData,
  userGrade: number
): number => {
  if (userGrade <= 0) return 0;
  
  const targetGrade = university.grade_70_cut || university.grade_50_cut;
  if (targetGrade <= 0) return 30; // 데이터 없는 경우 기본값
  
  const gradeDiff = userGrade - targetGrade;
  const competitionFactor = Math.min(university.competition_rate / 10, 1.0);
  
  let baseProbability = 0;
  if (gradeDiff <= -1.5) baseProbability = 90;
  else if (gradeDiff <= -1.0) baseProbability = 80;
  else if (gradeDiff <= -0.5) baseProbability = 65;
  else if (gradeDiff <= 0) baseProbability = 50;
  else if (gradeDiff <= 0.5) baseProbability = 35;
  else if (gradeDiff <= 1.0) baseProbability = 20;
  else baseProbability = 10;
  
  const adjustedProbability = baseProbability * (1 - competitionFactor * 0.3);
  const recruitmentBonus = university.recruitment_count > 10 ? 5 : 0;
  
  return Math.max(5, Math.min(95, adjustedProbability + recruitmentBonus));
};

// 정시 합격 확률 계산
export const calculateJeongsiProbability = (
  university: JeongsiUniversityData,
  userSuneung: number
): number => {
  if (userSuneung <= 0) return 0;
  
  const targetGrade = university.grade_70_cut || university.grade_50_cut;
  if (targetGrade <= 0) return 30;
  
  const gradeDiff = userSuneung - targetGrade;
  const competitionFactor = Math.min(university.real_competition_rate / 15, 1.0);
  
  let baseProbability = 0;
  if (gradeDiff <= -1.5) baseProbability = 85;
  else if (gradeDiff <= -1.0) baseProbability = 75;
  else if (gradeDiff <= -0.5) baseProbability = 60;
  else if (gradeDiff <= 0) baseProbability = 45;
  else if (gradeDiff <= 0.5) baseProbability = 30;
  else if (gradeDiff <= 1.0) baseProbability = 15;
  else baseProbability = 8;
  
  const adjustedProbability = baseProbability * (1 - competitionFactor * 0.4);
  return Math.max(3, Math.min(92, adjustedProbability));
};

// 합격가능성 등급 계산
export const getSuccessGrade = (probability: number): SuccessGrade => {
  if (probability >= 80) return 'S';
  if (probability >= 50) return 'A';
  if (probability >= 20) return 'B';
  return 'C';
};

// 과거 데이터 그룹핑
export const groupPastData = <T extends SusiUniversityData | JeongsiUniversityData>(
  data: T[], 
  university: string, 
  department: string
): T[] => {
  return data
    .filter(item => item.university === university && item.department === department)
    .sort((a, b) => b.year - a.year)
    .slice(0, 3); // 최근 3년
};

// 등급별 색상 반환
export const getGradeColor = (grade: SuccessGrade): string => {
  const colors = {
    'S': 'bg-emerald-700 text-white',
    'A': 'bg-green-500 text-white',
    'B': 'bg-yellow-500 text-gray-900',
    'C': 'bg-red-500 text-white'
  };
  return colors[grade];
};

// 등급별 텍스트 반환
export const getProbabilityText = (grade: SuccessGrade): string => {
  const texts = {
    'S': '안전권',
    'A': '적정권', 
    'B': '소신권',
    'C': '도전권'
  };
  return texts[grade];
};