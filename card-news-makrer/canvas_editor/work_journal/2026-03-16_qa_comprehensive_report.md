# QA 종합 리포트 - Canvas Editor MVP

> 작성일: 2026-03-16
> 테스트 환경: 로컬 dev 서버 (http://localhost:3000)
> 수행자: Claude Code QA Team (4개 에이전트 병렬 실행)

---

## 1. QA 수행 개요

| 에이전트 | 역할 | 결과 문서 |
|---------|------|----------|
| Architect | QA 계획서 & 체크리스트 (76건) | `2026-03-16_qa_plan.md` |
| QA Tester | 브라우저/HTTP 테스트 (31건) | `2026-03-16_qa_browser_test_results.md` |
| Code Reviewer | 코드 정적 분석 (23건) | `2026-03-16_qa_code_review.md` |
| Security Reviewer | 보안 취약점 점검 (10건) | `2026-03-16_qa_security_review.md` |

---

## 2. 전체 결과 요약

### 2.1 브라우저 테스트
```
PASS: 27건  |  WARN: 4건  |  FAIL: 0건
```

### 2.2 코드 리뷰
```
CRITICAL: 3건  |  HIGH: 7건  |  MEDIUM: 8건  |  LOW: 5건
판정: REQUEST CHANGES
```

### 2.3 보안 점검
```
위험도: HIGH
CRITICAL: 2건  |  HIGH: 3건  |  MEDIUM: 3건  |  LOW: 2건
```

### 2.4 의존성 감사 (npm audit)
```
취약점: 17건 (critical: 1, high: 13, low: 3)
주요 원인: tar/canvas 패키지 체인
```

### 2.5 빌드 테스트
```
npm run build: 성공 (경고 4건 — viewport metadata)
```

---

## 3. CRITICAL 이슈 (즉시 수정 필요)

### SEC-CRITICAL-1: 인증 게이트 완전 비활성화
- **파일**: `middleware.ts:10-17`
- **문제**: 모든 요청이 인증 없이 통과. `/login` 접근 시 무조건 `/`로 리다이렉트하여 로그인 불가.
- **영향**: 배포 환경에서 누구나 모든 데이터에 접근 가능
- **수정 방안**: 인증 상태 확인 후 조건부 리다이렉트, 또는 MVP에서 의도적이라면 문서화 필요

### SEC-CRITICAL-2: Anon RLS 정책으로 전체 DB 노출
- **파일**: `supabase/migration.sql:191-204`, `supabase/fix_rls_anon_read.sql:17-34`
- **문제**: `card_specs`, `edit_logs`, `publish_reports` 테이블에 `USING (true)` 정책 → anon 키로 전체 데이터 조회 가능
- **영향**: 클라이언트 JS에 포함된 anon key로 누구나 DB 직접 쿼리 가능
- **수정 방안**: `USING (auth.uid() IS NOT NULL)` 등 인증된 사용자만 접근 허용

### CODE-CRITICAL-1: Zustand store 직접 상태 변이
- **파일**: `stores/useCardStore.ts:158, :198, :246, :298, :389`
- **문제**: `get()`으로 가져온 객체를 직접 변이 → shallow equality 체크 실패 → 리렌더링 누락, stale 데이터 저장
- **수정 방안**: Immer middleware 추가 또는 중첩 객체 전체를 새 참조로 복사

### CODE-CRITICAL-2: Fabric.js 캔버스 매 렌더마다 재생성
- **파일**: `components/CardCanvasClient.tsx:199, :219`
- **문제**: `onTextClick`이 매 렌더마다 새 참조 → `useEffect` dep로 인해 캔버스 destroy/recreate 반복 → 플리커, 메모리 누수, 이미지 재요청
- **수정 방안**: 부모의 `handleTextClick`을 `useCallback`으로 메모이제이션, 이벤트 바인딩을 별도 `useEffect`로 분리

### CODE-CRITICAL-3: 로그인 페이지 Dead Code
- **파일**: `middleware.ts:12-14` ↔ `app/login/page.tsx`
- **문제**: middleware가 `/login`을 무조건 `/`로 리다이렉트 → 로그인 페이지가 dead code, Magic link 콜백 플로우 불가
- **수정 방안**: 리다이렉트 제거 또는 인증 상태 조건부 처리

---

## 4. HIGH 이슈

| # | 카테고리 | 파일 | 문제 | 수정 방안 |
|---|---------|------|------|----------|
| H-1 | 보안 | `.env.local` | Supabase project ref가 URL로 노출 | 프로덕션 환경에서 API gateway 도입 고려 |
| H-2 | 보안 | `next.config.js` | `ignoreBuildErrors: true` — 타입 에러 무시 | fabric.js 타입만 선별 무시하도록 개선 |
| H-3 | 보안 | 응답 헤더 | CSP(Content-Security-Policy) 미설정 | `next.config.js`에 CSP 헤더 추가 |
| H-4 | 코드 | `CardCanvasClient.tsx:41` | `forwardRef<any>` 타입 안전성 무력화 | 구체적 ref 타입 지정 |
| H-5 | 코드 | `StylePanel.tsx:137, :176` | `as any` 타입 단언으로 체크 우회 | union type 사용 |
| H-6 | 코드 | `editor/[id]/page.tsx:103` | 텍스트 저장 실패 시 사용자 에러 피드백 없음 | toast/snackbar 알림 추가 |
| H-7 | 코드 | `login/page.tsx:26` | `window` 직접 접근 — SSR 시 에러 리스크 | `typeof window !== 'undefined'` 가드 추가 |

---

## 5. MEDIUM / LOW 이슈 요약

### MEDIUM (11건)
- 서비스 역할 키 격리 미흡
- 에러 메시지 정보 노출
- Rate limiting 미적용
- viewport metadata 경고 (4건)
- 에디터에서 잘못된 스펙 ID에 200 반환 (서버 사이드 404 미반환)
- 기타 코드 품질 이슈

### LOW (9건)
- favicon 404
- 와일드카드 이미지 도메인
- 미검증 이미지 URL
- 기타 사소한 코드 스타일 이슈

---

## 6. 긍정적 발견 사항

- Next.js 기본 보안 헤더 (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection) 잘 적용됨
- 소스 코드에 하드코딩된 시크릿 없음
- Supabase SDK 활용으로 SQL Injection 방지
- innerHTML / dangerouslySetInnerHTML 미사용 → XSS 벡터 없음
- Zod 검증 스키마 정의됨
- `.env.local` 적절히 gitignore 처리
- 파일별 책임 분리와 코드 구조가 잘 정리됨
- Zustand selector 분리 패턴 (`useStyleSelectors.ts`) 우수
- TextEditModal UX 디테일 (포커스 관리, 단축키, 글자수 제한, aria 속성) 우수
- DnD 구현이 깔끔하며 `@dnd-kit` 활용 적절
- 빌드 정상 성공, 번들 사이즈 적절

---

## 7. 권장 조치 우선순위

### 즉시 (P0)
1. Zustand store 상태 변이 패턴 수정 (Immer 도입)
2. `onTextClick` useCallback 메모이제이션
3. 인증 전략 결정 및 문서화 (MVP 의도적 비활성화라면 명시)

### 단기 (P1) — 1주 내
4. RLS 정책을 인증 기반으로 강화
5. CSP 헤더 설정
6. 에러 발생 시 사용자 대면 피드백 (toast) 추가
7. `ignoreBuildErrors` 범위 축소
8. viewport metadata 경고 해결

### 중기 (P2) — 다음 스프린트
9. 의존성 취약점 해결 (`npm audit fix`)
10. favicon 추가
11. 에디터 페이지 서버 사이드 스펙 검증
12. 타입 안전성 개선 (`any` 제거)

---

## 8. 관련 문서

| 문서 | 설명 |
|------|------|
| [QA 계획서](2026-03-16_qa_plan.md) | 76건 체크리스트, 11개 카테고리 |
| [브라우저 테스트 결과](2026-03-16_qa_browser_test_results.md) | HTTP/라우팅/헤더/빌드 테스트 |
| [코드 리뷰 결과](2026-03-16_qa_code_review.md) | 23건 이슈, 파일:라인 참조 |
| [보안 점검 결과](2026-03-16_qa_security_review.md) | 10건 취약점, 수정 코드 예시 |

---

*작성: Claude Code QA Team (Architect + QA Tester + Code Reviewer + Security Reviewer)*
*작성일: 2026-03-16*
