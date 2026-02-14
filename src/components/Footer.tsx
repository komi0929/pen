import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-border mt-auto border-t py-8">
      <div className="pen-container text-muted-foreground text-center text-sm">
        {/* #1: target size improved with py-2 px-1 */}
        <div className="mb-4 flex justify-center gap-2">
          <Link
            href="/about"
            className="hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 transition-colors"
          >
            penとは
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
        <p>© {new Date().getFullYear()} pen</p>
      </div>
    </footer>
  );
}
