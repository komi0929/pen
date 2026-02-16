-- pen: 改善計画機能のスキーマ
-- テーブル: improvement_requests, improvement_likes, improvement_history

-- ============================================================
-- 7. Improvement Requests (改善要望)
-- ============================================================
CREATE TABLE IF NOT EXISTS improvement_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_official BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE improvement_requests ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Improvement requests are viewable by everyone" ON improvement_requests
  FOR SELECT USING (true);
-- 認証ユーザーのみ投稿可能
CREATE POLICY "Authenticated users can insert requests" ON improvement_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. Improvement Likes (改善要望 いいね)
-- ============================================================
CREATE TABLE IF NOT EXISTS improvement_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES improvement_requests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (request_id, user_id)
);

ALTER TABLE improvement_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" ON improvement_likes
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert likes" ON improvement_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON improvement_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update likes_count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE improvement_requests SET likes_count = likes_count + 1 WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE improvement_requests SET likes_count = likes_count - 1 WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON improvement_likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON improvement_likes
  FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- ============================================================
-- 9. Improvement History (改善履歴)
-- ============================================================
CREATE TABLE IF NOT EXISTS improvement_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE improvement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Improvement history is viewable by everyone" ON improvement_history
  FOR SELECT USING (true);

-- ============================================================
-- 初期データ投入
-- ============================================================

-- 改善要望（公式）
INSERT INTO improvement_requests (id, user_id, title, description, is_official, likes_count) VALUES
  ('a0000001-0000-0000-0000-000000000001', NULL, '記事の編集機能', '生成後に手を加えられるように', true, 0),
  ('a0000001-0000-0000-0000-000000000002', NULL, '文体の指定', 'カジュアル、フォーマルなど選べるように', true, 0),
  ('a0000001-0000-0000-0000-000000000003', NULL, '参考記事のインポート', 'noteのURLを入れて、その構成を参照しながら書けるように', true, 0);

-- 改善履歴
INSERT INTO improvement_history (title, description, date) VALUES
  ('サービスリリース', '', '2026-02-16');
