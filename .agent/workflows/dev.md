---
description: 標準的な開発ワークフロー（ビルド、テスト、デプロイ）
---

# 開発ワークフロー

## ローカル開発

// turbo-all

1. 依存関係のインストール

```powershell
npm install
```

2. 開発サーバー起動

```powershell
npm run dev
```

3. ブラウザで確認
   http://localhost:3000

## ビルド＆デプロイ

1. TypeScript 型チェック

```powershell
npx tsc --noEmit
```

2. プロダクションビルド

```powershell
npm run build
```

3. **改善履歴の更新**（大規模な機能追加・改善時は必ず実行）
   大規模な機能追加、UX改善、バグ修正を行った場合は、コミット前に改善履歴を追加する。

```powershell
# ローカルの開発サーバーが起動している場合:
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/improvement-history" -Method POST -ContentType "application/json" -Body '{"code":"0929","title":"改善タイトル","description":"改善の詳細説明"}'

# 本番環境に直接追加する場合:
Invoke-RestMethod -Uri "https://pen.hitokoto.tech/api/admin/improvement-history" -Method POST -ContentType "application/json" -Body '{"code":"0929","title":"改善タイトル","description":"改善の詳細説明"}'
```

> **判断基準**: 1ファイル程度の軽微な修正は不要。ユーザー体験に影響する改善、新機能、重大なバグ修正は必ず追加する。

4. コミット＆プッシュ（自動デプロイ）

```powershell
git add -A
git commit -m "feat: 機能名"
git push
```

## Supabase マイグレーション

1. Supabase CLI リンク

```powershell
npx supabase link --project-ref eddujglramwfldshiagd
```

2. マイグレーション作成

```powershell
npx supabase migration new 機能名
```

3. マイグレーション適用

```powershell
npx supabase db push
```

4. 型再生成

```powershell
npx supabase gen types typescript --project-id eddujglramwfldshiagd > src/lib/database.types.ts
```

## ⚠️ 再発防止ルール

**作業開始前に必ず `/mistakes` を確認すること。**

## トラブルシューティング

- **ビルド失敗**: `npm run build` のログを確認
- **型エラー**: `npx tsc --noEmit` で詳細確認
- **DB接続エラー**: `.env.local` の値を確認
- **RLSエラー**: Supabase Dashboard で Policy を確認
