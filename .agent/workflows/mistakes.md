---
description: 繰り返しミスの再発防止チェックリスト（コマンド実行前・コード変更前に必ず確認）
---

# ⛔ 再発防止ルール

**このファイルはすべての作業開始時に暗黙的に適用される。**

## 1. PowerShell コマンド

| ❌ やりがち               | ✅ 正しい               |
| ------------------------- | ----------------------- |
| `git add . && git commit` | `git add .; git commit` |
| `cmd1 && cmd2 && cmd3`    | `cmd1; cmd2; cmd3`      |
| `cd src/app`              | `Cwd パラメータで指定`  |

- **`&&` は絶対に使わない** → PowerShell では構文エラー
- **`cd` コマンドは使わない** → `run_command` の `Cwd` パラメータで指定

## 2. コミット前の確認

- [ ] `git add` と `git commit` と `git push` は **個別のコマンドか `;` で連結**
- [ ] コミットメッセージは `feat:` / `fix:` / `style:` / `refactor:` のプレフィックス付き
- [ ] 大規模変更時は改善履歴 API を叩いてからコミット

## 3. Next.js / React

- [ ] Client Component には `'use client'` を明記
- [ ] import は `@/` エイリアスを使用（`../` 相対パス禁止）
- [ ] Server Actions は `try-catch` で囲む
- [ ] 未使用の import を残さない（`Bot` を消したのに import に残す等）

## 4. Tailwind CSS v4

- [ ] `@apply` 内で使えないユーティリティがある → 直接 `className` に書く
- [ ] カスタムカラーは `@theme` で定義済みのものを使う

## 5. Supabase

- [ ] RLS ポリシーは `auth.uid()` ベース
- [ ] `SUPABASE_SERVICE_ROLE_KEY` はサーバーサイドのみ
- [ ] マイグレーション作成後は `npx supabase db push` を忘れない

## 6. 作業スタイル（ユーザールール準拠）

- [ ] **確認・質問をしない** → 自律的に完璧に仕上げてから報告
- [ ] **途中経過の確認は不要** → 最終結果のみ報告
- [ ] **報告は日本語**
- [ ] ビルドエラーは自動修正してからプッシュ
