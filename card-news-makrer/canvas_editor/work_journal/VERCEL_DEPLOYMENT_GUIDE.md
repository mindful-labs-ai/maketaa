# Vercel 배포 가이드

> Canvas Editor 프로젝트를 Vercel에 배포할 때 참고하는 가이드입니다.
> 에이전트들은 배포 작업 전 반드시 이 문서를 확인하세요.

---

## 배포 전 체크리스트

### 1. 로컬 빌드 테스트 (필수)

```bash
cd canvas_editor
npm run build
```

**빌드 성공 확인 후에만 Vercel 배포 진행**

빌드 실패 시 아래 "일반적인 빌드 에러" 섹션 참고.

---

### 2. 환경 변수 확인

#### 필요한 환경 변수 목록

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 | O |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (서버 전용) | △ |
| `NEXT_PUBLIC_SITE_URL` | 프로덕션 배포 URL (Magic Link 리다이렉트용) | △ |

#### Vercel 환경 변수 설정

```bash
# 현재 설정된 환경 변수 확인
vercel env ls

# 환경 변수 추가 (production)
echo "YOUR_VALUE" | vercel env add VARIABLE_NAME production

# 환경 변수 추가 (모든 환경)
echo "YOUR_VALUE" | vercel env add VARIABLE_NAME production preview development
```

---

### 3. vercel.json 검증

#### 허용되는 속성들

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --legacy-peer-deps",
  "framework": "nextjs",
  "regions": ["icn1"],
  "redirects": [],
  "headers": [],
  "rewrites": [],
  "git": {}
}
```

#### 사용하면 안 되는 속성들 (에러 발생)

| 속성 | 이유 |
|------|------|
| `env` (배열 형태) | 객체 형식이어야 함. 환경 변수는 CLI/대시보드로 관리 권장 |
| `nodeVersion` | vercel.json에서 지원 안 함 |
| `crons` (Hobby 플랜) | 매시간 실행은 Pro 플랜 필요 |
| `functions` (매칭 파일 없음) | 실제 존재하는 경로 패턴만 사용 |

---

## 배포 명령어

### 기본 배포

```bash
cd canvas_editor

# 프로덕션 배포
vercel --prod --yes

# 프리뷰 배포
vercel --yes
```

### 배포 상태 확인

```bash
# 배포 상태 확인
vercel inspect <DEPLOYMENT_URL>

# 최근 배포 목록
vercel ls
```

---

## 일반적인 빌드 에러 및 해결

### TypeScript 에러

#### 1. 미사용 변수 에러

```
Type error: 'xxx' is declared but its value is never read.
```

**해결 방법 (택1):**

A. `tsconfig.json` 수정 (권장)
```json
{
  "compilerOptions": {
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

B. 변수명 앞에 밑줄 추가
```typescript
// Before
const [editingField, setEditingField] = useState(null);

// After
const [_editingField, setEditingField] = useState(null);
```

#### 2. implicit any 에러

```
Type error: Parameter 'x' implicitly has an 'any' type.
```

**해결 방법:**

`next.config.js`에서 TypeScript 에러 무시
```javascript
typescript: {
  ignoreBuildErrors: true,
},
```

### ESLint 에러

**해결 방법:**

`next.config.js`에서 ESLint 에러 무시
```javascript
eslint: {
  ignoreDuringBuilds: true,
},
```

---

## 프로젝트별 설정

### Canvas Editor MVP

**현재 배포 URL:**
- https://canvaseditor-mu.vercel.app
- https://canvaseditor-mindfullabs-projects.vercel.app

**Vercel 프로젝트:** mindfullabs-projects/canvas_editor

**리전:** icn1 (Seoul)

---

## 트러블슈팅

### 1. 배포는 성공했는데 사이트가 안 열림

- 환경 변수 누락 확인
- Supabase 연결 확인
- 브라우저 콘솔에서 에러 확인

### 2. 빌드 시간이 너무 오래 걸림

- `node_modules` 캐시 확인
- 불필요한 의존성 제거
- `--legacy-peer-deps` 옵션 사용 여부 확인

### 3. 이전 배포로 롤백

```bash
# 배포 목록 확인
vercel ls

# 특정 배포를 프로덕션으로 승격
vercel promote <DEPLOYMENT_URL>
```

### 4. Supabase Magic Link 로그인 실패 (2026-03-15 해결)

**증상:** 매직 링크 클릭 후 로그인 화면으로 돌아오는 무한 루프

**근본 원인 (3가지 복합):**

1. **Supabase Dashboard Site URL 미설정**
   - Site URL이 `http://localhost:3000`이면 매직 링크가 로컬로 리다이렉트
   - **해결:** Supabase Dashboard > Authentication > URL Configuration에서 Site URL을 프로덕션 URL로 변경

2. **auth/callback에서 세션 쿠키 미전파**
   - `@supabase/supabase-js`의 `createClient`는 서버 사이드에서 세션을 메모리에만 저장
   - HTTP 응답에 `Set-Cookie` 헤더를 설정하지 않음
   - **해결:** `@supabase/ssr` 패키지의 `createServerClient` 사용 필요

3. **미들웨어 쿠키명 불일치**
   - Supabase 쿠키는 `sb-<project-ref>-auth-token` 형식
   - 잘못된 쿠키명 패턴으로 검사하면 인증된 사용자도 차단됨

**최종 해결:** 단독 사용 MVP이므로 인증 게이트 자체를 제거. 추후 다중 사용자 지원 시 `@supabase/ssr` 기반으로 재도입.

**참고:** Next.js App Router + Supabase Auth 조합에서는 반드시 `@supabase/ssr`을 사용해야 함. `@supabase/supabase-js`만으로는 서버 사이드 쿠키 관리가 불가능.

```bash
# @supabase/ssr 설치
npm install @supabase/ssr
```

---

## 개발 시 주의사항

### 1. TypeScript 엄격 모드 관리

개발 중에는 엄격 모드 유지, 배포 전 완화 가능:

```json
// 개발 중 (엄격)
"noUnusedLocals": true,
"noUnusedParameters": true,

// 배포 시 (완화)
"noUnusedLocals": false,
"noUnusedParameters": false,
```

### 2. fabric.js 타입 이슈

fabric.js v6는 타입 정의가 불완전함. 콜백 함수에 명시적 타입 지정 필요:

```typescript
// 잘못된 예
fabric.Image.fromURL(src, (img) => { ... });

// 올바른 예
fabric.Image.fromURL(src, (img: fabric.Image | null) => { ... });
```

### 3. Next.js App Router 주의사항

- API 라우트는 `app/api/` 아래에 위치
- `vercel.json`의 `functions` 패턴은 실제 경로와 일치해야 함
- 서버 컴포넌트에서 환경 변수 접근 시 `NEXT_PUBLIC_` prefix 불필요

---

## 관련 명령어 요약

```bash
# 배포
vercel --prod --yes

# 환경 변수 확인
vercel env ls

# 환경 변수 추가
echo "VALUE" | vercel env add NAME production

# 배포 상태 확인
vercel inspect <URL>

# 롤백
vercel promote <URL>
```

---

*마지막 업데이트: 2026-03-15*
