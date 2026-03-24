-- Canvas Editor MVP - Supabase Schema & Migrations
-- Created: 2026-03-09
-- Purpose: Database schema for card_specs, edit_logs, and publish_reports

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ============================================================================
-- TABLE: card_specs
-- Purpose: Store complete card_spec.json documents with metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_specs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT (auth.uid()::text),
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'published')),
  spec JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for card_specs
CREATE INDEX IF NOT EXISTS idx_card_specs_owner_id ON card_specs(owner_id);
CREATE INDEX IF NOT EXISTS idx_card_specs_status ON card_specs(status);
CREATE INDEX IF NOT EXISTS idx_card_specs_created_at ON card_specs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_specs_updated_at ON card_specs(updated_at DESC);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_card_specs_updated_at
  BEFORE UPDATE ON card_specs
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- TABLE: edit_logs
-- Purpose: Audit trail for all manual edits (for agent quality improvement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edit_logs (
  id BIGSERIAL PRIMARY KEY,
  spec_id TEXT NOT NULL REFERENCES card_specs(id) ON DELETE CASCADE,
  editor TEXT NOT NULL,                         -- "human" | "system" | agent_id
  field_path TEXT NOT NULL,                     -- e.g., "cards[2].text.headline"
  old_value TEXT,                               -- Previous value (nullable for new fields)
  new_value TEXT NOT NULL,                      -- New value
  change_reason TEXT,                           -- Optional: why was this changed?
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for edit_logs
CREATE INDEX IF NOT EXISTS idx_edit_logs_spec_id ON edit_logs(spec_id);
CREATE INDEX IF NOT EXISTS idx_edit_logs_editor ON edit_logs(editor);
CREATE INDEX IF NOT EXISTS idx_edit_logs_created_at ON edit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edit_logs_field_path ON edit_logs(field_path);

-- ============================================================================
-- TABLE: publish_reports
-- Purpose: Track publishing events to SNS platforms
-- ============================================================================
CREATE TABLE IF NOT EXISTS publish_reports (
  id BIGSERIAL PRIMARY KEY,
  spec_id TEXT NOT NULL REFERENCES card_specs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL                        -- "instagram" | "threads"
    CHECK (platform IN ('instagram', 'threads')),
  post_url TEXT,
  post_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'failed')),
  error_message TEXT,                           -- Store error details if failed
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for publish_reports
CREATE INDEX IF NOT EXISTS idx_publish_reports_spec_id ON publish_reports(spec_id);
CREATE INDEX IF NOT EXISTS idx_publish_reports_platform ON publish_reports(platform);
CREATE INDEX IF NOT EXISTS idx_publish_reports_status ON publish_reports(status);
CREATE INDEX IF NOT EXISTS idx_publish_reports_created_at ON publish_reports(created_at DESC);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_publish_reports_updated_at
  BEFORE UPDATE ON publish_reports
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE card_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_reports ENABLE ROW LEVEL SECURITY;

-- card_specs: Users can view their own specs
CREATE POLICY "Users can view own card_specs"
  ON card_specs FOR SELECT
  TO authenticated
  USING (auth.uid()::text = owner_id);

-- card_specs: Users can create specs (owner_id is auto-set to their uid)
CREATE POLICY "Users can create card_specs"
  ON card_specs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

-- card_specs: Users can update their own specs
CREATE POLICY "Users can update own card_specs"
  ON card_specs FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

-- card_specs: Users can delete their own specs
CREATE POLICY "Users can delete own card_specs"
  ON card_specs FOR DELETE
  TO authenticated
  USING (auth.uid()::text = owner_id);

-- edit_logs: Users can view edit logs for their specs
CREATE POLICY "Users can view edit_logs for own specs"
  ON edit_logs FOR SELECT
  TO authenticated
  USING (
    spec_id IN (
      SELECT id FROM card_specs
      WHERE owner_id = auth.uid()::text
    )
  );

-- edit_logs: Users can insert edit logs for their specs
CREATE POLICY "Users can insert edit_logs for own specs"
  ON edit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    spec_id IN (
      SELECT id FROM card_specs
      WHERE owner_id = auth.uid()::text
    )
  );

-- publish_reports: Users can view reports for their specs
CREATE POLICY "Users can view publish_reports for own specs"
  ON publish_reports FOR SELECT
  TO authenticated
  USING (
    spec_id IN (
      SELECT id FROM card_specs
      WHERE owner_id = auth.uid()::text
    )
  );

-- publish_reports: Users can insert reports for their specs
CREATE POLICY "Users can insert publish_reports for own specs"
  ON publish_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    spec_id IN (
      SELECT id FROM card_specs
      WHERE owner_id = auth.uid()::text
    )
  );

-- publish_reports: Users can update reports for their specs
CREATE POLICY "Users can update publish_reports for own specs"
  ON publish_reports FOR UPDATE
  TO authenticated
  USING (
    spec_id IN (
      SELECT id FROM card_specs
      WHERE owner_id = auth.uid()::text
    )
  )
  WITH CHECK (
    spec_id IN (
      SELECT id FROM card_specs
      WHERE owner_id = auth.uid()::text
    )
  );

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create bucket for card assets (if not exists via Supabase UI, do it here)
-- Note: Storage buckets are best created via Supabase dashboard or SQL
-- This is a reference for what should exist:
--
-- Bucket Name: cardnews-assets
-- Public: true (for image URLs to work)
-- Path pattern: {spec_id}/card_{index}_bg.png
--
-- To create via SQL (if supported):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('cardnews-assets', 'cardnews-assets', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VIEWS (optional, for analytics)
-- ============================================================================

-- View: Recent edits per spec (for quality metrics)
CREATE OR REPLACE VIEW v_recent_edits AS
SELECT
  spec_id,
  COUNT(*) as total_edits,
  COUNT(DISTINCT editor) as unique_editors,
  MAX(created_at) as last_edited_at,
  COUNT(CASE WHEN field_path LIKE 'cards[%].text%' THEN 1 END) as text_edits
FROM edit_logs
GROUP BY spec_id;

-- View: Publishing summary
CREATE OR REPLACE VIEW v_publishing_summary AS
SELECT
  spec_id,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as successful_publishes,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_publishes,
  STRING_AGG(DISTINCT platform, ', ') as platforms
FROM publish_reports
GROUP BY spec_id;

-- ============================================================================
-- SAMPLE DATA (optional - comment out for production)
-- ============================================================================

-- NOTE: These are test records. Remove for production.
-- To seed: psql $DATABASE_URL < supabase/seed.sql
/*
INSERT INTO card_specs (id, owner_id, topic, status, spec) VALUES
(
  '2026-03-09-001',
  '00000000-0000-0000-0000-000000000001',
  '봄철 무기력감 극복하기',
  'draft',
  '{"meta": {"id": "2026-03-09-001", "topic": "봄철 무기력감 극복하기", "status": "draft"}, "cards": [], "sns": {}}'::jsonb
);
*/

-- ============================================================================
-- GRANTS (adjust as needed for your setup)
-- ============================================================================

-- Authenticated users can use the tables (RLS policies handle row access)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_specs TO authenticated;
GRANT SELECT, INSERT ON public.edit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.publish_reports TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
