import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto py-8">
      <div className="pen-container text-muted-foreground text-center text-sm">
        <div className="flex justify-center gap-2">
          <Link
            href="/"
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
      </div>
    </footer>
  );
}
