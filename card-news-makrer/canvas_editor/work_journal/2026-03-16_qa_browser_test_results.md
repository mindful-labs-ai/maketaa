# QA 브라우저 테스트 결과

> 테스트 일시: 2026-03-16
> 테스트 환경: 로컬 dev 서버 (http://localhost:3000)
> Next.js 14.2.3, Node.js

---

## 1. 페이지 로딩 및 라우팅 테스트

| # | 테스트 항목 | 예상 결과 | 실제 결과 | Pass/Fail |
|---|-----------|----------|----------|-----------|
| 1.1 | `GET /` 대시보드 로딩 | 200 OK, HTML 반환 | 200 OK, `text/html; charset=utf-8` | **PASS** |
| 1.2 | `GET /login` 리다이렉트 | 307 → `/` | 307 → `http://localhost:3000/` | **PASS** |
| 1.3 | `GET /login` 리다이렉트 후 최종 | 200 OK (대시보드) | 200 OK | **PASS** |
| 1.4 | `GET /editor/nonexistent-id` | 200 OK (클라이언트에서 에러 처리) | 200 OK, Loading UI → 클라이언트 에러 처리 | **PASS** |
| 1.5 | `GET /nonexistent-page` 404 | 404 Not Found | 404 Not Found | **PASS** |
| 1.6 | `GET /favicon.ico` | 200 또는 404 | 404 (favicon 없음) | **WARN** |

### 비고
- **1.4**: 존재하지 않는 스펙 ID로 접근 시 SSR은 200을 반환하고 클라이언트에서 Supabase API 호출 후 에러 UI를 표시하는 구조. 서버 사이드 404를 반환하지 않으므로 SEO 관점에서는 개선 여지 있음.
- **1.6**: `/favicon.ico`가 404를 반환함. favicon 파일이 `public/` 디렉토리에 없거나 경로 설정 필요.

---

## 2. 응답 헤더 점검

| # | 헤더 | 예상 값 | 실제 값 | Pass/Fail |
|---|------|---------|---------|-----------|
| 2.1 | Content-Type | `text/html; charset=utf-8` | `text/html; charset=utf-8` | **PASS** |
| 2.2 | X-Content-Type-Options | `nosniff` | `nosniff` | **PASS** |
| 2.3 | X-Frame-Options | `DENY` 또는 `SAMEORIGIN` | `DENY` | **PASS** |
| 2.4 | X-XSS-Protection | `1; mode=block` | `1; mode=block` | **PASS** |
| 2.5 | Referrer-Policy | 설정됨 | `strict-origin-when-cross-origin` | **PASS** |
| 2.6 | Permissions-Policy | 설정됨 | `camera=(), microphone=(), geolocation=()` | **PASS** |
| 2.7 | Content-Security-Policy | 설정 권장 | **미설정** | **WARN** |
| 2.8 | Strict-Transport-Security (HSTS) | 프로덕션에서 설정 권장 | **미설정** (로컬이므로 정상) | **INFO** |
| 2.9 | Cache-Control | 적절한 캐싱 | `no-store, must-revalidate` | **PASS** |

### 비고
- **2.7**: Content-Security-Policy(CSP) 헤더가 설정되지 않음. XSS 방어 강화를 위해 CSP 설정 권장.
- 전반적으로 Next.js 기본 보안 헤더가 잘 적용되어 있음.

---

## 3. 정적 자산 로딩 테스트

| # | 자산 | 경로 | 로딩 여부 | Pass/Fail |
|---|------|------|----------|-----------|
| 3.1 | CSS 번들 | `/_next/static/css/app/layout.css` | 로딩됨 | **PASS** |
| 3.2 | Webpack 런타임 | `/_next/static/chunks/webpack.js` | 로딩됨 | **PASS** |
| 3.3 | Main App JS | `/_next/static/chunks/main-app.js` | 로딩됨 | **PASS** |
| 3.4 | 페이지 JS (대시보드) | `/_next/static/chunks/app/page.js` | 로딩됨 | **PASS** |
| 3.5 | 페이지 JS (에디터) | `/_next/static/chunks/app/editor/%5Bid%5D/page.js` | 로딩됨 | **PASS** |
| 3.6 | Polyfills | `/_next/static/chunks/polyfills.js` | 로딩됨 | **PASS** |
| 3.7 | App Pages Internals | `/_next/static/chunks/app-pages-internals.js` | 로딩됨 | **PASS** |

---

## 4. 빌드 테스트

| # | 테스트 항목 | 결과 | Pass/Fail |
|---|-----------|------|-----------|
| 4.1 | `npm run build` 성공 여부 | 빌드 성공 | **PASS** |
| 4.2 | 빌드 경고 | viewport metadata 경고 (4건) | **WARN** |
| 4.3 | 빌드 에러 | 없음 | **PASS** |

### 빌드 출력 요약
```
Route (app)                              Size     First Load JS
┌ ○ /                                    3.66 kB         157 kB
├ ○ /_not-found                          875 B            88 kB
├ ƒ /auth/callback                       0 B                0 B
├ ƒ /editor/[id]                         28.2 kB         182 kB
└ ○ /login                               2.94 kB         142 kB
+ First Load JS shared by all            87.2 kB
```

### 빌드 경고 상세
- `⚠ Unsupported metadata viewport is configured in metadata export` — `/`, `/login`, `/editor/[id]` 페이지에서 viewport 설정이 `metadata` export에 포함됨. Next.js 14에서는 `generateViewport()` 또는 `viewport` export로 분리 필요.

---

## 5. 서버 로그 분석

| # | 항목 | 결과 | Pass/Fail |
|---|------|------|-----------|
| 5.1 | 런타임 에러 | 없음 | **PASS** |
| 5.2 | 미들웨어 컴파일 | 66ms, 73 modules — 정상 | **PASS** |
| 5.3 | 대시보드 컴파일 | 416ms, 730 modules — 정상 | **PASS** |
| 5.4 | 에디터 컴파일 | 178ms, 810 modules — 정상 | **PASS** |
| 5.5 | viewport 경고 반복 | 매 요청마다 경고 출력 | **WARN** |

---

## 6. 대시보드 HTML 구조 검증

| # | 테스트 항목 | 결과 | Pass/Fail |
|---|-----------|------|-----------|
| 6.1 | `<html lang="ko">` 설정 | 설정됨 | **PASS** |
| 6.2 | `<title>` 메타데이터 | "Canvas Editor - Mental Health Card News" | **PASS** |
| 6.3 | `<meta name="description">` | 설정됨 | **PASS** |
| 6.4 | 헤더 "Canvas Editor" 텍스트 | 렌더링됨 | **PASS** |
| 6.5 | 필터 버튼 (전체/작성중/검토중/발행대기/발행됨) | 모두 렌더링됨 | **PASS** |
| 6.6 | "새 카드 만들기" 버튼 | `disabled` 상태로 렌더링됨 | **PASS** |
| 6.7 | 로딩 스피너 표시 | SSR에서 로딩 상태 렌더링 | **PASS** |
| 6.8 | 필터 카운트 초기값 | 모두 0 (SSR 시점에서 정상) | **PASS** |

---

## 종합 요약

### 통계
- **PASS**: 27건
- **WARN**: 4건
- **FAIL**: 0건

### 발견된 이슈 (WARN)

| 우선순위 | 이슈 | 설명 | 권장 조치 |
|---------|------|------|----------|
| P2 | favicon 404 | `/favicon.ico` 파일 없음 | `public/favicon.ico` 추가 |
| P2 | CSP 미설정 | Content-Security-Policy 헤더 없음 | `next.config.js`에 CSP 헤더 추가 |
| P2 | viewport 경고 | metadata에서 viewport 분리 필요 | `generateViewport()` export 사용 |
| P1 | 에디터 404 미반환 | 잘못된 스펙 ID에 200 반환 | 서버 사이드에서 스펙 존재 확인 후 notFound() 호출 고려 |

---

*테스트 수행: Claude Code QA*
