import { redirect } from "next/navigation";

// メモ機能はテーマ詳細ページに統合されました
// 後方互換のためリダイレクト
export default function MemosPage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  // Next.js 15+ async params
  params.then(({ themeId }) => {
    redirect(`/themes/${themeId}`);
  });

  // fallback redirect
  redirect("/themes");
}
