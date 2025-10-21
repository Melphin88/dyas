import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'

// CSV 데이터에서 대학 정보 로드
async function loadUniversityDataFromCSV(preferredMajors: string[]) {
  console.log('CSV 데이터 로드 시작, 지망학과:', preferredMajors)
  
  try {
    // 수시 데이터 로드
    const susiResponse = await fetch('https://raw.githubusercontent.com/Melphin88/dyas/main/uadiga_full_data.csv')
    const susiText = await susiResponse.text()
    const susiLines = susiText.split('\n').slice(1) // 헤더 제외
    
    // 정시 데이터 로드  
    const jeongsiResponse = await fetch('https://raw.githubusercontent.com/Melphin88/dyas/main/uadiga_jeongsi_full_data.csv')
    const jeongsiText = await jeongsiResponse.text()
    const jeongsiLines = jeongsiText.split('\n').slice(1) // 헤더 제외
    
    const universities = []
    
    // 수시 데이터 처리
    for (const line of susiLines) {
      if (!line.trim()) continue
      
      const columns = line.split(',')
      if (columns.length < 18) continue
      
      const [region, university, category, highschoolType, admissionType, year, department, perfectScore, convert50Cut, convert70Cut, grade50Cut, grade70Cut, recruitmentCount, competitionRate, additionalPass, totalApply, passNum, realCompetitionRate] = columns
      
      // 지망학과와 매칭되는지 확인
      const isMatchingMajor = preferredMajors.some(major => 
        department.includes(major) || major.includes(department)
      )
      
      if (isMatchingMajor && grade70Cut && !isNaN(parseFloat(grade70Cut))) {
        universities.push({
          university: university.trim(),
          department: department.trim(),
          admissionType: admissionType.trim(),
          cutline: parseFloat(grade70Cut),
          region: region.trim(),
          year: parseInt(year) || 2023,
          recruitmentCount: parseInt(recruitmentCount) || 0,
          competitionRate: parseFloat(competitionRate) || 0,
          category: category.trim()
        })
      }
    }
    
    // 정시 데이터 처리
    for (const line of jeongsiLines) {
      if (!line.trim()) continue
      
      const columns = line.split(',')
      if (columns.length < 22) continue
      
      const [region, university, category, admissionType, year, department, perfectScore, convert50Cut, convert70Cut, grade50Cut, grade70Cut, korean, math, inquiry, average, english, recruitmentCount, competitionRate, additionalPass, totalApply, passNum, realCompetitionRate] = columns
      
      // 지망학과와 매칭되는지 확인
      const isMatchingMajor = preferredMajors.some(major => 
        department.includes(major) || major.includes(department)
      )
      
      if (isMatchingMajor && grade70Cut && !isNaN(parseFloat(grade70Cut))) {
        universities.push({
          university: university.trim(),
          department: department.trim(),
          admissionType: admissionType.trim(),
          cutline: parseFloat(grade70Cut),
          region: region.trim(),
          year: parseInt(year) || 2023,
          recruitmentCount: parseInt(recruitmentCount) || 0,
          competitionRate: parseFloat(competitionRate) || 0,
          category: category.trim()
        })
      }
    }
    
    console.log(`CSV에서 로드된 대학 수: ${universities.length}`)
    console.log('로드된 대학 샘플:', universities.slice(0, 5))
    
    return universities
    
  } catch (error) {
    console.error('CSV 데이터 로드 실패:', error)
    return []
  }
}

// 대학 추천 계산 함수
async function calculateUniversityRecommendations(studentData: any, preferredMajors: string[]) {
  console.log('=== 대학 추천 계산 시작 ===')
  console.log('학생 데이터:', JSON.stringify(studentData, null, 2))
  console.log('지망학과:', preferredMajors)
  
  // CSV 데이터에서 실제 대학 정보 읽기
  const universities = await loadUniversityDataFromCSV(preferredMajors)
  console.log('로드된 대학 수:', universities.length)
  
  // CSV 데이터가 없으면 빈 배열 반환
  if (universities.length === 0) {
    console.log('CSV에서 매칭되는 대학이 없습니다.')
    return []
  }
  
  // 지망학과에 따른 필터링
  console.log('전체 대학 수:', universities.length)
  console.log('지망학과 목록:', preferredMajors)
  console.log('학생 데이터 상세:', JSON.stringify(studentData, null, 2))
  
  const filteredUniversities = universities.filter(uni => {
    const matches = preferredMajors.some(major => 
      uni.department.includes(major) || major.includes(uni.department)
    )
    if (matches) {
      console.log(`매칭된 대학: ${uni.university} ${uni.department}`)
    }
    return matches
  })
  
  console.log('필터링된 대학 수:', filteredUniversities.length)
  console.log('필터링된 대학 목록:', filteredUniversities.map(uni => `${uni.university} ${uni.department}`))
  
  // 필터링된 대학이 없으면 기본 추천 대학 제공
  let finalUniversities = filteredUniversities
  if (filteredUniversities.length === 0) {
    console.log('필터링된 대학이 없어서 기본 추천 대학을 제공합니다.')
    finalUniversities = universities.slice(0, 30) // 상위 30개 대학
  }
  
  // 학생 성적 추출 (더 현실적인 계산)
  let studentGrade = 3.5 // 기본값
  
  // simpleGradeData에서 성적 계산
  if (studentData.schoolGrades) {
    const grades = studentData.schoolGrades
    const allGrades = []
    
    // 각 학년별 성적 수집
    Object.keys(grades).forEach(gradeLevel => {
      if (grades[gradeLevel] && typeof grades[gradeLevel] === 'object') {
        Object.keys(grades[gradeLevel]).forEach(semester => {
          if (grades[gradeLevel][semester] && typeof grades[gradeLevel][semester] === 'object') {
            Object.keys(grades[gradeLevel][semester]).forEach(subject => {
              const subjectData = grades[gradeLevel][semester][subject]
              if (subjectData && typeof subjectData === 'object' && subjectData.grade) {
                allGrades.push(subjectData.grade)
              }
            })
          }
        })
      }
    })
    
    if (allGrades.length > 0) {
      studentGrade = allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length
    }
  }
  
  console.log('계산된 학생 성적:', studentGrade)
  
  // 성적과 커트라인 차이에 따른 정렬 및 합격율 계산
  const sortedUniversities = finalUniversities
    .map(uni => {
      const gradeDifference = Math.abs(uni.cutline - studentGrade)
      const matchScore = Math.max(0, 100 - gradeDifference * 20)
      
      // 합격율 계산 (더 현실적인 계산)
      let admissionRate = 50 // 기본값
      
      if (studentGrade <= uni.cutline) {
        // 학생 성적이 커트라인보다 좋거나 같으면 안정권
        admissionRate = Math.min(95, 80 + (uni.cutline - studentGrade) * 10)
      } else {
        // 학생 성적이 커트라인보다 낮으면 도전권
        const gap = studentGrade - uni.cutline
        if (gap <= 0.5) {
          admissionRate = 60 // 약간 도전
        } else if (gap <= 1.0) {
          admissionRate = 40 // 도전
        } else if (gap <= 1.5) {
          admissionRate = 25 // 상당한 도전
        } else {
          admissionRate = 10 // 매우 도전적
        }
      }
      
      return {
        ...uni,
        gradeDifference,
        matchScore,
        admissionRate: Math.round(admissionRate)
      }
    })
    .sort((a, b) => a.gradeDifference - b.gradeDifference) // 커트라인과 가까운 순으로 정렬
  
  // 수시 20개, 정시 10개로 제한
  const susiRecommendations = sortedUniversities
    .filter(uni => uni.admissionType.includes('수시'))
    .slice(0, 20)
    .map(uni => ({
      university: uni.university,
      department: uni.department,
      admissionType: uni.admissionType,
      probability: Math.max(0, Math.min(100, uni.admissionRate)), // 0-100% 범위로 제한
      matchScore: uni.matchScore,
      requirements: {
        minInternalGrade: uni.cutline,
        requiredSubjects: ['국어', '수학', '영어']
      },
      admissionStrategy: '내신 성적 기반 추천',
      competitionAnalysis: `커트라인 ${uni.cutline}등급, 현재 성적과의 차이: ${uni.gradeDifference.toFixed(1)}등급`,
      recommendation: uni.admissionRate >= 80 ? 'optimal' : uni.admissionRate >= 60 ? 'safe' : 'challenge'
    }))
  
  const jeongsiRecommendations = sortedUniversities
    .filter(uni => uni.admissionType.includes('정시'))
    .slice(0, 10)
    .map(uni => ({
      university: uni.university,
      department: uni.department,
      admissionType: uni.admissionType,
      probability: Math.max(0, Math.min(100, uni.admissionRate)), // 0-100% 범위로 제한
      matchScore: uni.matchScore,
      requirements: {
        minSuneungGrade: uni.cutline,
        requiredSubjects: ['국어', '수학', '영어']
      },
      admissionStrategy: '수능 성적 기반 추천',
      competitionAnalysis: `커트라인 ${uni.cutline}등급, 현재 성적과의 차이: ${uni.gradeDifference.toFixed(1)}등급`,
      recommendation: uni.admissionRate >= 80 ? 'optimal' : uni.admissionRate >= 60 ? 'safe' : 'challenge'
    }))
  
  const allRecommendations = [...susiRecommendations, ...jeongsiRecommendations]
  
  console.log('최종 추천 대학 수:', allRecommendations.length)
  console.log('수시 추천:', susiRecommendations.length)
  console.log('정시 추천:', jeongsiRecommendations.length)
  console.log('정시 대학 필터링 결과:', sortedUniversities.filter(uni => uni.admissionType.includes('정시')).length)
  console.log('전체 정시 대학 수:', finalUniversities.filter(uni => uni.admissionType.includes('정시')).length)
  
  return allRecommendations
}

const app = new Hono()

// CORS 설정
app.use('*', cors({
  origin: [
    'https://dyas.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  allowHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400
}))

// OPTIONS 요청 처리
app.options('*', (c) => {
  return c.text('', 200)
})

// 대학 추천 계산 엔드포인트
app.post('/server/calculate-recommendations', async (c) => {
  try {
    console.log('=== calculate-recommendations 엔드포인트 호출됨 ===')
    console.log('요청 헤더:', c.req.header())
    console.log('요청 메서드:', c.req.method)
    
    const body = await c.req.json()
    const { studentData, debugMode } = body
    
    console.log('받은 학생 데이터:', JSON.stringify(studentData, null, 2))
    
    // 지망학과 정보 확인
    const preferredMajors = studentData.preferredMajors || []
    console.log('지망학과:', preferredMajors)
    
    // 실제 추천 로직 구현
    const recommendations = await calculateUniversityRecommendations(studentData, preferredMajors)
    
    console.log('계산된 추천 대학:', recommendations.length)
    console.log('수시 추천:', recommendations.filter(r => r.admissionType?.includes('수시')).length)
    console.log('정시 추천:', recommendations.filter(r => r.admissionType?.includes('정시')).length)
    
    return c.json({
      success: true,
      recommendations: recommendations,
      debugInfo: {
        receivedMajors: preferredMajors,
        totalRecommendations: recommendations.length,
        susiCount: recommendations.filter(r => r.admissionType?.includes('수시')).length,
        jeongsiCount: recommendations.filter(r => r.admissionType?.includes('정시')).length,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('추천 계산 오류:', error)
    return c.json({
      success: false,
      error: '추천 계산 중 오류가 발생했습니다.',
      recommendations: []
    }, 500)
  }
})

Deno.serve(app.fetch)