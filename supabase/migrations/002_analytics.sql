-- ============================================================
-- Analytics Events (イベントログ)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analytics_events_name_date ON analytics_events (event_name, created_at);
CREATE INDEX idx_analytics_events_user ON analytics_events (user_id);
CREATE INDEX idx_analytics_events_created ON analytics_events (created_at);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin（service_role）のみフルアクセス、認証ユーザーは自分のイベントをINSERT可
CREATE POLICY "Users can insert their own events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Service role can read all events" ON analytics_events
  FOR SELECT USING (true);

-- ============================================================
-- Feature Flags (機能フラグ)
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- 全員が読取可能（クライアントでフラグチェック）、更新はservice_roleのみ
CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update flags" ON feature_flags
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert flags" ON feature_flags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 初期Feature Flags
-- ============================================================
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('additional_interview', false, '追加インタビュー機能'),
  ('improvement_page', true, '改善要望ページ'),
  ('interview_review', true, 'インタビュー閲覧機能'),
  ('magic_link_login', true, 'Magic Linkログイン')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 日次KPI集計ビュー
-- ============================================================
CREATE OR REPLACE VIEW daily_kpi AS
SELECT
  date_trunc('day', created_at AT TIME ZONE 'Asia/Tokyo')::date AS day,
  event_name,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM analytics_events
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
