"use client";

import { trackClientEvent } from "@/lib/analytics-client";

import { AuthGuard } from "@/components/AuthGuard";
import { BlockEditor } from "@/components/BlockEditor";
import { EditHistoryPanel } from "@/components/EditHistoryPanel";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NoteMarkdown } from "@/components/NoteMarkdown";
import {
  addArticleRef,
  getThemesForArticleRef,
} from "@/lib/actions/article-refs";
import type { InterviewMessage } from "@/lib/actions/articles";
import {
  deleteArticle,
  getArticle,
  getInterviewMessages,
} from "@/lib/actions/articles";
import { getStyleReferences } from "@/lib/actions/style-references";
import type { Article, StyleReference } from "@/types";
import {
  ArrowLeft,
  BookmarkPlus,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Loader2,
  MessageSquare,
  Pencil,
  RefreshCw,
  Trash2,
  Undo2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── 段落レベルの差分比較コンポーネント ── */
function RewriteDiff({
  beforeContent,
  afterContent,
  mode,
}: {
  beforeContent: string;
  afterContent: string;
  mode: "before" | "after";
}) {
  // 段落分割（空行で区切る）
  const beforeParagraphs = beforeContent.split(/\n\n+/).filter((p) => p.trim());
  const afterParagraphs = afterContent.split(/\n\n+/).filter((p) => p.trim());

  // LCSで段落のマッチングを行い、変更された段落を特定
  const matchSet = new Set<string>();
  const shorter =
    beforeParagraphs.length <= afterParagraphs.length
      ? beforeParagraphs
      : afterParagraphs;
  const longer =
    beforeParagraphs.length <= afterParagraphs.length
      ? afterParagraphs
      : beforeParagraphs;

  // 正規化: 空白を除去して比較
  const normalize = (s: string) => s.replace(/\s+/g, "");

  shorter.forEach((p) => {
    const norm = normalize(p);
    if (longer.some((lp) => normalize(lp) === norm)) {
      matchSet.add(norm);
    }
  });

  const paragraphs = mode === "after" ? afterParagraphs : beforeParagraphs;

  return (
    <div>
      {paragraphs.map((para, i) => {
        const isChanged = !matchSet.has(normalize(para));
        const bgClass = isChanged
          ? mode === "after"
            ? "bg-green-50 border-l-4 border-green-300 pl-3 py-1 my-2 rounded-r"
            : "bg-red-50 border-l-4 border-red-300 pl-3 py-1 my-2 rounded-r line-through opacity-70"
          : "";
        const lines = para.split("\n");
        return (
          <div key={i} className={bgClass}>
            {lines.map((line, j) => {
              // マークダウンの見出しを処理
              if (line.startsWith("### "))
                return <h3 key={j}>{line.replace(/^###\s*/, "")}</h3>;
              if (line.startsWith("## "))
                return <h2 key={j}>{line.replace(/^##\s*/, "")}</h2>;
              if (line.startsWith("# "))
                return <h1 key={j}>{line.replace(/^#\s*/, "")}</h1>;
              // 太字を処理
              const parts = line.split(/(\*\*[^*]+\*\*)/);
              return (
                <p key={j} className="my-1 text-sm leading-relaxed">
                  {parts.map((part, k) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={k}>{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={k}>{part}</span>
                    )
                  )}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ArticleDetailContent() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.articleId as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // 編集モード
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 他テーマの参考に追加
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [availableThemes, setAvailableThemes] = useState<
    { id: string; title: string; already_added: boolean }[]
  >([]);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [addingToTheme, setAddingToTheme] = useState<string | null>(null);
  const themeSelectorRef = useRef<HTMLDivElement>(null);

  // リライト機能
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteStyles, setRewriteStyles] = useState<StyleReference[]>([]);
  const [selectedRewriteStyle, setSelectedRewriteStyle] = useState<string>("");
  const [rewriting, setRewriting] = useState(false);
  const [loadingRewriteStyles, setLoadingRewriteStyles] = useState(false);

  // リライト比較機能
  const [rewriteComparison, setRewriteComparison] = useState<{
    beforeTitle: string;
    beforeContent: string;
    afterTitle: string;
    afterContent: string;
  } | null>(null);
  const [comparisonTab, setComparisonTab] = useState<"after" | "before">(
    "after"
  );

  const load = useCallback(async () => {
    const result = await getArticle(articleId);
    if (result.success) {
      setArticle(result.data);
      trackClientEvent("article_viewed", { article_id: articleId });
    }
    setLoading(false);
  }, [articleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = async () => {
    if (!article) return;
    try {
      await navigator.clipboard.writeText(article.content);
      setCopied(true);
      trackClientEvent("article_copied", { article_id: article.id });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = article.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    if (!window.confirm("この記事を削除しますか？この操作は取り消せません。"))
      return;
    const result = await deleteArticle(article.id);
    if (result.success) {
      router.push("/articles");
    }
  };

  const handleToggleInterview = async () => {
    if (showInterview) {
      setShowInterview(false);
      return;
    }
    if (!article?.interview_id) return;
    if (messages.length === 0) {
      setLoadingMessages(true);
      const result = await getInterviewMessages(article.interview_id);
      if (result.success) {
        setMessages(result.data);
      }
      setLoadingMessages(false);
    }
    setShowInterview(true);
  };

  const handleToggleThemeSelector = async () => {
    if (showThemeSelector) {
      setShowThemeSelector(false);
      return;
    }
    setLoadingThemes(true);
    setShowThemeSelector(true);
    const result = await getThemesForArticleRef(articleId);
    if (result.success) {
      setAvailableThemes(result.data);
    }
    setLoadingThemes(false);
  };

  const handleToggleArticleRef = async (
    themeId: string,
    alreadyAdded: boolean
  ) => {
    setAddingToTheme(themeId);
    if (alreadyAdded) {
      const refsResult = await getThemesForArticleRef(articleId);
      if (refsResult.success) {
        setAvailableThemes(refsResult.data);
      }
    } else {
      const result = await addArticleRef(themeId, articleId);
      if (result.success) {
        setAvailableThemes((prev) =>
          prev.map((t) =>
            t.id === themeId ? { ...t, already_added: true } : t
          )
        );
      }
    }
    setAddingToTheme(null);
  };

  // テーマセレクター外クリックで閉じる
  useEffect(() => {
    if (!showThemeSelector) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        themeSelectorRef.current &&
        !themeSelectorRef.current.contains(e.target as Node)
      ) {
        setShowThemeSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showThemeSelector]);

  const handleOpenRewrite = async () => {
    setShowRewriteModal(true);
    setLoadingRewriteStyles(true);
    const result = await getStyleReferences();
    if (result.success) {
      setRewriteStyles(result.data);
      const defaultStyle = result.data.find((s) => s.is_default);
      if (defaultStyle) setSelectedRewriteStyle(defaultStyle.id);
    }
    setLoadingRewriteStyles(false);
  };

  const handleRewrite = async () => {
    if (!selectedRewriteStyle || !article) return;
    setRewriting(true);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article.id,
          styleReferenceId: selectedRewriteStyle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // 比較モードに遷移（まだ記事は上書きしない）
        setRewriteComparison({
          beforeTitle: article.title,
          beforeContent: article.content,
          afterTitle: data.title,
          afterContent: data.content,
        });
        setComparisonTab("after");
        setShowRewriteModal(false);
        setSelectedRewriteStyle("");
      } else {
        alert(data.error || "リライトに失敗しました");
      }
    } catch {
      alert("リライトに失敗しました");
    }
    setRewriting(false);
  };

  // リライト結果を確定
  const handleConfirmRewrite = () => {
    if (!rewriteComparison || !article) return;
    setArticle({
      ...article,
      title: rewriteComparison.afterTitle,
      content: rewriteComparison.afterContent,
      word_count: rewriteComparison.afterContent.length,
    });
    setRewriteComparison(null);
  };

  // リライト結果を破棄
  const handleDiscardRewrite = () => {
    setRewriteComparison(null);
  };

  // 編集保存後のコールバック
  const handleEditorSaved = useCallback(
    (updated: { title: string; content: string; word_count: number }) => {
      if (article) {
        setArticle({
          ...article,
          title: updated.title,
          content: updated.content,
          word_count: updated.word_count,
        });
      }
    },
    [article]
  );

  // 履歴復元後のコールバック
  const handleHistoryRestored = useCallback(async () => {
    const result = await getArticle(articleId);
    if (result.success) {
      setArticle(result.data);
    }
    setIsEditing(false);
  }, [articleId]);

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

  if (!article) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">記事が見つかりません</p>
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
            href="/articles"
            className="text-muted-foreground hover:bg-muted hover:text-foreground mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            記事一覧に戻る
          </Link>

          {/* 編集モード */}
          {isEditing ? (
            <BlockEditor
              article={article}
              onSaved={handleEditorSaved}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              {/* メタ情報 */}
              <div className="mb-6">
                <h1 className="mb-2 text-2xl font-bold">{article.title}</h1>
                <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                  {article.theme_title && (
                    <span className="pen-badge">{article.theme_title}</span>
                  )}
                  <span>{article.word_count.toLocaleString()}文字</span>
                  <span>
                    {new Date(article.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="pen-btn pen-btn-accent"
                >
                  <Pencil className="h-4 w-4" />
                  編集する
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="pen-btn pen-btn-secondary"
                >
                  <Clock className="h-4 w-4" />
                  履歴
                </button>
                <button
                  onClick={handleCopy}
                  className={`pen-btn ${copied ? "pen-btn-accent" : "pen-btn-secondary"}`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      コピーしました！
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      記事をコピー
                    </>
                  )}
                </button>
                {article.interview_id && (
                  <button
                    onClick={handleToggleInterview}
                    className="pen-btn pen-btn-secondary"
                  >
                    <MessageSquare className="h-4 w-4" />
                    インタビューを見返す
                    {showInterview ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                )}
                {/* 他テーマの参考に追加 */}
                <div className="relative" ref={themeSelectorRef}>
                  <button
                    onClick={handleToggleThemeSelector}
                    className="pen-btn pen-btn-secondary"
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    他テーマの参考に追加
                    {showThemeSelector ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  {showThemeSelector && (
                    <div className="border-border bg-card absolute right-0 z-50 mt-2 w-72 rounded-xl border shadow-lg">
                      <div className="border-border border-b px-4 py-3">
                        <p className="text-sm font-bold">テーマを選択</p>
                        <p className="text-muted-foreground text-xs">
                          この記事をインタビューの参考資料として追加
                        </p>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {loadingThemes ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                          </div>
                        ) : availableThemes.length === 0 ? (
                          <p className="text-muted-foreground py-4 text-center text-sm">
                            追加可能なテーマがありません
                          </p>
                        ) : (
                          availableThemes.map((theme) => (
                            <button
                              key={theme.id}
                              onClick={() =>
                                handleToggleArticleRef(
                                  theme.id,
                                  theme.already_added
                                )
                              }
                              disabled={addingToTheme === theme.id}
                              className="hover:bg-muted flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {theme.title}
                              </span>
                              {addingToTheme === theme.id ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              ) : theme.already_added ? (
                                <Check className="text-accent h-4 w-4 shrink-0" />
                              ) : null}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleOpenRewrite}
                  className="pen-btn pen-btn-secondary"
                >
                  <RefreshCw className="h-4 w-4" />
                  文体でリライト
                </button>
                <button
                  onClick={handleDelete}
                  className="text-muted-foreground hover:bg-danger/10 hover:text-danger rounded-lg px-3 py-2 text-sm transition-colors"
                >
                  <Trash2 className="mr-1 inline h-4 w-4" />
                  削除
                </button>
              </div>

              {/* インタビュー履歴 */}
              {showInterview && (
                <div className="pen-fade-in mb-6">
                  <div className="border-border rounded-xl border">
                    <div className="border-border border-b px-5 py-3">
                      <h3 className="flex items-center gap-2 text-sm font-bold">
                        <MessageSquare className="h-4 w-4" />
                        インタビュー履歴
                      </h3>
                    </div>
                    {loadingMessages ? (
                      <div className="flex justify-center py-8">
                        <div className="pen-spinner" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-muted-foreground text-sm">
                          インタビューの記録がありません
                        </p>
                      </div>
                    ) : (
                      <div className="divide-border divide-y">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 px-5 py-4 ${
                              msg.role === "assistant" ? "bg-muted/30" : ""
                            }`}
                          >
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                msg.role === "assistant"
                                  ? "bg-foreground text-background"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {msg.role === "assistant" ? (
                                <Bot className="h-3.5 w-3.5" />
                              ) : (
                                <User className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-muted-foreground mb-1 text-xs font-bold">
                                {msg.role === "assistant" ? "AI" : "あなた"}
                              </p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 記事本文 or リライト比較 */}
              {rewriteComparison ? (
                <div className="pen-fade-in">
                  {/* 比較ヘッダー */}
                  <div className="border-accent bg-accent/5 mb-4 rounded-xl border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-bold">
                        <RefreshCw className="h-4 w-4" />
                        リライト結果の確認
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4 text-xs">
                      変更箇所を確認して、この内容で確定するか選んでください
                    </p>

                    {/* タブ切替 */}
                    <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
                      <button
                        onClick={() => setComparisonTab("after")}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                          comparisonTab === "after"
                            ? "bg-accent text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        リライト後
                      </button>
                      <button
                        onClick={() => setComparisonTab("before")}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                          comparisonTab === "before"
                            ? "bg-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        リライト前
                      </button>
                    </div>

                    {/* タイトル比較 */}
                    {rewriteComparison.beforeTitle !==
                      rewriteComparison.afterTitle && (
                      <div className="border-border mb-3 rounded-lg border p-3">
                        <p className="text-muted-foreground mb-1 text-xs font-medium">
                          タイトル
                        </p>
                        {comparisonTab === "after" ? (
                          <p className="rounded bg-green-50 px-2 py-1 text-sm font-bold text-green-800">
                            {rewriteComparison.afterTitle}
                          </p>
                        ) : (
                          <p className="rounded bg-red-50 px-2 py-1 text-sm font-bold text-red-800 line-through">
                            {rewriteComparison.beforeTitle}
                          </p>
                        )}
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmRewrite}
                        className="pen-btn pen-btn-accent flex-1"
                      >
                        <Check className="h-4 w-4" />
                        この内容で確定
                      </button>
                      <button
                        onClick={handleDiscardRewrite}
                        className="pen-btn pen-btn-secondary"
                      >
                        <Undo2 className="h-4 w-4" />
                        元に戻す
                      </button>
                    </div>
                  </div>

                  {/* 本文比較 */}
                  <article className="pen-card">
                    <div className="prose prose-sm max-w-none">
                      {comparisonTab === "after" ? (
                        <RewriteDiff
                          beforeContent={rewriteComparison.beforeContent}
                          afterContent={rewriteComparison.afterContent}
                          mode="after"
                        />
                      ) : (
                        <RewriteDiff
                          beforeContent={rewriteComparison.beforeContent}
                          afterContent={rewriteComparison.afterContent}
                          mode="before"
                        />
                      )}
                    </div>
                  </article>
                </div>
              ) : (
                <>
                  <article className="pen-card">
                    <div className="prose prose-sm max-w-none">
                      <NoteMarkdown content={article.content} />
                    </div>
                  </article>

                  {/* フッターアクション */}
                  <div className="mt-8 flex justify-center">
                    <p className="text-muted-foreground text-sm">
                      ✨ 記事をコピーして、noteに投稿しましょう
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* リライトモーダル */}
          {showRewriteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-card mx-4 w-full max-w-md rounded-2xl p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-bold">文体でリライト</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  選択した文体のトーンで記事を書き直します。元の記事は上書きされます。
                </p>
                {loadingRewriteStyles ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                  </div>
                ) : rewriteStyles.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    文体が登録されていません。設定ページから登録してください。
                  </p>
                ) : (
                  <div className="mb-4 max-h-60 space-y-2 overflow-y-auto">
                    {rewriteStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedRewriteStyle(style.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                          selectedRewriteStyle === style.id
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <p className="text-sm font-medium">
                          {style.label}
                          {style.is_default && (
                            <span className="ml-2 text-xs opacity-60">★</span>
                          )}
                        </p>
                        <p className="line-clamp-1 text-xs opacity-70">
                          {style.source_text.slice(0, 50)}...
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleRewrite}
                    disabled={!selectedRewriteStyle || rewriting}
                    className="pen-btn pen-btn-accent flex-1"
                  >
                    {rewriting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        リライト中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        リライトする
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRewriteModal(false)}
                    disabled={rewriting}
                    className="pen-btn pen-btn-secondary"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 編集履歴パネル */}
          <EditHistoryPanel
            articleId={articleId}
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            onRestored={handleHistoryRestored}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ArticleDetailPage() {
  return (
    <AuthGuard>
      <ArticleDetailContent />
    </AuthGuard>
  );
}
