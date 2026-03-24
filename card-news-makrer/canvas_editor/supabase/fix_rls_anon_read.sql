-- ============================================================================
-- Migration: fix_rls_anon_read.sql
-- Date: 2026-03-16
-- Purpose: MVP 단독 사용 모드에서 비인증(anon) 사용자의 읽기 접근 허용
--
-- 배경: canvas_editor의 기존 RLS 정책이 TO authenticated 전용으로 설정되어
--       인증 게이트를 비활성화한 MVP 모드에서 anon 사용자가 데이터를 읽지 못하는
--       버그가 발생함.
--
-- 주의: 이 파일의 정책들은 MVP 단독 사용 모드 전용입니다.
--       다중 사용자 지원으로 전환 시 아래 정책들을 DROP하고
--       authenticated 정책만 유지해야 합니다.
-- ============================================================================

-- MVP 단독 사용 모드: 비인증(anon) 사용자도 읽기 가능
-- 주의: 다중 사용자 지원 시 이 정책들을 제거하고 authenticated 정책만 사용할 것
CREATE POLICY "Anon can view all card_specs"
  ON card_specs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can view all edit_logs"
  ON edit_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can view all publish_reports"
  ON publish_reports FOR SELECT
  TO anon
  USING (true);

GRANT SELECT ON public.card_specs TO anon;
GRANT SELECT ON public.edit_logs TO anon;
GRANT SELECT ON public.publish_reports TO anon;
