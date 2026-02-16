"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { createTheme, deleteTheme, getThemes } from "@/lib/actions/themes";
import type { Theme } from "@/types";
import { Lightbulb, Loader2, Plus, StickyNote, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function ThemesContent() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getThemes();
    if (result.success) {
      setThemes(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    const result = await createTheme(title.trim(), description.trim());
    if (result.success) {
      setThemes((prev) => [result.data, ...prev]);
      setTitle("");
      setDescription("");
      setShowForm(false);
    } else {
      setError(result.error);
    }
    setCreating(false);
  };

  const handleDelete = async (themeId: string, themeTitle: string) => {
    if (
      !window.confirm(
        `「${themeTitle}」を削除しますか？\nテーマに紐づくメモ・インタビュー・記事もすべて削除されます。`
      )
    )
      return;
    const result = await deleteTheme(themeId);
    if (result.success) {
      setThemes((prev) => prev.filter((t) => t.id !== themeId));
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-20 pb-8">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold">テーマ</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="pen-btn pen-btn-accent"
            >
              {showForm ? (
                <>
                  <X className="h-4 w-4" />
                  閉じる
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  新規テーマ
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-danger mb-4 text-center text-sm">{error}</p>
          )}

          {showForm && (
            <form onSubmit={handleCreate} className="pen-card mb-6 space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="テーマ名（例：AIとの共生について）"
                className="pen-input"
                autoFocus
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="説明（任意）"
                className="pen-textarea"
                rows={2}
              />
              <button
                type="submit"
                disabled={creating || !title.trim()}
                className="pen-btn pen-btn-primary"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                作成
              </button>
            </form>
          )}

          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="pen-spinner" />
            </div>
          ) : themes.length === 0 ? (
            <div className="py-20 text-center">
              <Lightbulb className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground mb-2 text-lg font-bold">
                テーマがまだありません
              </p>
              <p className="text-muted-foreground text-sm">
                「新規テーマ」ボタンから書きたいテーマを追加しましょう
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {themes.map((theme) => (
                <div key={theme.id} className="pen-card group relative">
                  <Link href={`/themes/${theme.id}`} className="block">
                    <h3 className="mb-1 font-bold">{theme.title}</h3>
                    {theme.description && (
                      <p className="text-muted-foreground mb-2 line-clamp-2 text-sm">
                        {theme.description}
                      </p>
                    )}
                    <div className="text-muted-foreground flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <StickyNote className="h-3 w-3" />
                        メモ {theme.memo_count ?? 0}件
                      </span>
                      <span>
                        {new Date(theme.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(theme.id, theme.title)}
                    className="text-muted-foreground hover:bg-danger/10 hover:text-danger absolute top-3 right-3 rounded-lg p-2 transition-all md:opacity-0 md:group-hover:opacity-100"
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

export default function ThemesPage() {
  return (
    <AuthGuard>
      <ThemesContent />
    </AuthGuard>
  );
}
