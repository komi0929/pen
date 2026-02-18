"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  addArticleRef,
  getArticleRefs,
  getArticlesForThemeRef,
  removeArticleRef,
} from "@/lib/actions/article-refs";
import { getActiveInterview } from "@/lib/actions/interviews";
import { createMemo, deleteMemo, getMemos } from "@/lib/actions/memos";
import { getTheme } from "@/lib/actions/themes";
import type { Interview, Memo, Theme, ThemeArticleRef } from "@/types";
import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type AvailableArticle = {
  id: string;
  title: string;
  theme_title: string;
  already_added: boolean;
};

function ThemeDetailContent() {
  const params = useParams();
  const themeId = params.themeId as string;

  const [theme, setTheme] = useState<Theme | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [activeInterview, setActiveInterview] = useState<Interview | null>(
    null
  );
  const [articleRefs, setArticleRefs] = useState<ThemeArticleRef[]>([]);
  const [loading, setLoading] = useState(true);

  // メモ入力
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 記事セレクター（テーマ側から記事を参考メモとして追加）
  const [showArticleSelector, setShowArticleSelector] = useState(false);
  const [availableArticles, setAvailableArticles] = useState<
    AvailableArticle[]
  >([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [addingArticle, setAddingArticle] = useState<string | null>(null);
  const articleSelectorRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [themeResult, memosResult, interviewResult, refsResult] =
      await Promise.all([
        getTheme(themeId),
        getMemos(themeId),
        getActiveInterview(themeId),
        getArticleRefs(themeId),
      ]);

    if (themeResult.success) setTheme(themeResult.data);
    if (memosResult.success) setMemos(memosResult.data);
    if (interviewResult.success) setActiveInterview(interviewResult.data);
    if (refsResult.success) setArticleRefs(refsResult.data);
    setLoading(false);
  }, [themeId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setCreating(true);
    setError(null);
    const result = await createMemo(themeId, content.trim());
    if (result.success) {
      setMemos((prev) => [...prev, result.data]);
      setContent("");
      textareaRef.current?.focus();
    } else {
      setError(result.error);
    }
    setCreating(false);
  };

  const handleDeleteMemo = async (memoId: string) => {
    if (!window.confirm("このメモを削除しますか？")) return;
    const result = await deleteMemo(memoId);
    if (result.success) {
      setMemos((prev) => prev.filter((m) => m.id !== memoId));
    } else {
      setError(result.error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCreateMemo(e as unknown as React.FormEvent);
    }
  };

  const handleRemoveArticleRef = async (refId: string) => {
    if (!window.confirm("この参考記事を削除しますか？")) return;
    const result = await removeArticleRef(refId);
    if (result.success) {
      setArticleRefs((prev) => prev.filter((r) => r.id !== refId));
    } else {
      setError(result.error);
    }
  };

  // 記事セレクターの開閉
  const handleToggleArticleSelector = async () => {
    if (showArticleSelector) {
      setShowArticleSelector(false);
      return;
    }
    setLoadingArticles(true);
    setShowArticleSelector(true);
    const result = await getArticlesForThemeRef(themeId);
    if (result.success) {
      setAvailableArticles(result.data);
    }
    setLoadingArticles(false);
  };

  // 記事を参考メモとして追加
  const handleAddArticleFromSelector = async (articleId: string) => {
    setAddingArticle(articleId);
    const result = await addArticleRef(themeId, articleId);
    if (result.success) {
      setAvailableArticles((prev) =>
        prev.map((a) =>
          a.id === articleId ? { ...a, already_added: true } : a
        )
      );
      // リストを再取得して参考記事表示を更新
      const refsResult = await getArticleRefs(themeId);
      if (refsResult.success) setArticleRefs(refsResult.data);
    } else {
      setError(result.error);
    }
    setAddingArticle(null);
  };

  // 記事セレクター外クリックで閉じる
  useEffect(() => {
    if (!showArticleSelector) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        articleSelectorRef.current &&
        !articleSelectorRef.current.contains(e.target as Node)
      ) {
        setShowArticleSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showArticleSelector]);

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
        <div className="pen-container pen-fade-in pt-14 pb-8">
          <Link
            href="/themes"
            className="text-muted-foreground hover:bg-muted hover:text-foreground mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            テーマ一覧に戻る
          </Link>

          {/* テーマ情報 */}
          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-bold">{theme.title}</h1>
            {theme.description && (
              <p className="text-muted-foreground">{theme.description}</p>
            )}
          </div>

          {/* アクションボタン（常にテーマ情報の直下に表示） */}
          <div className="border-border bg-card mb-6 rounded-xl border p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href={`/themes/${themeId}/interview`}
                className="pen-btn pen-btn-accent flex-1 justify-center py-3 text-base"
              >
                <MessageSquare className="h-5 w-5" />
                {activeInterview
                  ? "インタビューを続ける"
                  : "AIインタビューを始める"}
              </Link>

              {(theme.article_count ?? 0) > 0 && (
                <Link
                  href={`/articles?theme=${themeId}`}
                  className="pen-btn pen-btn-secondary flex-1 justify-center py-3"
                >
                  <FileText className="h-4 w-4" />
                  この記事を読む
                </Link>
              )}
            </div>

            {memos.length === 0 && articleRefs.length === 0 && (
              <p className="text-muted-foreground mt-3 text-center text-xs">
                <StickyNote className="mr-1 inline h-3 w-3" />
                メモを書いてからインタビューを始めると、より良い記事が生成されます
              </p>
            )}
          </div>

          {/* 参考記事 */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-bold">
                <FileText className="h-4 w-4" />
                参考記事
                {articleRefs.length > 0 && `（${articleRefs.length}件）`}
                <span className="font-normal">
                  — インタビュー時に参照されます
                </span>
              </h2>
              <div className="relative" ref={articleSelectorRef}>
                <button
                  onClick={handleToggleArticleSelector}
                  className="pen-btn pen-btn-secondary text-xs"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  記事を追加
                  {showArticleSelector ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
                {showArticleSelector && (
                  <div className="border-border bg-card absolute right-0 z-50 mt-2 w-80 rounded-xl border shadow-lg">
                    <div className="border-border border-b px-4 py-3">
                      <p className="text-sm font-bold">参考記事を選択</p>
                      <p className="text-muted-foreground text-xs">
                        過去の記事をこのテーマの参考として追加
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {loadingArticles ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                        </div>
                      ) : availableArticles.length === 0 ? (
                        <p className="text-muted-foreground py-4 text-center text-sm">
                          追加可能な記事がありません
                        </p>
                      ) : (
                        availableArticles.map((article) => (
                          <button
                            key={article.id}
                            onClick={() =>
                              !article.already_added &&
                              handleAddArticleFromSelector(article.id)
                            }
                            disabled={
                              addingArticle === article.id ||
                              article.already_added
                            }
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                              article.already_added
                                ? "cursor-default opacity-50"
                                : "hover:bg-muted cursor-pointer"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">
                                {article.title}
                              </p>
                              {article.theme_title && (
                                <p className="text-muted-foreground truncate text-xs">
                                  {article.theme_title}
                                </p>
                              )}
                            </div>
                            {addingArticle === article.id ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                            ) : article.already_added ? (
                              <Check className="text-accent h-4 w-4 shrink-0" />
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {articleRefs.length > 0 && (
              <div className="space-y-2">
                {articleRefs.map((ref) => (
                  <div
                    key={ref.id}
                    className="group border-border bg-card flex items-start gap-3 rounded-lg border px-4 py-3"
                  >
                    <FileText className="text-accent mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {ref.article_title || "無題の記事"}
                      </p>
                      {ref.source_theme_title && (
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          元テーマ: {ref.source_theme_title}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveArticleRef(ref.id)}
                      aria-label="参考記事を削除"
                      className="text-muted-foreground hover:bg-danger/10 hover:text-danger shrink-0 rounded-lg p-2 transition-all md:opacity-0 md:group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {articleRefs.length === 0 && !showArticleSelector && (
              <p className="text-muted-foreground text-xs">
                参考記事を追加すると、インタビュー時にAIが参照します
              </p>
            )}
          </div>

          {/* メモ入力フォーム */}
          <form onSubmit={handleCreateMemo} className="pen-card mb-6">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メモを入力... (Ctrl+Enterで追加)"
              className="pen-textarea"
              rows={3}
              autoFocus
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {memos.length}件のメモ
              </span>
              <button
                type="submit"
                disabled={creating || !content.trim()}
                className="pen-btn pen-btn-accent"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                追加
              </button>
            </div>
          </form>

          {error && (
            <p className="text-danger mb-4 text-center text-sm">{error}</p>
          )}

          {/* メモ一覧 */}
          {memos.length > 0 && (
            <div className="space-y-3">
              {memos.map((memo) => (
                <div
                  key={memo.id}
                  className="group border-border bg-card flex items-start gap-3 rounded-lg border px-4 py-3"
                >
                  <div className="bg-accent mt-1 h-2.5 w-2.5 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {memo.content}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(memo.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteMemo(memo.id)}
                    aria-label="メモを削除"
                    className="text-muted-foreground hover:bg-danger/10 hover:text-danger shrink-0 rounded-lg p-2 transition-all md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
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
