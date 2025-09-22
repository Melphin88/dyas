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
    'Origin'
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

Deno.serve(app.fetch)