/**
 * university_config 테이블 데이터 마이그레이션 스크립트
 * 
 * 계열별 분석 결과 CSV 파일들을 읽어서 Supabase의 university_config 테이블에 데이터를 삽입합니다.
 * 
 * 사용법:
 *   npx tsx scripts/migrate-university-config.ts
 *   또는
 *   npx ts-node scripts/migrate-university-config.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module에서 __dirname 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase 설정 (환경 변수에서 가져오거나 기본값 사용)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kgbcqvvkahugbrqlomjc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYmNxdnZrYWh1Z2JycWxvbWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODM5MjgsImV4cCI6MjA3MTI1OTkyOH0.o23VzWrv9Kv6jWb7eIw4a3rWkkWfA5TQyU2Z1RRhvQI';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 파일명에서 exam_year 추출
 * 파일명 형식: [YY][MM]... (예: 2506이과계열분석결과.csv)
 * exam_year = 20[YY] + 1
 */
function extractExamYear(filename: string): number {
  const match = filename.match(/^(\d{2})/);
  if (!match) {
    throw new Error(`파일명에서 연도를 추출할 수 없습니다: ${filename}`);
  }
  const yy = parseInt(match[1], 10);
  return 2000 + yy + 1;
}

/**
 * 파일명에서 exam_type 추출
 */
function extractExamType(filename: string): '이과' | '문과' {
  if (filename.includes('이과계열분석결과')) {
    return '이과';
  } else if (filename.includes('문과계열분석결과')) {
    return '문과';
  } else {
    throw new Error(`파일명에서 계열을 추출할 수 없습니다: ${filename}`);
  }
}

/**
 * CSV 파일 파싱 (두 줄 헤더 처리)
 * - 첫 3줄: 설명 행 (건너뛰기)
 * - 4-5번째 줄: 헤더 (두 줄로 구성, 병합)
 * - 6번째 줄부터: 데이터
 */
interface ParsedCSVRow {
  [key: string]: string;
}

function parseCSVWithTwoLineHeader(filePath: string): {
  headers: string[];
  data: ParsedCSVRow[];
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 6) {
    throw new Error(`CSV 파일에 충분한 데이터가 없습니다: ${filePath}`);
  }
  
  // 첫 3줄 건너뛰기
  // 4-5번째 줄을 헤더로 사용
  const headerLine1 = lines[3].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const headerLine2 = lines[4].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // 두 줄 헤더를 하나로 합치기 (더 긴 것을 사용하거나 병합)
  const headers: string[] = [];
  const maxLength = Math.max(headerLine1.length, headerLine2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const h1 = headerLine1[i] || '';
    const h2 = headerLine2[i] || '';
    // 두 헤더를 합치거나, 비어있지 않은 것을 사용
    const combinedHeader = h1 && h2 ? `${h1}_${h2}` : (h1 || h2);
    headers.push(combinedHeader);
  }
  
  // 6번째 줄부터 데이터 파싱
  const data: ParsedCSVRow[] = [];
  
  for (let i = 5; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // CSV 값 파싱 (따옴표 처리)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    if (values.length >= headers.length) {
      const row: ParsedCSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return { headers, data };
}

/**
 * 반영 비율 추출 (뒤에서 11, 10, 9번째 컬럼)
 */
function extractReflectionRates(row: ParsedCSVRow, headers: string[]): {
  korean_weight: number;
  math_weight: number;
  inquiry_weight: number;
} {
  const totalCols = headers.length;
  
  // CSV 구조: ...,국어구성비,수학구성비,탐구구성비,영어1환점,...,영어9환점
  // 뒤에서 12번째: 국어구성비
  // 뒤에서 11번째: 수학구성비
  // 뒤에서 10번째: 탐구구성비
  // 뒤에서 9번째: 영어1환점
  const koreanIndex = totalCols - 12; // 국어 (뒤에서 12번째)
  const mathIndex = totalCols - 11;   // 수학 (뒤에서 11번째)
  const inquiryIndex = totalCols - 10; // 탐구 (뒤에서 10번째)
  
  // 퍼센트 값을 0~1 범위로 변환 (예: "31%" → 0.31)
  const parsePercent = (value: string): number => {
    if (!value) return 0;
    // "%" 기호 제거 및 공백 제거
    const cleaned = value.toString().trim().replace(/%/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    // 이미 0~1 범위인 경우 그대로 반환, 1~100 범위인 경우 100으로 나눔
    if (num > 1) {
      return num / 100;
    }
    return num;
  };
  
  const korean_weight = parsePercent(row[headers[koreanIndex]] || '0');
  const math_weight = parsePercent(row[headers[mathIndex]] || '0');
  const inquiry_weight = parsePercent(row[headers[inquiryIndex]] || '0');
  
  return { korean_weight, math_weight, inquiry_weight };
}

/**
 * english_penalty JSONB 생성
 * 마지막 8개 컬럼 사용 (2등급~9등급)
 * 1등급은 항상 0
 */
function extractEnglishPenalty(row: ParsedCSVRow, headers: string[]): Record<string, number> {
  const totalCols = headers.length;
  const penalty: Record<string, number> = {
    '1': 0 // 1등급은 항상 0
  };
  
  // 마지막 8개 컬럼 (2등급~9등급)
  for (let i = 0; i < 8; i++) {
    const colIndex = totalCols - 8 + i;
    const grade = (i + 2).toString(); // 2등급부터 9등급까지
    const value = parseFloat(row[headers[colIndex]] || '0') || 0;
    penalty[grade] = value;
  }
  
  return penalty;
}

/**
 * CSV 데이터를 university_config 형식으로 변환
 */
function convertToUniversityConfig(
  row: ParsedCSVRow,
  headers: string[],
  examType: '이과' | '문과',
  examYear: number
): {
  university_name: string;
  department_name: string;
  admission_type: string;
  exam_type: '이과' | '문과';
  korean_weight: number;
  math_weight: number;
  inquiry_weight: number;
  english_penalty: Record<string, number>;
  k_history_penalty: number; // FLOAT 타입
  base_score: number; // FLOAT 타입
  exam_year: number;
} | null {
  // 컬럼명 찾기 (정확한 매칭 또는 부분 매칭)
  let universityName = '';
  let departmentName = '';
  let admissionGroup = '';
  
  // '대학교' 컬럼 찾기
  const universityCol = headers.find(h => h.includes('대학교') || h === '대학교');
  if (universityCol) {
    universityName = row[universityCol] || '';
  }
  
  // '전공' 컬럼 찾기
  const departmentCol = headers.find(h => h.includes('전공') || h === '전공');
  if (departmentCol) {
    departmentName = row[departmentCol] || '';
  }
  
  // '모집군' 컬럼 찾기
  const admissionGroupCol = headers.find(h => h.includes('모집군') || h === '모집군');
  if (admissionGroupCol) {
    admissionGroup = row[admissionGroupCol] || '';
  }
  
  // 필수 필드 검증
  if (!universityName || !departmentName) {
    console.warn(`필수 필드가 없습니다: 대학교=${universityName}, 전공=${departmentName}`);
    return null;
  }
  
  // 반영 비율 추출
  const reflectionRates = extractReflectionRates(row, headers);
  
  // 영어 감점 추출
  const englishPenalty = extractEnglishPenalty(row, headers);
  
  // 실제 테이블 구조에 맞게 변환
  // 주의: exam_type 컬럼이 테이블에 없을 수 있으므로, 테이블에 추가되어야 합니다.
  return {
    university_name: universityName.trim(),
    department_name: departmentName.trim(),
    admission_type: admissionGroup.trim() || '정시',
    exam_type: examType, // 테이블에 exam_type 컬럼이 있어야 합니다
    korean_weight: reflectionRates.korean_weight,
    math_weight: reflectionRates.math_weight,
    inquiry_weight: reflectionRates.inquiry_weight,
    english_penalty: englishPenalty,
    k_history_penalty: 0.0, // FLOAT 타입, CSV에 데이터 없으므로 0.0으로 삽입
    base_score: 0.0, // FLOAT 타입, CSV에 데이터 없으므로 0.0으로 삽입
    exam_year: examYear
  };
}

/**
 * 단일 CSV 파일 처리
 */
async function processCSVFile(filePath: string): Promise<number> {
  const filename = path.basename(filePath);
  console.log(`\n처리 중: ${filename}`);
  
  try {
    // 파일명에서 exam_type과 exam_year 추출
    const examType = extractExamType(filename);
    const examYear = extractExamYear(filename);
    
    console.log(`  - 계열: ${examType}`);
    console.log(`  - 연도: ${examYear}`);
    
    // CSV 파싱
    const { headers, data } = parseCSVWithTwoLineHeader(filePath);
    console.log(`  - 헤더 수: ${headers.length}`);
    console.log(`  - 데이터 행 수: ${data.length}`);
    
    // 데이터 변환
    const configs = data
      .map(row => convertToUniversityConfig(row, headers, examType, examYear))
      .filter((config): config is NonNullable<typeof config> => config !== null);
    
    console.log(`  - 유효한 데이터: ${configs.length}개`);
    
    if (configs.length === 0) {
      console.warn(`  ⚠️ 유효한 데이터가 없습니다.`);
      return 0;
    }
    
    // Supabase에 배치 삽입
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < configs.length; i += batchSize) {
      const batch = configs.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from('university_config')
          .upsert(batch, {
            onConflict: 'university_name,department_name,admission_type,exam_type,exam_year',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`  배치 ${Math.floor(i / batchSize) + 1} 오류:`, error.message);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          console.log(`  배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(configs.length / batchSize)} 완료 (${successCount}/${configs.length})`);
        }
      } catch (error: any) {
        console.error(`  배치 ${Math.floor(i / batchSize) + 1} 예외:`, error.message);
        errorCount += batch.length;
      }
    }
    
    console.log(`  ✅ 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);
    return successCount;
    
  } catch (error: any) {
    console.error(`  ❌ 파일 처리 오류:`, error.message);
    return 0;
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('=== university_config 데이터 마이그레이션 시작 ===\n');
  
  // 현재 디렉터리에서 CSV 파일 찾기
  const currentDir = process.cwd();
  const files = fs.readdirSync(currentDir);
  
  const csvFiles = files.filter(file => {
    const lowerFile = file.toLowerCase();
    return (
      lowerFile.includes('이과계열분석결과.csv') ||
      lowerFile.includes('문과계열분석결과.csv')
    );
  });
  
  if (csvFiles.length === 0) {
    console.log('❌ 처리할 CSV 파일을 찾을 수 없습니다.');
    console.log('   파일명에 "이과계열분석결과.csv" 또는 "문과계열분석결과.csv"가 포함되어야 합니다.');
    process.exit(1);
  }
  
  console.log(`발견된 CSV 파일: ${csvFiles.length}개\n`);
  csvFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
  
  // 각 파일 처리
  let totalSuccess = 0;
  for (const file of csvFiles) {
    const filePath = path.join(currentDir, file);
    const successCount = await processCSVFile(filePath);
    totalSuccess += successCount;
  }
  
  console.log(`\n=== 마이그레이션 완료 ===`);
  console.log(`총 성공: ${totalSuccess}개 레코드`);
}

// 스크립트 실행
main().catch(error => {
  console.error('❌ 마이그레이션 오류:', error);
  process.exit(1);
});

