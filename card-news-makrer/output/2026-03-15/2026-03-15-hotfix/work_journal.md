# 업무일지 — 2026-03-15-hotfix

**시작:** 2026-03-15T00:00:00+09:00
**상태:** completed
**총 기록:** 8건

## 요약

- 🐛 **버그:** Supabase Magic Link 로그인 후 대시보드 진입 불가
- ✅ **해결:** 인증 게이트 제거 (단독 사용 MVP이므로 불필요)
- 🚀 **배포:** Vercel 프로덕션 배포 3회 (디버깅 과정 포함)

## 문제 상황

배포된 Canvas Editor(https://canvaseditor-mu.vercel.app)에서 Supabase Magic Link 로그인이 동작하지 않는 버그가 발생. 매직 링크를 클릭해도 대시보드에 진입할 수 없고 로그인 화면으로 계속 돌아오는 현상.

## 상세 타임라인

| 시간 | 상태 | 행동 | 상세 |
|------|------|------|------|
| - | 🐛 | 버그 리포트 | 매직 링크 클릭 시 `localhost:3000`으로 리다이렉트됨 (프로덕션 URL이 아닌 로컬 주소) |
| - | 🔍 | 1차 원인 분석 | Supabase Dashboard의 Site URL이 `http://localhost:3000`으로 설정되어 있었음. 코드 내 `emailRedirectTo`도 하드코딩 문제 확인 |
| - | 🔧 | 1차 수정 | ① `NEXT_PUBLIC_SITE_URL` 환경변수 도입, ② `emailRedirectTo`를 동적 URL로 변경, ③ `auth/callback/route.ts` 생성 (PKCE 코드 교환), ④ `middleware.ts` 쿠키명 패턴 수정 (`sb-*-auth-token`) |
| - | 🐛 | 2차 버그 | 리다이렉트 URL은 수정됐으나, `/login?redirect=%2F`로 계속 돌아옴 (로그인 루프) |
| - | 🔍 | 2차 원인 분석 | `auth/callback/route.ts`에서 `createClient`로 생성한 Supabase 클라이언트가 코드를 세션으로 교환하지만, **세션 쿠키를 HTTP 응답에 설정하지 않음**. 미들웨어가 쿠키를 찾지 못해 `/login`으로 리다이렉트 |
| - | 🔧 | 2차 수정 | ① `@supabase/ssr` 패키지 설치, ② `auth/callback/route.ts`를 `createServerClient` 기반으로 재작성 (쿠키 자동 설정), ③ `middleware.ts`도 `@supabase/ssr` 기반으로 변경 |
| - | 🐛 | 3차 버그 | 여전히 로그인 불가 — Supabase 인증 플로우 전체에 걸친 복합적 문제로 판단 |
| - | ✅ | 최종 해결 | **인증 게이트 완전 제거** — 단독 사용 MVP이므로 로그인 불필요. ① `middleware.ts`에서 인증 체크 제거 (모든 요청 통과, `/login` → `/` 리다이렉트), ② `app/page.tsx`에서 auth 체크 로직 전체 제거, ③ Supabase 데이터 레이어(CRUD)는 유지 |

## 수정된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `canvas_editor/middleware.ts` | 인증 게이트 제거, `/login` 접근 시 `/` 리다이렉트만 수행 |
| `canvas_editor/app/page.tsx` | `isAuthenticated` 체크, `isAuthChecking` 상태, hash token 처리 로직 제거. 페이지 로드 시 바로 카드 스펙 로드 |
| `canvas_editor/app/auth/callback/route.ts` | `@supabase/ssr` 기반으로 재작성 (잔존, 현재 미사용) |
| `canvas_editor/package.json` | `@supabase/ssr` 의존성 추가 |
| `canvas_editor/.env.local` | `NEXT_PUBLIC_SITE_URL` 추가 (이전 세션) |

## 근본 원인 분석

### 왜 Supabase Magic Link 인증이 실패했는가

1. **Site URL 미설정**: Supabase Dashboard의 Site URL이 `localhost:3000`으로 되어 있어 매직 링크가 로컬로 리다이렉트
2. **PKCE 쿠키 미전파**: `auth/callback/route.ts`에서 `@supabase/supabase-js`의 `createClient`를 사용했는데, 이 클라이언트는 서버 사이드에서 세션을 메모리에만 저장하고 HTTP 응답 쿠키에 전파하지 않음
3. **미들웨어-클라이언트 불일치**: 미들웨어는 쿠키로 인증을 확인하는데, 서버 라우트에서 쿠키를 설정하지 않으므로 영구 로그인 루프 발생
4. **복합적 문제**: Site URL, 쿠키 전파, 미들웨어 쿠키명 패턴 등 여러 레이어의 문제가 동시에 존재

### 교훈

- Next.js App Router + Supabase Auth 조합에서는 반드시 `@supabase/ssr` 패키지를 사용해야 서버 사이드에서 쿠키가 올바르게 설정됨
- MVP 단계에서 인증은 핵심 기능이 안정된 후에 도입하는 것이 효율적
- Supabase Dashboard 설정(Site URL, Redirect URLs)과 코드가 일치해야 함

## 최종 상태

- ✅ 대시보드 직접 접근 가능 (인증 없이)
- ✅ Supabase 데이터 CRUD 정상 동작
- ✅ Vercel 프로덕션 배포 완료
- ⚠️ RLS(Row Level Security) 활성화 시 anon key로 데이터 접근 제한될 수 있음 — 필요 시 Supabase에서 정책 조정 필요
- 📌 추후 다중 사용자 지원 시 `@supabase/ssr` 기반 인증 재도입 필요

## 배포 이력

| 시점 | 배포 URL | 내용 |
|------|----------|------|
| 2차 수정 | canvaseditor-qjxy58uqb-*.vercel.app | @supabase/ssr 적용 |
| 3차 수정 | canvaseditor-mvhpixqpq-*.vercel.app | 인증 게이트 제거 (최종) |
