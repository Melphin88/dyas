const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 설정
const supabaseUrl = 'https://kgbcqvvkahugbrqlomjc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYmNxdnZrYWh1Z2JycWxvbWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODM5MjgsImV4cCI6MjA3MTI1OTkyOH0.o23VzWrv9Kv6jWb7eIw4a3rWkkWfA5TQyU2Z1RRhvQI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// CSV 파일 경로
const susiCsvPath = 'C:\\Users\\user\\Desktop\\web_scraper\\uadiga_full_data.csv';
const jeongsiCsvPath = 'C:\\Users\\user\\Desktop\\web_scraper\\uadiga_jeongsi_full_data.csv';

// CSV 파일 읽기 함수
function readCsvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          let value = values[index];
          // 숫자로 변환 가능한 경우 변환
          if (value && !isNaN(value) && value !== '') {
            if (value.includes('.')) {
              value = parseFloat(value);
            } else {
              value = parseInt(value);
            }
          }
          row[header] = value;
        });
        data.push(row);
      }
    }
    
    return data;
  } catch (error) {
    console.error('CSV 파일 읽기 오류:', error);
    return [];
  }
}

// 수시 데이터 파싱
function parseSusiData(csvData) {
  return csvData.map(row => ({
    region: row.region || '',
    university: row.university || '',
    category: row.category || '',
    highschool_type: row.highschool_type || '',
    admission_type: row.admission_type || '',
    year: row.year || 2024,
    department: row.department || '',
    perfect_score: row.perfect_score || 0,
    convert_50_cut: row.convert_50_cut || 0,
    convert_70_cut: row.convert_70_cut || 0,
    grade_50_cut: row.grade_50_cut || 0,
    grade_70_cut: row.grade_70_cut || 0,
    recruitment_count: row.recruitment_count || 0,
    competition_rate: row.competition_rate || 0,
    additional_pass: row.additional_pass || 0,
    total_apply: row.total_apply || 0,
    pass_num: row.pass_num || 0,
    real_competition_rate: row.real_competition_rate || 0
  }));
}

// 정시 데이터 파싱
function parseJeongsiData(csvData) {
  return csvData.map(row => ({
    region: row.region || '',
    university: row.university || '',
    category: row.category || '',
    admission_type: row.admission_type || '',
    year: row.year || 2024,
    department: row.department || '',
    perfect_score: row.perfect_score || 0,
    convert_50_cut: row.convert_50_cut || 0,
    convert_70_cut: row.convert_70_cut || 0,
    grade_50_cut: row.grade_50_cut || 0,
    grade_70_cut: row.grade_70_cut || 0,
    korean: row.korean || 0,
    math: row.math || 0,
    inquiry: row.inquiry || 0,
    average: row.average || 0,
    english: row.english || 0,
    recruitment_count: row.recruitment_count || 0,
    competition_rate: row.competition_rate || 0,
    additional_pass: row.additional_pass || 0,
    total_apply: row.total_apply || 0,
    pass_num: row.pass_num || 0,
    real_competition_rate: row.real_competition_rate || 0
  }));
}

// 데이터 삽입 함수
async function insertData(tableName, data, fileInfo) {
  try {
    console.log(`${tableName} 테이블에 ${data.length}개 데이터 삽입 중...`);
    
    // 파일 메타데이터 먼저 삽입
    const { data: fileData, error: fileError } = await supabase
      .from('csv_files')
      .insert([fileInfo])
      .select();
    
    if (fileError) {
      console.error('파일 메타데이터 삽입 오류:', fileError);
      return;
    }
    
    const fileId = fileData[0].id;
    console.log(`파일 ID 생성: ${fileId}`);
    
    // 데이터에 file_id 추가
    const dataWithFileId = data.map(row => ({
      ...row,
      file_id: fileId
    }));
    
    // 배치로 데이터 삽입 (1000개씩)
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = dataWithFileId.slice(i, i + batchSize);
      const { error } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (error) {
        console.error(`${tableName} 배치 삽입 오류 (${i}-${i + batch.length}):`, error);
      } else {
        console.log(`${tableName} 배치 삽입 완료: ${i + 1}-${Math.min(i + batchSize, data.length)}`);
      }
    }
    
    console.log(`${tableName} 테이블 데이터 삽입 완료!`);
    
  } catch (error) {
    console.error(`${tableName} 데이터 삽입 오류:`, error);
  }
}

// 메인 실행 함수
async function main() {
  console.log('CSV 파일을 Supabase에 업로드 시작...\n');
  
  // 수시 데이터 처리
  console.log('=== 수시 데이터 처리 ===');
  const susiCsvData = readCsvFile(susiCsvPath);
  console.log(`수시 CSV 파일 읽기 완료: ${susiCsvData.length}개 행`);
  
  if (susiCsvData.length > 0) {
    const susiData = parseSusiData(susiCsvData);
    const susiFileInfo = {
      filename: 'uadiga_full_data.csv',
      data_count: susiData.length,
      is_active: true,
      type: 'susi'
    };
    
    await insertData('susi_university_data', susiData, susiFileInfo);
  }
  
  console.log('\n=== 정시 데이터 처리 ===');
  const jeongsiCsvData = readCsvFile(jeongsiCsvPath);
  console.log(`정시 CSV 파일 읽기 완료: ${jeongsiCsvData.length}개 행`);
  
  if (jeongsiCsvData.length > 0) {
    const jeongsiData = parseJeongsiData(jeongsiCsvData);
    const jeongsiFileInfo = {
      filename: 'uadiga_jeongsi_full_data.csv',
      data_count: jeongsiData.length,
      is_active: true,
      type: 'jeongsi'
    };
    
    await insertData('jeongsi_university_data', jeongsiData, jeongsiFileInfo);
  }
  
  console.log('\n=== 업로드 완료! ===');
  console.log('Supabase 대시보드에서 데이터를 확인하세요:');
  console.log('https://supabase.com/dashboard/project/kgbcqvvkahugbrqlomjc/editor');
}

// 스크립트 실행
main().catch(console.error); 