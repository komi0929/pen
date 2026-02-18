import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto py-8">
      <div className="pen-container text-muted-foreground text-center text-sm">
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2">
          <Link
            href="/"
            className="hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 transition-colors"
          >
            penとは
          </Link>
          <Link
            href="/improvements"
            className="hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 transition-colors"
          >
            改善計画
          </Link>
          <Link
            href="/ai-system"
            className="hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 transition-colors"
          >
            penの仕組み
          </Link>
          <Link
            href="/terms"
            className="hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 transition-colors"
          >
            利用規約
          </Link>
          <Link
            href="/privacy"
            className="hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 transition-colors"
          >
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </footer>
  );
}
