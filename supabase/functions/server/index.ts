import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'

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
    
    // 하드코딩된 추천 대학들 (실제로는 데이터베이스에서 가져와야 함)
    const mockRecommendations = [
      {
        university: '서울대학교',
        department: preferredMajors[0] || '컴퓨터공학과',
        admissionType: '수시(교과)',
        probability: 85,
        matchScore: 92,
        requirements: {
          minInternalGrade: 2.5,
          minSuneungGrade: 3,
          requiredSubjects: ['국어', '수학', '영어']
        },
        admissionStrategy: '내신 중심 전형으로 지원 권장',
        competitionAnalysis: '경쟁률이 높지만 성적이 우수하여 합격 가능성 높음',
        recommendation: 'optimal' as const
      },
      {
        university: '연세대학교',
        department: preferredMajors[0] || '경영학과',
        admissionType: '수시(종합)',
        probability: 78,
        matchScore: 88,
        requirements: {
          minInternalGrade: 2.8,
          minSuneungGrade: 4,
          requiredSubjects: ['국어', '수학', '영어']
        },
        admissionStrategy: '학생부종합전형으로 지원 권장',
        competitionAnalysis: '다양한 평가 요소로 인해 성적 외 요소도 중요',
        recommendation: 'safe' as const
      },
      {
        university: '고려대학교',
        department: preferredMajors[0] || '경영학과',
        admissionType: '정시(가)',
        probability: 65,
        matchScore: 82,
        requirements: {
          minInternalGrade: 3.0,
          minSuneungGrade: 2,
          requiredSubjects: ['국어', '수학', '영어']
        },
        admissionStrategy: '정시 전형으로 지원 권장',
        competitionAnalysis: '수능 성적이 중요하며 내신보다 수능 비중이 높음',
        recommendation: 'challenge' as const
      }
    ]
    
    // 지망학과에 따른 필터링
    const filteredRecommendations = mockRecommendations.map(rec => ({
      ...rec,
      department: preferredMajors[0] || rec.department
    }))
    
    console.log('필터링된 추천:', filteredRecommendations)
    
    return c.json({
      success: true,
      recommendations: filteredRecommendations,
      debugInfo: {
        receivedMajors: preferredMajors,
        totalRecommendations: filteredRecommendations.length,
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