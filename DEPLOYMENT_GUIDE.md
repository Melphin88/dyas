# 배포 가이드

이 가이드는 대학 입시 성적 분석 시스템을 Github + Netlify + Supabase로 배포하는 단계별 방법을 설명합니다.

## 사전 준비

- [Node.js](https://nodejs.org/) 18+ 설치
- [Git](https://git-scm.com/) 설치
- [Supabase CLI](https://supabase.com/docs/guides/cli) 설치
- Github 계정
- Netlify 계정
- Supabase 계정

## 1단계: Supabase 프로젝트 설정

### 1.1 새 Supabase 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름: `university-admission-analyzer`
4. 데이터베이스 비밀번호 설정
5. 지역 선택 (Korea Central 권장)
6. "Create new project" 클릭

### 1.2 프로젝트 정보 확인

프로젝트 생성 후 다음 정보를 기록해두세요:

- **Project URL**: `https://your-project-id.supabase.co`
- **Project ID**: `your-project-id`
- **Anon Key**: API 키 (public)
- **Service Role Key**: API 키 (secret, 관리자용)

## 2단계: Edge Functions 배포

### 2.1 Supabase CLI 설정

```bash
# Supabase CLI 설치 (npm 사용)
npm install -g supabase

# 또는 yarn 사용
yarn global add supabase

# 로그인
supabase login
```

### 2.2 프로젝트 연결 및 배포

```bash
# 프로젝트 디렉토리에서 실행
cd your-project-directory

# Supabase 프로젝트와 연결
supabase link --project-ref YOUR_PROJECT_ID

# Edge Functions 배포
supabase functions deploy server
```

### 2.3 환경 변수 설정 (Edge Functions)

```bash
# Service Role Key 설정
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database URL 설정
supabase secrets set SUPABASE_DB_URL=your_database_url
```

## 3단계: Github Repository 설정

### 3.1 Repository 생성

1. Github에서 새 repository 생성
2. Repository 이름: `university-admission-analyzer`
3. Public 또는 Private 선택
4. README.md 포함하지 않음 (이미 존재)

### 3.2 코드 업로드

```bash
# Git 초기화 (필요한 경우)
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit: University admission analyzer"

# Remote repository 연결
git remote add origin https://github.com/your-username/university-admission-analyzer.git

# 푸시
git push -u origin main
```

## 4단계: 환경 변수 설정

### 4.1 .env 파일 생성

프로젝트 루트에 `.env` 파일 생성:

```env
# Supabase 설정
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_ANON_KEY=your_anon_key
```

⚠️ **주의**: `.env` 파일은 `.gitignore`에 포함되어 Git에 업로드되지 않습니다.

## 5단계: 로컬 테스트

### 5.1 의존성 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하여 정상 작동 확인

### 5.2 빌드 테스트

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 6단계: Netlify 배포

### 6.1 Netlify 사이트 생성

1. [Netlify Dashboard](https://app.netlify.com/)에 로그인
2. "Add new site" > "Import an existing project" 클릭
3. "Deploy with GitHub" 선택
4. Repository 선택: `university-admission-analyzer`
5. 브랜치: `main`
6. 빌드 설정:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
7. "Deploy site" 클릭

### 6.2 환경 변수 설정

1. Netlify 사이트 대시보드에서 "Site settings" 클릭
2. "Environment variables" 섹션으로 이동
3. 다음 변수들 추가:

```
VITE_SUPABASE_PROJECT_ID = your_project_id
VITE_SUPABASE_ANON_KEY = your_anon_key
```

### 6.3 재배포

환경 변수 설정 후 "Deploys" 탭에서 "Trigger deploy" 클릭

## 7단계: 최종 확인

### 7.1 웹사이트 접속

Netlify에서 제공하는 URL로 접속하여 다음 기능들 확인:

- [x] 로그인 페이지 로드
- [x] 관리자 로그인 (비밀번호: `admin123`)
- [x] CSV 파일 업로드
- [x] 학생 계정 생성
- [x] 성적 입력 및 추천 기능

### 7.2 도메인 설정 (선택사항)

커스텀 도메인 사용 시:

1. Netlify 대시보드에서 "Domain management" 클릭
2. "Add custom domain" 클릭
3. 도메인 입력 및 DNS 설정 따라하기

## 문제 해결

### 일반적인 오류들

#### 1. Supabase 연결 오류
```
Error: Invalid project reference
```

**해결방법**: 
- Project ID가 정확한지 확인
- Anon Key가 올바른지 확인
- 환경 변수명이 정확한지 확인 (`VITE_` 접두사 포함)

#### 2. Edge Functions 오류
```
Error: Function not found
```

**해결방법**:
```bash
# Edge Functions 재배포
supabase functions deploy server --no-verify-jwt
```

#### 3. 빌드 오류
```
Module not found
```

**해결방법**:
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

#### 4. 환경 변수 인식 안됨

**해결방법**:
- Netlify에서 환경 변수 재설정
- 변수명에 `VITE_` 접두사 확인
- 재배포 실행

### 로그 확인 방법

#### Netlify 빌드 로그
1. Netlify 대시보드 > "Deploys" 탭
2. 최신 배포 클릭
3. "Functions" 또는 "Deploy log" 확인

#### Supabase Edge Functions 로그
1. Supabase Dashboard > "Edge Functions"
2. `server` 함수 클릭
3. "Logs" 탭 확인

## 업데이트 배포

코드 변경 후 배포:

```bash
# 변경사항 커밋
git add .
git commit -m "Update: describe your changes"
git push

# Netlify가 자동으로 재배포됩니다
```

## 보안 고려사항

1. **환경 변수 보안**: 
   - Service Role Key는 서버에서만 사용
   - .env 파일을 Git에 커밋하지 않음

2. **Supabase RLS (Row Level Security)**:
   - 필요시 데이터베이스 정책 설정

3. **CORS 설정**:
   - Supabase에서 허용된 도메인만 접근 가능하도록 설정

## 추가 설정

### CDN 최적화
- Netlify의 기본 CDN이 자동으로 적용됩니다

### 성능 모니터링
- Netlify Analytics 활성화 (유료)
- Google Analytics 연동 (선택사항)

이 가이드를 따라하면 대학 입시 성적 분석 시스템을 성공적으로 배포할 수 있습니다.