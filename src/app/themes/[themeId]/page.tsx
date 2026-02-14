"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getActiveInterview } from "@/lib/actions/interviews";
import { getMemos } from "@/lib/actions/memos";
import { getTheme } from "@/lib/actions/themes";
import type { Interview, Memo, Theme } from "@/types";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  PenLine,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function ThemeDetailContent() {
  const params = useParams();
  const themeId = params.themeId as string;

  const [theme, setTheme] = useState<Theme | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [activeInterview, setActiveInterview] = useState<Interview | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [themeResult, memosResult, interviewResult] = await Promise.all([
      getTheme(themeId),
      getMemos(themeId),
      getActiveInterview(themeId),
    ]);

    if (themeResult.success) setTheme(themeResult.data);
    if (memosResult.success) setMemos(memosResult.data);
    if (interviewResult.success) setActiveInterview(interviewResult.data);
    setLoading(false);
  }, [themeId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="pen-spinner" />
        </main>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">テーマが見つかりません</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in py-8">
          <Link
            href="/themes"
            className="text-muted-foreground hover:bg-muted hover:text-foreground mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            テーマ一覧に戻る
          </Link>

          <div className="mb-8">
            <h1 className="mb-2 text-2xl font-bold">{theme.title}</h1>
            {theme.description && (
              <p className="text-muted-foreground">{theme.description}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* メモ */}
            <Link
              href={`/themes/${themeId}/memos`}
              className="pen-card flex flex-col items-start py-8 text-left"
            >
              <div className="bg-muted mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl">
                <StickyNote className="text-accent h-6 w-6" />
              </div>
              <h3 className="mb-1 font-bold">メモ</h3>
              <p className="text-muted-foreground mb-3 text-sm">
                思いついたことを書き溜める
              </p>
              <span className="pen-badge">{memos.length}件のメモ</span>
            </Link>

            {/* インタビュー */}
            <Link
              href={`/themes/${themeId}/interview`}
              className="pen-card flex flex-col items-center py-8 text-center"
            >
              <div className="bg-muted mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl">
                <MessageSquare className="text-accent h-6 w-6" />
              </div>
              <h3 className="mb-1 font-bold">インタビュー</h3>
              <p className="text-muted-foreground mb-3 text-sm">
                AIと対話して考えを深める
              </p>
              {activeInterview ? (
                <span className="pen-badge bg-accent/10 text-accent">
                  進行中
                </span>
              ) : (
                <span className="pen-badge">開始する</span>
              )}
            </Link>

            {/* 記事 */}
            <Link
              href={`/articles?theme=${themeId}`}
              className="pen-card flex flex-col items-center py-8 text-center"
            >
              <div className="bg-muted mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl">
                <FileText className="text-accent h-6 w-6" />
              </div>
              <h3 className="mb-1 font-bold">記事</h3>
              <p className="text-muted-foreground mb-3 text-sm">
                生成された記事を確認
              </p>
              <span className="pen-badge">記事を見る</span>
            </Link>
          </div>

          {/* メモプレビュー */}
          {memos.length > 0 && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">
                  <PenLine className="mr-1.5 inline h-4 w-4" />
                  最近のメモ
                </h2>
                <Link
                  href={`/themes/${themeId}/memos`}
                  className="text-accent text-sm hover:underline"
                >
                  すべて見る
                </Link>
              </div>
              <div className="space-y-2">
                {memos
                  .slice(-3)
                  .reverse()
                  .map((memo) => (
                    <div
                      key={memo.id}
                      className="border-border bg-card rounded-lg border px-4 py-3 text-sm"
                    >
                      <p className="line-clamp-2">{memo.content}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {new Date(memo.created_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ThemeDetailPage() {
  return (
    <AuthGuard>
      <ThemeDetailContent />
    </AuthGuard>
  );
}
