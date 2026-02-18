# pen - プロジェクトルール

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router, TypeScript)
- **データベース**: Supabase (PostgreSQL, RLS)
- **スタイリング**: Tailwind CSS v4
- **UI**: shadcn/ui, Lucide React, Framer Motion
- **デプロイ**: Vercel

## コーディング規約

- 日本語UIを優先（エラーメッセージ含む）
- Server Actions は必ず try-catch で囲む
- Supabase クエリは `ActionResult<T>` 型で返す
- Client Component は `'use client'` を明示
- `@/` エイリアスを使用（相対パス禁止）

## ファイル構造

```
src/
├── app/          # ページ & レイアウト
├── components/   # UI コンポーネント
├── lib/          # ユーティリティ & Supabase クライアント
└── types/        # 型定義
```

## コミット規約

- `feat:` 新機能
- `fix:` バグ修正
- `docs:` ドキュメント
- `style:` スタイル変更
- `refactor:` リファクタリング
- `deploy:` デプロイ関連

## セキュリティ

- `SUPABASE_SERVICE_ROLE_KEY` は Server Actions / Server Components のみ
- RLS は全テーブルで有効化
- `auth.uid()` ベースのポリシー必須

## 作業スタイル（厳命）

1. **曖昧な指示は仮説付きで確認** → 「〜ということですか？」と仮説を立てて確認する
2. **より良い方法がないか必ず検証** → ユーザーの指示を鵜呑みにせず、実装前に代替案を検討する
3. **より良い方法が見つかった場合は必ずユーザーの確認を取る** → 確認を取ったうえで計画を修正する
4. **⚠️ 指示と異なることをする場合の事前確認は必須（厳命）** → 勝手に方針を変えない。必ず事前に理由を説明し承認を得る
5. **報告は日本語**
6. **ビルドエラーは自動修正してからプッシュ**

## 改善履歴の自動更新

大規模な機能追加・UX改善・重大バグ修正を行った場合は、**commit前に必ず改善履歴を追加する**。

- エンドポイント: `POST /api/admin/improvement-history`
- Body: `{ "code": "0929", "title": "改善タイトル", "description": "詳細" }`
- 判断基準: ユーザー体験に影響する変更は必ず追加。1ファイル程度の軽微修正は不要。
