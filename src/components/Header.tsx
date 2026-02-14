"use client";

import { useAuth } from "@/contexts/AuthContext";
import { FileText, Lightbulb, LogOut, PenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();

  /* #9: Active state with underline + bold, not color-only */
  const navLink = (href: string, isActive: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive
        ? "font-bold text-foreground bg-muted"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <header className="border-border bg-card/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="pen-container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <PenLine className="h-5 w-5" />
          <span>pen</span>
        </Link>

        <nav className="flex items-center gap-1">
          {!loading && user ? (
            <>
              {/* #1: target size 48px via py-2 px-3 */}
              <Link
                href="/themes"
                className={navLink("/themes", pathname.startsWith("/themes"))}
              >
                <Lightbulb className="h-4 w-4" />
                テーマ
              </Link>
              <Link
                href="/articles"
                className={navLink(
                  "/articles",
                  pathname.startsWith("/articles")
                )}
              >
                <FileText className="h-4 w-4" />
                記事
              </Link>
              <button
                onClick={signOut}
                className="text-muted-foreground hover:bg-danger/10 hover:text-danger flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
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
