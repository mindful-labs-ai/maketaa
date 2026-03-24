# 업무일지: RLS 정책 버그 수정 — 카드 뉴스 미표시 해결

**날짜:** 2026-03-16
**작업자:** Claude Code Agent
**결과:** 코드 수정 완료 (DB 적용 대기)

---

## 작업 개요

배포된 웹(https://canvaseditor-mu.vercel.app)에서 Supabase DB에 데이터가 존재함에도 카드 뉴스가 표시되지 않는 버그를 분석하고 수정했습니다.

---

## 근본 원인 분석

### 증상
- Supabase DB `card_specs` 테이블에 데이터 존재
- 배포된 웹 대시보드에서 "카드 스펙이 없습니다" 표시 (빈 결과)
- 에러 메시지 없이 정상 동작처럼 보이는 사일런트 실패

### 원인: RLS 정책과 인증 모드 불일치

| 항목 | 설정 | 문제 |
|------|------|------|
| RLS 정책 | `TO authenticated` (인증 사용자만 허용) | 인증 안 된 사용자는 데이터 접근 불가 |
| 미들웨어 | 인증 게이트 비활성화 (MVP 단독사용 모드) | 사용자가 항상 비인증 상태 |
| 브라우저 클라이언트 | `anon key` 사용 | `auth.uid()` = NULL → RLS가 모든 행 차단 |

**핵심:** 미들웨어에서 인증을 우회했지만, Supabase RLS 정책은 여전히 `authenticated` 역할만 허용하므로 `anon` 역할로 접근하는 비인증 사용자에게 빈 결과가 반환됨.

### 데이터 흐름

```
사용자 접속 (비인증)
  → getBrowserClient() (anon key)
  → Supabase 역할: anon
  → RLS 정책: TO authenticated USING (auth.uid()::text = owner_id)
  → auth.uid() = NULL (비인증)
  → 조건 불일치 → 0건 반환
  → 대시보드: "카드 스펙이 없습니다"
```

---

## 수정 내용

### 1. RLS 정책 수정 — anon 역할 SELECT 허용

**파일:** `supabase/fix_rls_anon_read.sql` (신규)

MVP 단독사용 모드에서 비인증 사용자도 데이터를 읽을 수 있도록 anon 역할에 SELECT 정책 추가:

```sql
-- card_specs: anon 읽기 허용
CREATE POLICY "Anon can view all card_specs"
  ON card_specs FOR SELECT TO anon USING (true);

-- edit_logs: anon 읽기 허용
CREATE POLICY "Anon can view all edit_logs"
  ON edit_logs FOR SELECT TO anon USING (true);

-- publish_reports: anon 읽기 허용
CREATE POLICY "Anon can view all publish_reports"
  ON publish_reports FOR SELECT TO anon USING (true);

-- GRANT SELECT 권한
GRANT SELECT ON public.card_specs TO anon;
GRANT SELECT ON public.edit_logs TO anon;
GRANT SELECT ON public.publish_reports TO anon;
```

### 2. 전체 마이그레이션 파일 업데이트

**파일:** `supabase/migration.sql` (수정)

- RLS POLICIES 섹션에 MVP anon READ 정책 블록 추가
- GRANTS 섹션에 anon 역할 SELECT GRANT 추가

### 3. Supabase MCP 활용 가이드 작성

**파일:** `work_journal/SUPABASE_MCP_GUIDE.md` (신규)

에이전트들이 Supabase MCP 도구를 활용하여 DB를 조회/디버깅할 수 있도록 가이드 문서 작성.

---

## DB 적용 방법 (수동 필요)

Supabase MCP 토큰이 만료되어 자동 적용이 불가합니다. 아래 방법 중 하나로 적용해야 합니다:

### 방법 1: Supabase MCP 재인증 후 적용
```
1. Supabase MCP 토큰 재인증
2. apply_migration 도구로 fix_rls_anon_read.sql 적용
```

### 방법 2: Supabase Dashboard SQL Editor
```
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (txpqctreqmxjgwjrhivn)
3. SQL Editor 열기
4. fix_rls_anon_read.sql 내용 붙여넣기 후 실행
```

### 방법 3: Supabase CLI
```bash
supabase db push --db-url postgresql://...
```

---

## QA 체크리스트

- [x] 근본 원인 분석 완료
- [x] RLS 수정 SQL 작성 (fix_rls_anon_read.sql)
- [x] 전체 마이그레이션 파일 동기화 (migration.sql)
- [x] 로컬 빌드 테스트 통과 (`npm run build` 성공)
- [ ] Supabase DB에 RLS 수정 적용 (MCP 토큰 만료로 대기)
- [ ] 배포 웹에서 카드 뉴스 표시 확인
- [ ] 에디터 페이지 (/editor/[id]) 정상 동작 확인

---

## 수정된/생성된 파일 목록

| 파일 | 변경 | 설명 |
|------|------|------|
| `supabase/fix_rls_anon_read.sql` | 신규 | RLS anon SELECT 정책 추가 SQL |
| `supabase/migration.sql` | 수정 | MVP anon 정책 + GRANT 추가 |
| `work_journal/SUPABASE_MCP_GUIDE.md` | 신규 | Supabase MCP 활용 가이드 |
| `work_journal/README.md` | 수정 | 문서 목록에 MCP 가이드 추가 |
| `work_journal/2026-03-16_rls_bug_fix.md` | 신규 | 본 업무일지 |

---

## 교훈 및 개선점

1. **RLS와 인증 모드 일관성 유지**: 인증 게이트를 비활성화하면 RLS 정책도 anon 역할을 고려해야 함
2. **사일런트 실패 주의**: 빈 배열 반환은 에러가 아니므로 catch에 잡히지 않음 — RLS 차단을 의심해야 함
3. **Supabase MCP 사전 인증**: 디버깅 작업 전 MCP 토큰 유효성을 먼저 확인할 것
4. **다중 사용자 전환 시 할 일**: anon 정책 제거 + 인증 게이트 재활성화 + `@supabase/ssr` 기반 쿠키 관리 도입

---

## 관련 문서

- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) — 배포 가이드
- [SUPABASE_MCP_GUIDE.md](./SUPABASE_MCP_GUIDE.md) — MCP 도구 활용 가이드
- [2026-03-09_vercel_deployment.md](./2026-03-09_vercel_deployment.md) — 첫 배포 일지
