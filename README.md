# 대학 입시 성적 분석 시스템

React + TypeScript + Tailwind CSS + Supabase로 구축된 대학 입시 성적 분석 및 추천 시스템입니다.

## 주요 기능

- 내신 및 수능 성적 입력
- AI 기반 대학 추천 알고리즘
- 수시/정시 데이터 분리 관리
- 성적 분석 리포트 생성
- A4 인쇄용 보고서
- 관리자 페이지 (CSV 데이터 업로드 및 관리)

## 기술 스택

- **Frontend**: React 18, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Deployment**: Netlify
- **UI Components**: Radix UI, Lucide React
- **Charts**: Recharts
- **Animation**: Motion (Framer Motion v2)

## 배포 가이드

### 1. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 설정에서 다음 정보 확인:
   - Project ID
   - Anon Key
   - Service Role Key (관리자 기능용)

### 2. Supabase Edge Functions 배포

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트와 연결
supabase link --project-ref YOUR_PROJECT_ID

# Edge Functions 배포
supabase functions deploy server
```

### 3. 환경 변수 설정

`.env` 파일 생성:
```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

### 5. Netlify 배포

1. Github에 코드 푸시
2. [Netlify](https://netlify.com)에서 새 사이트 생성
3. Github repository 연결
4. 빌드 설정:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. 환경 변수 설정:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_ANON_KEY`

## 관리자 기능

- **기본 관리자 비밀번호**: `admin123`
- 학생 계정 관리
- CSV 데이터 업로드 (수시/정시 분리)
- 성적 데이터 관리
- 인쇄 보고서 생성

## CSV 데이터 형식

### 수시 데이터 (18개 필드)
```
region,university,category,highschool_type,admission_type,year,department,perfect_score,convert_50_cut,convert_70_cut,grade_50_cut,grade_70_cut,recruitment_count,competition_rate,additional_pass,total_apply,pass_num,real_competition_rate
```

### 정시 데이터 (22개 필드)
```
region,university,category,admission_type,year,department,perfect_score,convert_50_cut,convert_70_cut,grade_50_cut,grade_70_cut,korean,math,inquiry,average,english,recruitment_count,competition_rate,additional_pass,total_apply,pass_num,real_competition_rate
```

## 라이선스

MIT License

## 지원

문의사항이 있으시면 이슈를 등록해주세요.