"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { createMemo, deleteMemo, getMemos } from "@/lib/actions/memos";
import { getTheme } from "@/lib/actions/themes";
import type { Memo, Theme } from "@/types";
import { ArrowLeft, Loader2, Send, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function MemosContent() {
  const params = useParams();
  const themeId = params.themeId as string;

  const [theme, setTheme] = useState<Theme | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const [themeResult, memosResult] = await Promise.all([
      getTheme(themeId),
      getMemos(themeId),
    ]);
    if (themeResult.success) setTheme(themeResult.data);
    if (memosResult.success) setMemos(memosResult.data);
    setLoading(false);
  }, [themeId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
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

  const handleDelete = async (memoId: string) => {
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
      handleCreate(e as unknown as React.FormEvent);
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in py-8">
          <Link
            href={`/themes/${themeId}`}
            className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted-fg)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {theme?.title ?? "テーマ"}に戻る
          </Link>

          <div className="mb-8">
            <h1 className="mb-1 text-2xl font-bold">
              <StickyNote className="mr-2 inline h-6 w-6 text-[var(--accent)]" />
              メモ
            </h1>
            <p className="text-sm text-[var(--muted-fg)]">
              思いついたことを自由に書き溜めましょう
            </p>
          </div>

          {error && (
            <p className="mb-4 text-center text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          {/* メモ入力フォーム */}
          <form onSubmit={handleCreate} className="pen-card mb-6">
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
              <span className="text-xs text-[var(--muted-fg)]">
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

          {/* メモ一覧 */}
          {memos.length === 0 ? (
            <div className="py-16 text-center">
              <StickyNote className="mx-auto mb-4 h-12 w-12 text-[var(--muted-fg)]" />
              <p className="text-[var(--muted-fg)]">
                まだメモがありません。上の入力欄から追加しましょう。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {memos.map((memo) => (
                <div
                  key={memo.id}
                  className="group flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {memo.content}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-fg)]">
                      {new Date(memo.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(memo.id)}
                    className="shrink-0 rounded-full p-1.5 text-[var(--muted-fg)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
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

export default function MemosPage() {
  return (
    <AuthGuard>
      <MemosContent />
    </AuthGuard>
  );
}
