/**
 * percentage_lookup_table 테이블 데이터 마이그레이션 스크립트 (v2)
 * 
 * 2509PERCENTAGE.csv 파일을 읽어서 Supabase의 percentage_lookup_table 테이블에 데이터를 삽입합니다.
 * 
 * 사용법:
 *   npx tsx scripts/migrate-percentage-lookup-v2.ts
 */

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
  ref_score_p_science: number;
  ref_score_s_science: number;
  ref_score_p_liberal: number;
  ref_score_s_liberal: number;
}

// CSV 파일 파싱
function parseCSV(filePath: string): PercentageRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 4행이 헤더 (인덱스 3)
  if (lines.length < 4) {
    throw new Error('CSV 파일에 헤더가 없습니다.');
  }
  
  const headerLine = lines[3];
  const headers = parseCSVLine(headerLine);
  
  // 헤더에서 컬럼 인덱스 찾기
  const cumulativePercentileIdx = headers.findIndex(h => h === '%' || h.trim() === '%');
  const refScorePScienceIdx = headers.findIndex(h => h.includes('★백분위합 이과') || h.includes('백분위합 이과'));
  const refScoreSScienceIdx = headers.findIndex(h => h.includes('★표점합 이과') || h.includes('표점합 이과'));
  const refScorePLiberalIdx = headers.findIndex(h => h.includes('★백분위합 문과') || h.includes('백분위합 문과'));
  const refScoreSLiberalIdx = headers.findIndex(h => h.includes('★표점합 문과') || h.includes('표점합 문과'));
  
  console.log('📋 헤더 인덱스:');
  console.log(`  cumulative_percentile: ${cumulativePercentileIdx} (${headers[cumulativePercentileIdx]})`);
  console.log(`  ref_score_p_science: ${refScorePScienceIdx} (${headers[refScorePScienceIdx]})`);
  console.log(`  ref_score_s_science: ${refScoreSScienceIdx} (${headers[refScoreSScienceIdx]})`);
  console.log(`  ref_score_p_liberal: ${refScorePLiberalIdx} (${headers[refScorePLiberalIdx]})`);
  console.log(`  ref_score_s_liberal: ${refScoreSLiberalIdx} (${headers[refScoreSLiberalIdx]})`);
  
  if (cumulativePercentileIdx === -1 || refScorePScienceIdx === -1 || refScoreSScienceIdx === -1 || 
      refScorePLiberalIdx === -1 || refScoreSLiberalIdx === -1) {
    throw new Error('필수 컬럼을 찾을 수 없습니다.');
  }
  
  // 실제 데이터는 5행부터 시작 (인덱스 4)
  const dataLines = lines.slice(4);
  
  const rows: PercentageRow[] = [];
  const examYyyymm = 202509; // 2509 -> 202509 변환
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    
    if (values.length < Math.max(cumulativePercentileIdx, refScorePScienceIdx, refScoreSScienceIdx, 
                                 refScorePLiberalIdx, refScoreSLiberalIdx) + 1) {
      continue; // 컬럼 수가 부족한 행은 스킵
    }
    
    const cumulativePercentile = parseFloat(values[cumulativePercentileIdx]?.replace(/,/g, '') || '0');
    const refScorePScience = parseFloat(values[refScorePScienceIdx]?.replace(/,/g, '') || '0');
    const refScoreSScience = parseFloat(values[refScoreSScienceIdx]?.replace(/,/g, '') || '0');
    const refScorePLiberal = parseFloat(values[refScorePLiberalIdx]?.replace(/,/g, '') || '0');
    const refScoreSLiberal = parseFloat(values[refScoreSLiberalIdx]?.replace(/,/g, '') || '0');
    
    // 유효한 데이터만 추가
    if (!isNaN(cumulativePercentile) && cumulativePercentile >= 0 && cumulativePercentile <= 100 &&
        !isNaN(refScorePScience) && !isNaN(refScoreSScience) && 
        !isNaN(refScorePLiberal) && !isNaN(refScoreSLiberal)) {
      rows.push({
        exam_yyyymm: examYyyymm,
        cumulative_percentile: cumulativePercentile,
        ref_score_p_science: refScorePScience,
        ref_score_s_science: refScoreSScience,
        ref_score_p_liberal: refScorePLiberal,
        ref_score_s_liberal: refScoreSLiberal
      });
    }
  }
  
  return rows;
}

// CSV 라인 파싱 (쉼표로 구분, 따옴표 처리)
function parseCSVLine(line: string): string[] {
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
  
  return values;
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
    console.log(`  ${idx + 1}. exam_yyyymm: ${row.exam_yyyymm}, cumulative_percentile: ${row.cumulative_percentile}`);
    console.log(`     이과 - 백분위합: ${row.ref_score_p_science}, 표점합: ${row.ref_score_s_science}`);
    console.log(`     문과 - 백분위합: ${row.ref_score_p_liberal}, 표점합: ${row.ref_score_s_liberal}`);
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

