"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import type { InterviewMessage } from "@/lib/actions/articles";
import {
  deleteArticle,
  getArticle,
  getInterviewMessages,
} from "@/lib/actions/articles";
import type { Article } from "@/types";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  MessageSquare,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

  const load = useCallback(async () => {
    const result = await getArticle(articleId);
    if (result.success) {
      setArticle(result.data);
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
              onClick={handleCopy}
              className={`pen-btn ${copied ? "pen-btn-accent" : "pen-btn-accent"}`}
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
            {/* 追加インタビュー（一時的に非表示・再開時にコメント解除）
            {article.theme_id && (
              <Link
                href={`/themes/${article.theme_id}/interview?articleId=${article.id}`}
                className="pen-btn pen-btn-secondary"
              >
                <MessageSquare className="h-4 w-4" />
                追加インタビュー
              </Link>
            )}
            */}
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

          {/* 記事本文 */}
          <article className="pen-card">
            <div className="prose prose-sm max-w-none">
              {article.content.split("\n").map((paragraph, i) => (
                <p
                  key={i}
                  className={`leading-relaxed ${!paragraph.trim() ? "h-4" : ""}`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </article>

          {/* フッターアクション */}
          <div className="mt-8 flex justify-center">
            <p className="text-muted-foreground text-sm">
              ✨ 記事をコピーして、noteに投稿しましょう
            </p>
          </div>
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
