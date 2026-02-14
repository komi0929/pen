"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { deleteArticle, getArticle } from "@/lib/actions/articles";
import type { Article } from "@/types";
import { ArrowLeft, Check, Copy, FileText, Trash2 } from "lucide-react";
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
      // Fallback
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
    const result = await deleteArticle(article.id);
    if (result.success) {
      router.push("/articles");
    }
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
          <p className="text-[var(--muted-fg)]">記事が見つかりません</p>
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
            href="/articles"
            className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted-fg)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            記事一覧に戻る
          </Link>

          {/* メタ情報 */}
          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-bold">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-fg)]">
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
          <div className="mb-6 flex gap-2">
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
            <button
              onClick={handleDelete}
              className="pen-btn pen-btn-secondary text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              <Trash2 className="h-4 w-4" />
              削除
            </button>
          </div>

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
            <button
              onClick={handleCopy}
              className="pen-btn pen-btn-accent px-8 py-3 text-base"
            >
              <FileText className="h-5 w-5" />
              noteに投稿するためにコピー
            </button>
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
