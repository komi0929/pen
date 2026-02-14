"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { deleteArticle, getArticles } from "@/lib/actions/articles";
import type { Article } from "@/types";
import { FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function ArticlesContent() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getArticles();
    if (result.success) {
      setArticles(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (articleId: string) => {
    const result = await deleteArticle(articleId);
    if (result.success) {
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in py-8">
          <h1 className="mb-8 text-2xl font-bold">
            <FileText className="mr-2 inline h-6 w-6 text-[var(--accent)]" />
            記事
          </h1>

          {error && (
            <p className="mb-4 text-center text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="pen-spinner" />
            </div>
          ) : articles.length === 0 ? (
            <div className="py-20 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-[var(--muted-fg)]" />
              <p className="mb-2 text-lg font-medium text-[var(--muted-fg)]">
                記事がまだありません
              </p>
              <p className="text-sm text-[var(--muted-fg)]">
                テーマを作成し、インタビューを完了すると記事が生成されます
              </p>
              <Link
                href="/themes"
                className="pen-btn pen-btn-accent mt-6 inline-flex"
              >
                テーマ一覧へ
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <div key={article.id} className="pen-card group relative">
                  <Link href={`/articles/${article.id}`} className="block">
                    <h3 className="mb-1 font-bold">{article.title}</h3>
                    <p className="mb-2 line-clamp-2 text-sm text-[var(--muted-fg)]">
                      {article.content.slice(0, 150)}...
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted-fg)]">
                      {article.theme_title && (
                        <span className="pen-badge">{article.theme_title}</span>
                      )}
                      <span>{article.word_count.toLocaleString()}文字</span>
                      <span>
                        {new Date(article.created_at).toLocaleDateString(
                          "ja-JP"
                        )}
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="absolute top-3 right-3 rounded-full p-1.5 text-[var(--muted-fg)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
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

export default function ArticlesPage() {
  return (
    <AuthGuard>
      <ArticlesContent />
    </AuthGuard>
  );
}
