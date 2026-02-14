"use client";

import { useAuth } from "@/contexts/AuthContext";
import { FileText, Lightbulb, LogOut, PenLine } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md">
      <div className="pen-container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <PenLine className="h-5 w-5" />
          <span>pen</span>
        </Link>

        <nav className="flex items-center gap-4">
          {!loading && user ? (
            <>
              <Link
                href="/themes"
                className="flex items-center gap-1.5 text-sm text-[var(--muted-fg)] transition-colors hover:text-[var(--foreground)]"
              >
                <Lightbulb className="h-4 w-4" />
                テーマ
              </Link>
              <Link
                href="/articles"
                className="flex items-center gap-1.5 text-sm text-[var(--muted-fg)] transition-colors hover:text-[var(--foreground)]"
              >
                <FileText className="h-4 w-4" />
                記事
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm text-[var(--muted-fg)] transition-colors hover:text-[var(--danger)]"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </>
          ) : !loading ? (
            <Link href="/login" className="pen-btn pen-btn-primary text-sm">
              ログイン
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
