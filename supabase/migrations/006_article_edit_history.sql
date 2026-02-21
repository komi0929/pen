-- ============================================================
-- article_edit_history: 編集前のスナップショットを保存
-- ============================================================
CREATE TABLE IF NOT EXISTS article_edit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  edit_label TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE article_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own edit history" ON article_edit_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own edit history" ON article_edit_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own edit history" ON article_edit_history
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups by article
CREATE INDEX IF NOT EXISTS idx_article_edit_history_article_id
  ON article_edit_history(article_id, created_at DESC);
