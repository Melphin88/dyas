import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'

// 대학 추천 계산 함수
async function calculateUniversityRecommendations(studentData: any, preferredMajors: string[]) {
  console.log('=== 대학 추천 계산 시작 ===')
  console.log('학생 데이터:', JSON.stringify(studentData, null, 2))
  console.log('지망학과:', preferredMajors)
  
  // 모의 데이터 (실제로는 데이터베이스에서 가져와야 함)
  const mockUniversities = [
    // 수시 대학들
    { university: '서울대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 2.5, probability: 85 },
    { university: '연세대학교', department: '컴퓨터공학과', admissionType: '수시(종합)', cutline: 2.8, probability: 78 },
    { university: '고려대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 3.0, probability: 72 },
    { university: '성균관대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 3.2, probability: 68 },
    { university: '한양대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 3.5, probability: 65 },
    { university: '중앙대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 3.8, probability: 62 },
    { university: '경희대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 4.0, probability: 58 },
    { university: '동국대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 4.2, probability: 55 },
    { university: '홍익대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 4.5, probability: 52 },
    { university: '국민대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 4.8, probability: 48 },
    { university: '세종대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 5.0, probability: 45 },
    { university: '광운대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 5.2, probability: 42 },
    { university: '명지대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 5.5, probability: 38 },
    { university: '숭실대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 5.8, probability: 35 },
    { university: '인하대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 6.0, probability: 32 },
    { university: '아주대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 6.2, probability: 28 },
    { university: '단국대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 6.5, probability: 25 },
    { university: '가천대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 6.8, probability: 22 },
    { university: '서강대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 7.0, probability: 18 },
    { university: '이화여자대학교', department: '컴퓨터공학과', admissionType: '수시(교과)', cutline: 7.2, probability: 15 },
    
    // 정시 대학들
    { university: '서울대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 2.0, probability: 80 },
    { university: '연세대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 2.5, probability: 75 },
    { university: '고려대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 3.0, probability: 70 },
    { university: '성균관대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 3.5, probability: 65 },
    { university: '한양대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 4.0, probability: 60 },
    { university: '중앙대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 4.5, probability: 55 },
    { university: '경희대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 5.0, probability: 50 },
    { university: '동국대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 5.5, probability: 45 },
    { university: '홍익대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 6.0, probability: 40 },
    { university: '국민대학교', department: '컴퓨터공학과', admissionType: '정시(가)', cutline: 6.5, probability: 35 }
  ]
  
  // 지망학과에 따른 필터링
  const filteredUniversities = mockUniversities.filter(uni => {
    return preferredMajors.some(major => 
      uni.department.includes(major) || major.includes(uni.department)
    )
  })
  
  console.log('필터링된 대학 수:', filteredUniversities.length)
  
  // 학생 성적 추출 (간단한 예시)
  const studentGrade = studentData.schoolGrades?.average || 3.5 // 기본값
  
  // 성적과 커트라인 차이에 따른 정렬
  const sortedUniversities = filteredUniversities
    .map(uni => ({
      ...uni,
      gradeDifference: Math.abs(uni.cutline - studentGrade),
      matchScore: Math.max(0, 100 - Math.abs(uni.cutline - studentGrade) * 20)
    }))
    .sort((a, b) => a.gradeDifference - b.gradeDifference) // 커트라인과 가까운 순으로 정렬
  
  // 수시 20개, 정시 10개로 제한
  const susiRecommendations = sortedUniversities
    .filter(uni => uni.admissionType.includes('수시'))
    .slice(0, 20)
    .map(uni => ({
      university: uni.university,
      department: uni.department,
      admissionType: uni.admissionType,
      probability: uni.probability,
      matchScore: uni.matchScore,
      requirements: {
        minInternalGrade: uni.cutline,
        requiredSubjects: ['국어', '수학', '영어']
      },
      admissionStrategy: '내신 성적 기반 추천',
      competitionAnalysis: `커트라인 ${uni.cutline}등급, 현재 성적과의 차이: ${uni.gradeDifference.toFixed(1)}등급`,
      recommendation: uni.probability >= 70 ? 'optimal' : uni.probability >= 50 ? 'safe' : 'challenge'
    }))
  
  const jeongsiRecommendations = sortedUniversities
    .filter(uni => uni.admissionType.includes('정시'))
    .slice(0, 10)
    .map(uni => ({
      university: uni.university,
      department: uni.department,
      admissionType: uni.admissionType,
      probability: uni.probability,
      matchScore: uni.matchScore,
      requirements: {
        minSuneungGrade: uni.cutline,
        requiredSubjects: ['국어', '수학', '영어']
      },
      admissionStrategy: '수능 성적 기반 추천',
      competitionAnalysis: `커트라인 ${uni.cutline}등급, 현재 성적과의 차이: ${uni.gradeDifference.toFixed(1)}등급`,
      recommendation: uni.probability >= 70 ? 'optimal' : uni.probability >= 50 ? 'safe' : 'challenge'
    }))
  
  const allRecommendations = [...susiRecommendations, ...jeongsiRecommendations]
  
  console.log('최종 추천 대학 수:', allRecommendations.length)
  console.log('수시 추천:', susiRecommendations.length)
  console.log('정시 추천:', jeongsiRecommendations.length)
  
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

// 간단한 헬스체크
app.get('/server/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Edge Function is working!'
  })
})

// 간단한 CSV 파일 목록 (빈 배열 반환)
app.get('/server/csv-files/:type', (c) => {
  const type = c.req.param('type')
  return c.json({ 
    files: [],
    type: type,
    message: 'No files uploaded yet'
  })
})

// 간단한 CSV 업로드 (모의 응답)
app.post('/server/upload-csv-file/:type', async (c) => {
  const type = c.req.param('type')
  const body = await c.req.json()
  
  return c.json({ 
    success: true,
    message: `Mock upload for ${type}`,
    filename: body.filename || 'test.csv',
    count: body.csvData?.length || 0
  })
})

// 간단한 CSV 데이터 (빈 배열 반환)
app.get('/server/csv-data/:type/:fileId', (c) => {
  const type = c.req.param('type')
  const fileId = c.req.param('fileId')
  
  return c.json({ 
    data: [],
    type: type,
    fileId: fileId,
    message: 'No data available'
  })
})

// 기타 엔드포인트들 (모의 응답)
app.post('/server/apply-csv-file/:type/:fileId', (c) => {
  return c.json({ success: true, message: 'Mock apply' })
})

app.delete('/server/csv-file/:type/:fileId', (c) => {
  return c.json({ success: true, message: 'Mock delete' })
})

app.get('/server/university-data/:type', (c) => {
  return c.json({ data: [] })
})

app.post('/server/upload-csv', (c) => {
  return c.json({ success: true, message: 'Mock upload' })
})

app.get('/server/university-data', (c) => {
  return c.json({ data: [] })
})

app.post('/server/save-scores', (c) => {
  return c.json({ success: true })
})

app.get('/server/my-scores', (c) => {
  return c.json({ scores: null })
})

app.get('/server/all-scores', (c) => {
  return c.json({ scores: [] })
})

app.delete('/server/delete-user-scores/:userId', (c) => {
  return c.json({ success: true })
})

app.post('/server/signup', (c) => {
  return c.json({ success: true, message: 'Mock signup' })
})

app.post('/server/signin', (c) => {
  return c.json({ user: { id: 'mock', name: 'Mock User' } })
})

app.get('/server/auth/me', (c) => {
  return c.json({ id: 'mock', name: 'Mock User' })
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