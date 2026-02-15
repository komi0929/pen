"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { createMemo, deleteMemo, getMemos } from "@/lib/actions/memos";
import { getTheme } from "@/lib/actions/themes";
import type { Memo, Theme } from "@/types";
import { ArrowLeft, Loader2, Send, StickyNote, X } from "lucide-react";
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
  const listTopRef = useRef<HTMLDivElement>(null);

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
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setTimeout(() => {
        listTopRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      setError(result.error);
    }
    setCreating(false);
    textareaRef.current?.focus();
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

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
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

  // メモを新しい順に表示（上に積み重なる）
  const sortedMemos = [...memos].reverse();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <div className="pen-container pen-fade-in flex flex-1 flex-col py-6">
          {/* ヘッダー */}
          <div className="mb-4">
            <Link
              href={`/themes/${themeId}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {theme?.title ?? "テーマ"}に戻る
            </Link>
            <h1 className="mb-1 text-2xl font-bold">
              <StickyNote className="text-accent mr-2 inline h-6 w-6" />
              メモ
            </h1>
            <p className="text-muted-foreground text-sm">
              思いついたことを自由に書き溜めましょう（{memos.length}件）
            </p>
          </div>

          {error && (
            <p className="text-danger mb-4 text-center text-sm">{error}</p>
          )}

          {/* メモ一覧（新しい順 = 上に積み重なる） */}
          <div className="mb-6 flex-1">
            <div ref={listTopRef} />
            {sortedMemos.length === 0 ? (
              <div className="py-16 text-center">
                <StickyNote className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <p className="text-muted-foreground">
                  まだメモがありません。下の入力欄から追加しましょう。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedMemos.map((memo) => (
                  <div
                    key={memo.id}
                    className="group border-border bg-card relative rounded-lg border px-4 py-3 pr-10"
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {memo.content}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(memo.created_at).toLocaleString("ja-JP")}
                    </p>
                    <button
                      onClick={() => handleDelete(memo.id)}
                      className="text-muted-foreground hover:bg-danger/10 hover:text-danger absolute top-2 right-2 rounded-lg p-1.5 transition-all md:opacity-0 md:group-hover:opacity-100"
                      aria-label="削除"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 画面下部固定の入力欄 */}
          <form
            onSubmit={handleCreate}
            className="border-border bg-card sticky bottom-4 flex items-end gap-2 rounded-xl border p-2 shadow-lg"
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                autoResize(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder="メモを入力... (Ctrl+Enterで追加)"
              className="max-h-[150px] min-h-[44px] flex-1 resize-none rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              rows={1}
              disabled={creating}
            />
            <button
              type="submit"
              disabled={creating || !content.trim()}
              className="pen-btn pen-btn-accent shrink-0 rounded-lg px-4"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              追加
            </button>
          </form>
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
