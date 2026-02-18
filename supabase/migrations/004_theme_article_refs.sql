-- ============================================================
-- theme_article_refs: テーマと参照記事の多対多リレーション
-- 生成済み記事を他テーマの参考資料として紐づけ、
-- インタビュー時にAIが参照する
-- ============================================================
CREATE TABLE IF NOT EXISTS theme_article_refs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(theme_id, article_id)
);

ALTER TABLE theme_article_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own article refs" ON theme_article_refs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own article refs" ON theme_article_refs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own article refs" ON theme_article_refs
  FOR DELETE USING (auth.uid() = user_id);

-- パフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_theme_article_refs_theme_id ON theme_article_refs(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_article_refs_article_id ON theme_article_refs(article_id);
