import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kgbcqvvkahugbrqlomjc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYmNxdnZrYWh1Z2JycWxvbWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODM5MjgsImV4cCI6MjA3MTI1OTkyOH0.o23VzWrv9Kv6jWb7eIw4a3rWkkWfA5TQyU2Z1RRhvQI';

if (!supabaseKey) {
  console.error('❌ Supabase 키가 설정되지 않았습니다.');
  console.error('환경변수 VITE_SUPABASE_ANON_KEY 또는 SUPABASE_ANON_KEY를 설정해주세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PercentageRow {
  exam_yyyymm: number;
  cumulative_percentile: number;
  reference_score: number;
}

// CSV 파일 파싱
function parseCSV(filePath: string): PercentageRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 첫 번째 줄은 제목, 두 번째 줄은 빈 줄, 세 번째 줄은 헤더
  // 실제 데이터는 네 번째 줄부터 시작
  const dataLines = lines.slice(3); // 헤더 이후부터
  
  const rows: PercentageRow[] = [];
  const examYyyymm = 202509; // 2509 -> 202509 변환
  
  for (const line of dataLines) {
    // CSV 파싱 (쉼표로 구분, 따옴표 처리)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // 마지막 값
    
    if (values.length < 3) continue; // 최소 3개 컬럼 필요
    
    // 첫 번째 컬럼: 누적백분위 (cumulative_percentile)
    // 세 번째 컬럼: 기준 환산점수 (reference_score, ★표점합 이과)
    const cumulativePercentile = parseFloat(values[0]?.replace(/,/g, '') || '0');
    const referenceScore = parseFloat(values[2]?.replace(/,/g, '') || '0');
    
    // 유효한 데이터만 추가
    if (!isNaN(cumulativePercentile) && !isNaN(referenceScore) && cumulativePercentile >= 0 && cumulativePercentile <= 100) {
      rows.push({
        exam_yyyymm: examYyyymm,
        cumulative_percentile: cumulativePercentile,
        reference_score: referenceScore
      });
    }
  }
  
  return rows;
}

// 배치 삽입 함수
async function insertBatch(rows: PercentageRow[], batchSize: number = 100) {
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from('percentage_lookup_table')
        .upsert(batch, {
          onConflict: 'exam_yyyymm,cumulative_percentile',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`배치 ${Math.floor(i / batchSize) + 1} 삽입 오류:`, error);
        failCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)} 완료 (${i + batch.length}/${rows.length})`);
      }
    } catch (error) {
      console.error(`배치 ${Math.floor(i / batchSize) + 1} 예외 발생:`, error);
      failCount += batch.length;
    }
  }
  
  return { successCount, failCount };
}

// 메인 실행 함수
async function main() {
  const csvFilePath = path.join(process.cwd(), '2509PERCENTAGE.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV 파일을 찾을 수 없습니다: ${csvFilePath}`);
    process.exit(1);
  }
  
  console.log('📄 CSV 파일 파싱 중...');
  const rows = parseCSV(csvFilePath);
  console.log(`✅ 총 ${rows.length}개의 레코드를 파싱했습니다.`);
  
  if (rows.length === 0) {
    console.error('❌ 파싱된 데이터가 없습니다.');
    process.exit(1);
  }
  
  // 샘플 데이터 출력
  console.log('\n📊 샘플 데이터 (처음 5개):');
  rows.slice(0, 5).forEach((row, idx) => {
    console.log(`  ${idx + 1}. exam_yyyymm: ${row.exam_yyyymm}, cumulative_percentile: ${row.cumulative_percentile}, reference_score: ${row.reference_score}`);
  });
  
  console.log('\n💾 데이터베이스에 삽입 중...');
  const { successCount, failCount } = await insertBatch(rows);
  
  console.log('\n=== 마이그레이션 완료 ===');
  console.log(`✅ 성공: ${successCount}개`);
  if (failCount > 0) {
    console.log(`❌ 실패: ${failCount}개`);
  }
}

main().catch(console.error);

