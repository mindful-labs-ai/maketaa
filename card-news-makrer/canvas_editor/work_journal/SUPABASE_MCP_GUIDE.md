# Supabase MCP 활용 가이드

> Claude Code 에이전트가 Supabase 데이터베이스를 효율적으로 조회하고 관리하기 위한 가이드입니다.
> Supabase MCP(Model Context Protocol)를 통해 직접 데이터베이스에 접근할 수 있습니다.

---

## 개요

### Supabase MCP란?

Supabase MCP는 Claude Code 내에서 Supabase 데이터베이스를 직접 조회, 삽입, 수정, 삭제할 수 있는 도구 모음입니다.
REST API나 클라이언트 라이브러리를 사용하지 않고도 SQL 쿼리를 직접 실행할 수 있어,
디버깅, QA, 스키마 검증 시 매우 유용합니다.

### 프로젝트 정보

| 항목 | 값 |
|------|-----|
| **Project URL** | `https://txpqctreqmxjgwjrhivn.supabase.co` |
| **Project ID** | `txpqctreqmxjgwjrhivn` (URL의 서브도메인) |
| **Region** | Asia Pacific (ap-southeast-1 또는 동남아시아) |
| **Organization** | mindfullabs-projects |

**Project ID 사용:**
```
MCP 도구 호출 시 project_id 파라미터에 txpqctreqmxjgwjrhivn 입력
```

---

## MCP 도구 목록 및 활용법

### 1. 프로젝트 관리

#### `list_projects`
모든 Supabase 프로젝트 목록 조회

**용도:**
- 프로젝트 ID 확인
- 프로젝트 상태 확인

**사용 예:**
```
에이전트가 여러 프로젝트를 관리할 때 정확한 project_id 확인
```

#### `get_project`
프로젝트 상세 정보 조회

**파라미터:**
- `project_id`: txpqctreqmxjgwjrhivn

**반환 정보:**
- 프로젝트 상태 (active/paused)
- 생성일
- 지역 정보
- 플랜 정보

**용도:**
- 프로젝트 상태 확인
- 프로젝트 정보 검증

#### `get_project_url`
프로젝트의 API 기본 URL 조회

**파라미터:**
- `project_id`: txpqctreqmxjgwjrhivn

**반환:**
- `https://txpqctreqmxjgwjrhivn.supabase.co`

**용도:**
- 환경 변수에 설정할 NEXT_PUBLIC_SUPABASE_URL 확인
- 클라이언트에서 Supabase 초기화 시 사용

---

### 2. 데이터베이스 조회

#### `list_tables`
데이터베이스의 테이블 구조 확인

**파라미터:**
- `project_id`: txpqctreqmxjgwjrhivn
- `schemas`: ["public"] (기본값)
- `verbose`: true | false
  - `false` (기본): 컬럼명만 표시
  - `true`: 컬럼명, 타입, Primary Key, Foreign Key 포함

**사용 예 1: 테이블 목록만 확인**
```
verbose: false
→ card_specs, edit_logs, publish_reports 목록 확인
```

**사용 예 2: 상세 구조 확인**
```
verbose: true
→ 각 테이블의 모든 컬럼, 타입, 인덱스 정보 확인
```

**용도:**
- 스키마 변경 후 구조 검증
- 새로운 컬럼 추가 확인
- 데이터 삽입 전 필드명 및 타입 검증

#### `execute_sql`
SQL 쿼리 직접 실행

**파라미터:**
- `project_id`: txpqctreqmxjgwjrhivn
- `query`: SQL 쿼리 문자열

**권장 사항:**
- **SELECT 쿼리만 사용** (읽기 전용)
- 데이터 수정/삭제는 반드시 `apply_migration` 사용

**사용 제한:**
- 데이터 변경(INSERT, UPDATE, DELETE)은 원칙적으로 가능하지만, 스키마 변경(CREATE, ALTER)은 `apply_migration` 사용 필수

---

### 3. 스키마 관리

#### `list_migrations`
마이그레이션 이력 확인

**파라미터:**
- `project_id`: txpqctreqmxjgwjrhivn

**반환:**
- 마이그레이션명
- 실행 시간
- 상태 (success/failed)

**용도:**
- 현재까지 적용된 스키마 변경 이력 확인
- 특정 마이그레이션의 실행 여부 검증
- 마이그레이션 순서 확인

#### `apply_migration`
새로운 스키마 변경 적용 (마이그레이션 생성 및 실행)

**파라미터:**
- `project_id`: txpqctreqmxjgwjrhivn
- `name`: 마이그레이션명 (snake_case)
- `query`: SQL 쿼리

**마이그레이션명 규칙:**
```
add_column_to_card_specs
create_edit_logs_table
fix_rls_policies
```

**사용 예: 새로운 컬럼 추가**
```
name: "add_notes_column_to_card_specs"
query: "ALTER TABLE card_specs ADD COLUMN notes TEXT;"
```

**사용 예: RLS 정책 추가**
```
name: "add_read_policy_to_edit_logs"
query: "CREATE POLICY ..."
```

**용도:**
- CREATE TABLE, ALTER TABLE 등 DDL 변경
- RLS 정책 추가/수정
- 인덱스 생성
- 함수 정의

**주의:**
- 마이그레이션은 자동으로 버전이 부여됨
- 한 번 실행된 마이그레이션은 재실행 불가 (안전성 보장)

---

### 4. 추가 관리 도구

#### `list_extensions`
데이터베이스 확장(Extension) 확인

**현재 활성화된 확장:**
- `uuid-ossp`: UUID 생성
- `moddatetime`: 자동 타임스탬프 업데이트

#### `get_advisors`
보안 및 성능 경고 확인

**파라미터:**
- `project_id`: txpqctreqmxjgwjrhivn
- `type`: "security" | "performance"

**용도:**
- 보안 취약점 감지 (미설정 RLS 등)
- 성능 이슈 감지 (누락된 인덱스 등)
- RLS 정책 설정 누락 경고

---

## 자주 사용하는 SQL 쿼리 예시

### 카드 스펙 조회

#### 전체 카드 스펙 목록 (최신 순)
```sql
SELECT id, topic, status, created_at FROM card_specs
ORDER BY created_at DESC
LIMIT 20;
```

#### 특정 카드 스펙 조회
```sql
SELECT * FROM card_specs WHERE id = 'SPEC_ID';
```

#### 특정 상태의 카드 스펙
```sql
SELECT id, topic, status, created_at FROM card_specs
WHERE status = 'draft'
ORDER BY created_at DESC;
```

#### 카드 스펙 JSONB 구조 검증
```sql
SELECT
  id,
  topic,
  spec->'meta'->>'id' as meta_id,
  spec->'meta'->>'topic' as meta_topic,
  jsonb_array_length(spec->'cards') as card_count,
  created_at
FROM card_specs
WHERE id = 'SPEC_ID';
```

---

### 편집 로그 조회

#### 특정 카드의 편집 이력 (최근 20개)
```sql
SELECT
  id, spec_id, editor, field_path,
  old_value, new_value, change_reason,
  created_at
FROM edit_logs
WHERE spec_id = 'SPEC_ID'
ORDER BY created_at DESC
LIMIT 20;
```

#### 편집자별 통계
```sql
SELECT
  spec_id,
  editor,
  COUNT(*) as edit_count,
  MAX(created_at) as last_edit
FROM edit_logs
GROUP BY spec_id, editor
ORDER BY edit_count DESC;
```

#### 특정 필드의 모든 변경 이력
```sql
SELECT *
FROM edit_logs
WHERE spec_id = 'SPEC_ID'
  AND field_path LIKE 'cards[%].text.headline%'
ORDER BY created_at DESC;
```

---

### 발행 로그 조회

#### 특정 카드의 발행 현황
```sql
SELECT
  id, spec_id, platform, status,
  post_url, post_id, error_message,
  published_at, created_at
FROM publish_reports
WHERE spec_id = 'SPEC_ID'
ORDER BY created_at DESC;
```

#### 플랫폼별 발행 통계
```sql
SELECT
  platform,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM publish_reports
GROUP BY platform;
```

#### 발행 실패 원인 조사
```sql
SELECT
  spec_id, platform, error_message,
  COUNT(*) as failure_count
FROM publish_reports
WHERE status = 'failed'
GROUP BY spec_id, platform, error_message
ORDER BY failure_count DESC;
```

---

### RLS 정책 및 권한 검증

#### 모든 RLS 정책 확인
```sql
SELECT
  schemaname, tablename, policyname,
  permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

#### 특정 테이블의 RLS 정책 확인
```sql
SELECT
  policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'card_specs'
ORDER BY policyname;
```

#### 테이블별 RLS 활성화 상태 확인
```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

### 데이터 접근 문제 디버깅

#### owner_id 검증
```sql
SELECT
  id, owner_id, topic, status,
  created_at
FROM card_specs
WHERE owner_id = 'USER_UID'
LIMIT 10;
```

#### 특정 UID의 모든 데이터 확인
```sql
SELECT
  'card_specs' as table_name,
  COUNT(*) as record_count
FROM card_specs
WHERE owner_id = 'USER_UID'
UNION ALL
SELECT
  'edit_logs',
  COUNT(*)
FROM edit_logs
WHERE spec_id IN (
  SELECT id FROM card_specs WHERE owner_id = 'USER_UID'
)
UNION ALL
SELECT
  'publish_reports',
  COUNT(*)
FROM publish_reports
WHERE spec_id IN (
  SELECT id FROM card_specs WHERE owner_id = 'USER_UID'
);
```

---

## QA/디버깅 시 MCP 활용 체크리스트

### 1. 데이터가 보이지 않을 때

#### 단계 1: 데이터 존재 확인
```bash
execute_sql로 SELECT 쿼리 실행
→ 데이터 존재 여부 확인
```

**쿼리:**
```sql
SELECT COUNT(*) as total FROM card_specs;
SELECT COUNT(*) FROM card_specs WHERE topic = '찾는_토픽';
```

#### 단계 2: RLS 정책 확인
```bash
execute_sql로 pg_policies 쿼리 실행
→ SELECT 정책 존재 여부 확인
```

**쿼리:**
```sql
SELECT policyname, roles, cmd FROM pg_policies
WHERE tablename = 'card_specs' AND cmd = 'SELECT';
```

#### 단계 3: owner_id 검증
```bash
현재 인증된 사용자의 UID와 데이터의 owner_id 비교
```

**쿼리:**
```sql
SELECT id, owner_id FROM card_specs
WHERE id = 'LOOKING_FOR_ID';
```

---

### 2. 데이터 무결성 검증

#### JSONB spec 구조 유효성 검증
```sql
-- 필수 필드 존재 확인
SELECT
  id,
  spec ? 'meta' as has_meta,
  spec ? 'cards' as has_cards,
  spec->'meta' ? 'id' as has_meta_id,
  spec->'meta' ? 'topic' as has_meta_topic,
  jsonb_array_length(spec->'cards') as card_count
FROM card_specs
WHERE id = 'SPEC_ID';
```

#### 잘못된 JSONB 데이터 찾기
```sql
SELECT
  id, topic, status
FROM card_specs
WHERE spec IS NULL
   OR NOT (spec ? 'meta')
   OR NOT (spec ? 'cards')
ORDER BY created_at DESC;
```

#### 카드 배열의 구조 검증
```sql
SELECT
  id,
  topic,
  jsonb_array_length(spec->'cards') as card_count,
  spec->'cards'->0 as first_card
FROM card_specs
WHERE id = 'SPEC_ID';
```

---

### 3. 스키마 변경 후 검증

#### 변경된 테이블 구조 확인
```bash
list_tables를 verbose: true로 실행
→ 새로운 컬럼/인덱스 확인
```

#### 마이그레이션 이력 확인
```bash
list_migrations 실행
→ 방금 적용한 마이그레이션 존재 여부 확인
```

**예시:**
```
마이그레이션 이름: add_notes_column_to_card_specs
상태: success
시간: 2026-03-16 10:30:45
```

#### 데이터 타입 호환성 확인
```sql
-- 문자열로 저장된 숫자 필드 찾기
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'card_specs'
ORDER BY ordinal_position;
```

---

## 주의사항 및 제한사항

### MCP 인증 및 토큰

- **토큰 만료:** MCP 토큰이 만료될 수 있음
  - 증상: "Unauthorized" 또는 인증 에러
  - 해결: Claude Code 세션 재시작 또는 재인증 필요

- **권한:** MCP는 프로젝트 관리자 권한으로 동작
  - 모든 테이블 접근 가능
  - RLS 정책은 클라이언트 앱에만 적용 (MCP는 바이패스)

### SQL 쿼리 사용 규칙

| 작업 | 도구 | 설명 |
|------|------|------|
| SELECT | `execute_sql` | 읽기 전용, 안전함 |
| INSERT, UPDATE, DELETE | `execute_sql` | 가능하지만 신중함 필요 |
| CREATE TABLE, ALTER TABLE | `apply_migration` | **필수** |
| CREATE INDEX | `apply_migration` | **필수** |
| CREATE POLICY (RLS) | `apply_migration` | **필수** |
| DROP 명령어 | `apply_migration` | **신중함** |

**핵심 규칙:**
```
DDL (Schema 변경) → apply_migration 필수
DML (Data 변경) → execute_sql 가능하지만 신중함
DQL (Data 조회) → execute_sql 권장
```

---

### 실수하기 쉬운 사항

#### 1. SELECT 폴백에 주의
```sql
-- 잘못된 예: RLS에 걸릴 수 있음
SELECT * FROM card_specs;

-- 올바른 예: MCP는 RLS 바이패스이므로 괜찮지만,
-- 쿼리 설계 시 명시적으로 작성
SELECT id, topic, status FROM card_specs WHERE id = 'SPEC_ID';
```

#### 2. 트랜잭션 미지원
```sql
-- 작동하지 않음
BEGIN;
INSERT INTO card_specs ...;
COMMIT;

-- 단일 쿼리로 실행
INSERT INTO card_specs ...;
```

#### 3. 타임스탬프 필드는 자동 관리
```sql
-- 올바른 예: created_at, updated_at은 자동 설정됨
INSERT INTO card_specs (id, owner_id, topic, status, spec)
VALUES ('new-id', 'user-uid', 'topic', 'draft', '{}');

-- 수정할 필요 없음: updated_at은 moddatetime 트리거로 자동 갱신
UPDATE card_specs SET topic = 'new topic' WHERE id = 'new-id';
```

---

### service_role_key와 MCP의 관계

- **service_role_key:** Supabase 서버 백엔드에서 RLS를 바이패스하기 위한 키
- **MCP:** 내부적으로 service_role_key를 사용하여 모든 데이터 접근 가능
- **결과:** 별도로 service_role_key를 설정할 필요 없음 (MCP가 자동 처리)

---

## 일반적인 시나리오별 가이드

### 시나리오 1: 새로운 카드 스펙 생성 후 데이터 검증

```
1. 애플리케이션에서 카드 생성
2. list_tables (verbose: true)로 card_specs 구조 확인
3. execute_sql로 SELECT 실행
   SELECT * FROM card_specs WHERE id = 'NEW_ID' LIMIT 1;
4. JSONB spec 구조 검증
   SELECT spec FROM card_specs WHERE id = 'NEW_ID';
```

---

### 시나리오 2: 편집 로그 추적

```
1. 사용자가 카드 편집
2. execute_sql로 edit_logs 조회
   SELECT * FROM edit_logs WHERE spec_id = 'SPEC_ID'
   ORDER BY created_at DESC LIMIT 10;
3. 편집 이력 분석
4. 필요시 old_value, new_value 비교
```

---

### 시나리오 3: 발행 실패 원인 조사

```
1. publish_reports에서 실패한 발행 기록 조회
   SELECT * FROM publish_reports
   WHERE spec_id = 'SPEC_ID' AND status = 'failed';
2. error_message 확인
3. platform별로 성공/실패 통계 조회
4. 패턴 분석 및 원인 파악
```

---

### 시나리오 4: RLS 정책 문제 해결

```
1. 사용자가 데이터 접근 불가 보고
2. RLS 정책 조회
   SELECT * FROM pg_policies WHERE tablename = 'card_specs';
3. 현재 사용자 UID와 owner_id 비교
4. 필요시 apply_migration으로 정책 수정/추가
```

---

## MCP 도구 빠른 참조표

| 도구 | 목적 | 입력 | 출력 |
|------|------|------|------|
| `list_projects` | 프로젝트 목록 | 없음 | 프로젝트 ID, 상태, URL |
| `get_project` | 프로젝트 상세 | project_id | 상태, 플랜, 지역 |
| `get_project_url` | API URL | project_id | Base URL |
| `list_tables` | 테이블 목록 | project_id, verbose | 테이블명, 컬럼명, 타입 |
| `execute_sql` | SQL 실행 | project_id, query | 쿼리 결과 |
| `list_migrations` | 마이그레이션 이력 | project_id | 마이그레이션 이름, 상태 |
| `apply_migration` | 스키마 변경 | project_id, name, query | 실행 결과 |
| `list_extensions` | 확장 목록 | project_id | 활성화된 확장 |
| `get_advisors` | 보안/성능 경고 | project_id, type | 경고 목록 |

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `/supabase/migration.sql` | 스키마 정의 (모든 테이블, 인덱스, RLS 정책) |
| `/canvas_editor/lib/supabase.ts` | Supabase 클라이언트 초기화 |
| `/canvas_editor/lib/api.ts` | API 래퍼 (클라이언트 사용) |
| `/canvas_editor/CLAUDE.md` | Canvas Editor 에이전트 가이드 |
| `/canvas_editor/ARCHITECTURE.md` | 프로젝트 아키텍처 |

---

## 추가 리소스

### Supabase 공식 문서
- [Supabase SQL 에디터](https://app.supabase.com/)
- [Supabase JavaScript 클라이언트](https://supabase.com/docs/reference/javascript)

### 프로젝트 관련
- Supabase Dashboard: https://app.supabase.com/
- 프로젝트 URL: https://txpqctreqmxjgwjrhivn.supabase.co

---

## FAQ

### Q: MCP로 데이터를 수정해도 되나요?
**A:** 기술적으로 가능하지만, 디버깅/검증 목적의 SELECT 사용을 권장합니다.
데이터 변경이 필요하면 apply_migration (스키마) 또는 애플리케이션 API를 사용하세요.

### Q: RLS 정책이 MCP에도 적용되나요?
**A:** 아니요. MCP는 관리자 권한으로 작동하여 모든 데이터 접근 가능합니다.
이를 통해 권한 문제 디버깅이 용이합니다.

### Q: 마이그레이션을 실수로 실행했어요. 롤백할 수 있나요?
**A:** 직접 롤백은 불가능하지만, 새로운 마이그레이션으로 이전 상태 복구 가능합니다.
예: ALTER TABLE ADD COLUMN을 했다면, 새 마이그레이션으로 DROP COLUMN 실행.

### Q: 여러 쿼리를 한 번에 실행할 수 있나요?
**A:** execute_sql은 단일 쿼리만 지원합니다. 여러 쿼리가 필요하면 apply_migration 사용하세요.

---

## 체크리스트: 새로운 에이전트가 MCP 사용 준비할 때

- [ ] Project ID 확인: `txpqctreqmxjgwjrhivn`
- [ ] `list_tables` (verbose: true)로 스키마 학습
- [ ] `list_migrations`로 마이그레이션 이력 검토
- [ ] 자주 사용할 SELECT 쿼리 북마크
- [ ] RLS 정책 확인: `pg_policies` 쿼리 실행
- [ ] 본 문서의 시나리오 섹션 검토

---

*마지막 업데이트: 2026-03-16*

에이전트가 이 문서를 참조할 때: 먼저 현재 작업 상황을 파악한 후, 필요한 MCP 도구를 선택하여 데이터베이스 검증을 수행하세요.
