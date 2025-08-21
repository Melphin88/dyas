import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { createClient } from 'npm:@supabase/supabase-js'
import * as kv from './kv_store.ts'

const app = new Hono()

// Enhanced CORS 설정 - 더 구체적인 설정
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

// OPTIONS 요청 처리 (preflight)
app.options('*', (c) => {
  return c.text('', 200)
})

// 로깅 미들웨어 (수동 구현)
app.use('*', async (c, next) => {
  const start = Date.now()
  console.log(`${c.req.method} ${c.req.url}`)
  await next()
  const ms = Date.now() - start
  console.log(`${c.req.method} ${c.req.url} - ${c.res.status} (${ms}ms)`)
})

// Supabase 클라이언트 생성
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// 사용자 인증 미들웨어
async function requireAuth(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (!user?.id || error) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

// 관리자 권한 확인
async function requireAdmin(request: Request) {
  const user = await requireAuth(request);
  const userData = await kv.get(`user:${user.id}`);
  
  if (!userData?.isAdmin) {
    throw new Error('Admin access required');
  }
  
  return { user, userData };
}

// 수시 CSV 파일 데이터 인터페이스
interface SusiUniversityData {
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

// 정시 CSV 파일 데이터 인터페이스
interface JeongsiUniversityData {
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

interface CSVFileRecord {
  id: string;
  filename: string;
  uploadDate: string;
  dataCount: number;
  isActive: boolean;
  type: 'susi' | 'jeongsi';
}

// 데이터 청킹 함수
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// 안전한 파일 레코드 검증
function validateFileRecord(record: any): record is CSVFileRecord {
  return record && 
         typeof record === 'object' &&
         typeof record.id === 'string' &&
         typeof record.filename === 'string' &&
         typeof record.uploadDate === 'string' &&
         typeof record.dataCount === 'number' &&
         typeof record.isActive === 'boolean' &&
         (record.type === 'susi' || record.type === 'jeongsi');
}

// 회원가입
app.post('/server/signup', async (c) => {
  try {
    const { email, password, name, isAdmin } = await c.req.json()
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, isAdmin: isAdmin || false },
      // 이메일 서버가 설정되지 않았으므로 자동으로 이메일을 확인합니다
      email_confirm: true
    })

    if (error) {
      console.error('회원가입 중 오류:', error)
      return c.json({ error: error.message }, 400)
    }

    // 사용자 정보를 KV에 저장
    const isFirstUser = (await kv.getByPrefix('user:')).length === 0
    const userData = {
      id: data.user.id,
      email,
      name,
      isAdmin: isAdmin || isFirstUser, // 첫 번째 사용자는 관리자 또는 명시적으로 관리자 선택
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`user:${data.user.id}`, userData)
    
    return c.json({ 
      success: true, 
      user: userData,
      message: userData.isAdmin ? '관리자 계정으로 생성되었습니다.' : '일반 사용자 계정으로 생성되었습니다.'
    })
  } catch (error) {
    console.error('회원가입 처리 중 오류:', error)
    return c.json({ error: '회원가입에 실패했습니다' }, 500)
  }
})

// 로그인 후 사용자 정보 확인
app.post('/server/signin', async (c) => {
  try {
    const user = await requireAuth(c.req.raw)
    const userData = await kv.get(`user:${user.id}`)
    
    if (!userData) {
      return c.json({ error: '사용자 정보를 찾을 수 없습니다' }, 404)
    }
    
    return c.json({ user: userData })
  } catch (error) {
    console.error('로그인 확인 중 오류:', error)
    return c.json({ error: '인증에 실패했습니다' }, 401)
  }
})

// 현재 사용자 정보
app.get('/server/auth/me', async (c) => {
  try {
    const user = await requireAuth(c.req.raw)
    const userData = await kv.get(`user:${user.id}`)
    
    return c.json(userData)
  } catch (error) {
    return c.json({ error: '인증에 실패했습니다' }, 401)
  }
})

// CSV 파일 업로드 및 버전 관리 (수시/정시 분리) - 개선된 버전
app.post('/server/upload-csv-file/:type', async (c) => {
  try {
    const type = c.req.param('type') as 'susi' | 'jeongsi'
    
    if (type !== 'susi' && type !== 'jeongsi') {
      return c.json({ error: '유효하지 않은 파일 타입입니다' }, 400)
    }
    
    const { filename, csvData } = await c.req.json()
    
    if (!filename || !csvData || !Array.isArray(csvData)) {
      return c.json({ error: '유효하지 않은 파일 데이터입니다' }, 400)
    }
    
    console.log(`Processing ${type} upload: ${filename} with ${csvData.length} records`)
    
    const currentTime = new Date().toISOString()
    const fileId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 새 파일 메타데이터 생성
    const newFileRecord: CSVFileRecord = {
      id: fileId,
      filename: filename,
      uploadDate: currentTime,
      dataCount: csvData.length,
      isActive: true,
      type: type
    }
    
    // 기존 해당 타입 파일들 조회 및 비활성화
    console.log(`Loading existing ${type} files...`)
    const existingFiles = await kv.getByPrefix(`${type}_file_`)
    const validExistingFiles = existingFiles
      .map(item => item.value)
      .filter(validateFileRecord)
    
    console.log(`Found ${validExistingFiles.length} existing ${type} files`)
    
    // 10개 이상이면 가장 오래된 것부터 삭제
    const sortedFiles = validExistingFiles.sort((a, b) => 
      new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
    )
    
    if (sortedFiles.length >= 10) {
      const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 9)
      console.log(`Deleting ${filesToDelete.length} old files...`)
      
      for (const fileToDelete of filesToDelete) {
        try {
          await kv.del(`${type}_file_${fileToDelete.id}`)
          await kv.del(`${type}_data_${fileToDelete.id}`)
          console.log(`Deleted old file: ${fileToDelete.filename}`)
        } catch (error) {
          console.warn(`Failed to delete old file ${fileToDelete.id}:`, error)
        }
      }
    }
    
    // 남은 파일들 비활성화
    const remainingFiles = sortedFiles.slice(-(9))
    for (const file of remainingFiles) {
      try {
        const updatedFile = { ...file, isActive: false }
        await kv.set(`${type}_file_${file.id}`, updatedFile)
      } catch (error) {
        console.warn(`Failed to update file ${file.id}:`, error)
      }
    }
    
    // 대용량 데이터를 청킹하여 저장
    console.log(`Storing new ${type} file metadata...`)
    await kv.set(`${type}_file_${fileId}`, newFileRecord)
    
    // 데이터가 크면 청킹하여 저장
    const CHUNK_SIZE = 100 // 한 번에 100개 레코드씩 처리
    if (csvData.length > CHUNK_SIZE) {
      console.log(`Chunking large dataset (${csvData.length} records) into ${CHUNK_SIZE} record chunks...`)
      const chunks = chunkArray(csvData, CHUNK_SIZE)
      
      // 청크 인덱스 정보 저장
      await kv.set(`${type}_data_${fileId}_meta`, {
        totalChunks: chunks.length,
        totalRecords: csvData.length,
        chunkSize: CHUNK_SIZE
      })
      
      // 각 청크 저장
      for (let i = 0; i < chunks.length; i++) {
        try {
          await kv.set(`${type}_data_${fileId}_chunk_${i}`, chunks[i])
          console.log(`Stored chunk ${i + 1}/${chunks.length}`)
        } catch (error) {
          console.error(`Failed to store chunk ${i}:`, error)
          throw new Error(`청크 ${i} 저장 실패`)
        }
      }
    } else {
      // 작은 데이터는 그대로 저장
      console.log(`Storing small dataset directly...`)
      await kv.set(`${type}_data_${fileId}`, csvData)
    }
    
    console.log(`${type} CSV 파일 업로드 완료: ${filename} (${csvData.length}개 데이터)`)
    
    return c.json({ 
      success: true, 
      fileId,
      count: csvData.length,
      message: `${filename} 파일이 성공적으로 업로드되었습니다.`
    })
  } catch (error) {
    console.error('CSV 파일 업로드 오류:', error)
    return c.json({ 
      error: '업로드에 실패했습니다',
      details: error.message 
    }, 500)
  }
})

// CSV 파일 목록 조회 (수시/정시 분리) - 개선된 버전
app.get('/server/csv-files/:type', async (c) => {
  try {
    const type = c.req.param('type') as 'susi' | 'jeongsi'
    
    if (type !== 'susi' && type !== 'jeongsi') {
      return c.json({ error: '유효하지 않은 파일 타입입니다' }, 400)
    }
    
    console.log(`Loading ${type} file list...`)
    const files = await kv.getByPrefix(`${type}_file_`)
    
    // 안전하게 파일 레코드 검증 및 정렬
    const validFiles = files
      .map(item => item.value)
      .filter(validateFileRecord)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    
    console.log(`Found ${validFiles.length} valid ${type} files`)
    
    return c.json({ files: validFiles })
  } catch (error) {
    console.error(`${type} CSV 파일 목록 조회 오류:`, error)
    return c.json({ error: '목록 조회에 실패했습니다' }, 500)
  }
})

// 특정 CSV 파일 데이터 조회 - 개선된 버전
app.get('/server/csv-data/:type/:fileId', async (c) => {
  try {
    const type = c.req.param('type') as 'susi' | 'jeongsi'
    const fileId = c.req.param('fileId')
    
    console.log(`Loading ${type} data for file ${fileId}...`)
    
    // 먼저 청킹된 데이터인지 확인
    const metaData = await kv.get(`${type}_data_${fileId}_meta`)
    
    if (metaData && metaData.totalChunks) {
      console.log(`Loading chunked data: ${metaData.totalChunks} chunks, ${metaData.totalRecords} total records`)
      
      // 청킹된 데이터 재구성
      const allData: any[] = []
      for (let i = 0; i < metaData.totalChunks; i++) {
        try {
          const chunkData = await kv.get(`${type}_data_${fileId}_chunk_${i}`)
          if (chunkData && Array.isArray(chunkData)) {
            allData.push(...chunkData)
          }
        } catch (error) {
          console.warn(`Failed to load chunk ${i}:`, error)
        }
      }
      
      console.log(`Reconstructed ${allData.length} records from chunks`)
      return c.json({ data: allData })
    } else {
      // 청킹되지 않은 단일 데이터
      const data = await kv.get(`${type}_data_${fileId}`)
      
      if (!data) {
        return c.json({ error: '파일을 찾을 수 없습니다' }, 404)
      }
      
      console.log(`Loaded single dataset: ${Array.isArray(data) ? data.length : 'unknown'} records`)
      return c.json({ data })
    }
  } catch (error) {
    console.error(`${type} CSV 데이터 조회 오류:`, error)
    return c.json({ error: '데이터 조회에 실패했습니다' }, 500)
  }
})

// CSV 파일 활성화/적용 - 개선된 버전
app.post('/server/apply-csv-file/:type/:fileId', async (c) => {
  try {
    const type = c.req.param('type') as 'susi' | 'jeongsi'
    const fileId = c.req.param('fileId')
    
    console.log(`Applying ${type} file ${fileId}...`)
    
    // 해당 타입의 모든 파일을 비활성화
    const files = await kv.getByPrefix(`${type}_file_`)
    for (const fileItem of files) {
      if (validateFileRecord(fileItem.value)) {
        const updatedFile = { ...fileItem.value, isActive: false }
        await kv.set(fileItem.key, updatedFile)
      }
    }
    
    // 선택된 파일 활성화
    const selectedFile = await kv.get(`${type}_file_${fileId}`)
    if (!selectedFile || !validateFileRecord(selectedFile)) {
      return c.json({ error: '파일을 찾을 수 없습니다' }, 404)
    }
    
    const activatedFile = { ...selectedFile, isActive: true }
    await kv.set(`${type}_file_${fileId}`, activatedFile)
    
    console.log(`Applied ${type} file: ${selectedFile.filename}`)
    
    return c.json({ success: true, message: '파일이 활성화되었습니다.' })
  } catch (error) {
    console.error(`${type} CSV 파일 적용 오류:`, error)
    return c.json({ error: '적용에 실패했습니다' }, 500)
  }
})

// CSV 파일 삭제 - 개선된 버전
app.delete('/server/csv-file/:type/:fileId', async (c) => {
  try {
    const type = c.req.param('type') as 'susi' | 'jeongsi'
    const fileId = c.req.param('fileId')
    
    console.log(`Deleting ${type} file ${fileId}...`)
    
    // 파일 메타데이터 삭제
    await kv.del(`${type}_file_${fileId}`)
    
    // 청킹된 데이터인지 확인하고 모든 청크 삭제
    const metaData = await kv.get(`${type}_data_${fileId}_meta`)
    if (metaData && metaData.totalChunks) {
      console.log(`Deleting ${metaData.totalChunks} chunks...`)
      await kv.del(`${type}_data_${fileId}_meta`)
      
      for (let i = 0; i < metaData.totalChunks; i++) {
        await kv.del(`${type}_data_${fileId}_chunk_${i}`)
      }
    } else {
      // 단일 데이터 삭제
      await kv.del(`${type}_data_${fileId}`)
    }
    
    console.log(`Deleted ${type} file ${fileId}`)
    
    return c.json({ success: true, message: '파일이 삭제되었습니다.' })
  } catch (error) {
    console.error(`${type} CSV 파일 삭제 오류:`, error)
    return c.json({ error: '삭제에 실패했습니다' }, 500)
  }
})

// 현재 활성화된 수시/정시 대학 데이터 조회 (추천 시스템용) - 개선된 버전
app.get('/server/university-data/:type', async (c) => {
  try {
    const type = c.req.param('type') as 'susi' | 'jeongsi'
    
    if (type !== 'susi' && type !== 'jeongsi') {
      return c.json({ error: '유효하지 않은 파일 타입입니다' }, 400)
    }
    
    console.log(`Loading active ${type} university data...`)
    
    const files = await kv.getByPrefix(`${type}_file_`)
    const validFiles = files
      .map(item => item.value)
      .filter(validateFileRecord)
    
    const activeFile = validFiles.find(file => file.isActive)
    
    if (!activeFile) {
      console.log(`No active ${type} file found`)
      return c.json({ data: [] })
    }
    
    console.log(`Found active ${type} file: ${activeFile.filename}`)
    
    // 청킹된 데이터인지 확인
    const metaData = await kv.get(`${type}_data_${activeFile.id}_meta`)
    
    if (metaData && metaData.totalChunks) {
      console.log(`Loading chunked active data: ${metaData.totalChunks} chunks`)
      
      // 청킹된 데이터 재구성
      const allData: any[] = []
      for (let i = 0; i < metaData.totalChunks; i++) {
        try {
          const chunkData = await kv.get(`${type}_data_${activeFile.id}_chunk_${i}`)
          if (chunkData && Array.isArray(chunkData)) {
            allData.push(...chunkData)
          }
        } catch (error) {
          console.warn(`Failed to load active chunk ${i}:`, error)
        }
      }
      
      return c.json({ data: allData })
    } else {
      // 단일 데이터
      const data = await kv.get(`${type}_data_${activeFile.id}`)
      return c.json({ data: data || [] })
    }
  } catch (error) {
    console.error(`${type} 대학 데이터 조회 오류:`, error)
    return c.json({ error: '데이터 조회에 실패했습니다' }, 500)
  }
})

// 대학 데이터 업로드 (기존 호환성 유지)
app.post('/server/upload-csv', async (c) => {
  try {
    const { csvData } = await c.req.json()
    
    // 기존 데이터 삭제
    const existingKeys = await kv.getByPrefix('university:')
    if (existingKeys.length > 0) {
      await kv.mdel(existingKeys.map(item => item.key))
    }
    
    // 새 데이터 저장
    const universityData: any = {}
    csvData.forEach((uni: any, index: number) => {
      universityData[`university:${index}`] = uni
    })
    
    await kv.mset(universityData)
    
    return c.json({ 
      success: true, 
      count: csvData.length,
      message: `${csvData.length}개의 대학 데이터가 업로드되었습니다.`
    })
  } catch (error) {
    console.error('대학 데이터 업로드 오류:', error)
    return c.json({ error: '업로드에 실패했습니다' }, 500)
  }
})

// 현재 활성화된 대학 데이터 조회 (기존 호환성 유지)
app.get('/server/university-data', async (c) => {
  try {
    const universities = await kv.getByPrefix('university:')
    return c.json({ data: universities.map(item => item.value) })
  } catch (error) {
    console.error('대학 데이터 조회 오류:', error)
    return c.json({ error: '데이터 조회에 실패했습니다' }, 500)
  }
})

// 학생 성적 저장
app.post('/server/save-scores', async (c) => {
  try {
    const user = await requireAuth(c.req.raw)
    const { scores } = await c.req.json()
    
    const scoreData = {
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.name,
      scores,
      timestamp: new Date().toISOString()
    }

    await kv.set(`user_scores_${user.id}`, scoreData)
    
    console.log('성적 저장 완료:', user.email)
    return c.json({ success: true })
  } catch (error) {
    console.error('성적 저장 오류:', error)
    return c.json({ error: '저장에 실패했습니다' }, 500)
  }
})

// 내 성적 조회
app.get('/server/my-scores', async (c) => {
  try {
    const user = await requireAuth(c.req.raw)
    const scores = await kv.get(`user_scores_${user.id}`)
    return c.json({ scores: scores || null })
  } catch (error) {
    console.error('내 성적 조회 오류:', error)
    return c.json({ error: '데이터 조회에 실패했습니다' }, 500)
  }
})

// 모든 사용자 성적 조회 (관리자 전용)
app.get('/server/all-scores', async (c) => {
  try {
    await requireAdmin(c.req.raw)
    const allScores = await kv.getByPrefix('user_scores_')
    return c.json({ scores: allScores.map(item => item.value) })
  } catch (error) {
    console.error('전체 성적 조회 오류:', error)
    return c.json({ error: '데이터 조회에 실패했습니다' }, 500)
  }
})

// 특정 사용자 성적 삭제 (관리자 전용)
app.delete('/server/delete-user-scores/:userId', async (c) => {
  try {
    await requireAdmin(c.req.raw)
    const userId = c.req.param('userId')
    await kv.del(`user_scores_${userId}`)
    
    console.log('사용자 성적 삭제 완료:', userId)
    return c.json({ success: true })
  } catch (error) {
    console.error('사용자 성적 삭제 오류:', error)
    return c.json({ error: '삭제에 실패했습니다' }, 500)
  }
})

// 헬스체크
app.get('/server/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    endpoints: [
      '/server/health',
      '/server/csv-files/:type',
      '/server/upload-csv-file/:type',
      '/server/csv-data/:type/:fileId',
      '/server/apply-csv-file/:type/:fileId',
      '/server/csv-file/:type/:fileId'
    ]
  })
})

Deno.serve(app.fetch)