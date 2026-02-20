-- pen: Style References Migration
-- ユーザーが参考文体を複数登録し、記事生成時に選択できるようにする

-- ============================================================
-- style_references (参考文体)
-- ============================================================
CREATE TABLE IF NOT EXISTS style_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  source_text TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE style_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own style_references" ON style_references
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own style_references" ON style_references
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own style_references" ON style_references
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own style_references" ON style_references
  FOR DELETE USING (auth.uid() = user_id);

-- デフォルトを1つだけにするためのユニーク部分インデックス
-- is_default = true のレコードは user_id あたり1つだけ
CREATE UNIQUE INDEX idx_style_references_default
  ON style_references (user_id)
  WHERE is_default = true;

-- 検索用インデックス
CREATE INDEX idx_style_references_user_id ON style_references (user_id);
