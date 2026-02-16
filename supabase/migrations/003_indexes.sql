-- pen: DBインデックス追加マイグレーション
-- RLSの auth.uid() = user_id クエリを高速化するためのインデックス

-- themes: ユーザーごとのテーマ取得
CREATE INDEX IF NOT EXISTS idx_themes_user_id ON themes(user_id);

-- memos: テーマごとのメモ取得
CREATE INDEX IF NOT EXISTS idx_memos_theme_id ON memos(theme_id);
CREATE INDEX IF NOT EXISTS idx_memos_user_id ON memos(user_id);

-- interviews: テーマごとのインタビュー取得
CREATE INDEX IF NOT EXISTS idx_interviews_theme_id ON interviews(theme_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(theme_id, status);

-- interview_messages: インタビューごとのメッセージ取得
CREATE INDEX IF NOT EXISTS idx_interview_messages_interview_id ON interview_messages(interview_id);

-- articles: ユーザーごとの記事取得
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_theme_id ON articles(theme_id);

