# ✏️ pen

ノート記事生成ツール「pen」 — AIとの対話を通じて、テーマに沿った記事を自動生成するWebアプリケーション。

## 🛠 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| データベース | Supabase (PostgreSQL) |
| スタイリング | Tailwind CSS v4 |
| アニメーション | Framer Motion |
| アイコン | Lucide React |
| デプロイ | Vercel |
| CI/CD | GitHub Actions |

## 🚀 セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.local.example .env.local
# .env.local にSupabaseの情報を記入

# 開発サーバー起動
npm run dev
```

## 📁 プロジェクト構造

```
pen/
├── .github/workflows/  # CI/CD パイプライン
├── .vscode/            # VS Code 設定 & 推奨拡張機能
├── src/
│   ├── app/            # ページ & レイアウト
│   ├── components/     # UI コンポーネント
│   └── lib/            # ユーティリティ & Supabase クライアント
├── supabase/           # マイグレーション
├── GEMINI.md           # AIアシスタントルール
└── .agent/workflows/   # 自動化ワークフロー
```

## 🔑 環境変数

| 変数名 | 説明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | サービスロールキー (サーバーのみ) |

## 📝 ライセンス

Private
