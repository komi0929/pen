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

3. コミット＆プッシュ（自動デプロイ）
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

## トラブルシューティング

- **ビルド失敗**: `npm run build` のログを確認
- **型エラー**: `npx tsc --noEmit` で詳細確認
- **DB接続エラー**: `.env.local` の値を確認
- **RLSエラー**: Supabase Dashboard で Policy を確認
