import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] py-8">
      <div className="pen-container text-center text-sm text-[var(--muted-fg)]">
        <div className="mb-3 flex justify-center gap-6">
          <Link
            href="/about"
            className="transition-colors hover:text-[var(--foreground)]"
          >
            penとは
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-[var(--foreground)]"
          >
            利用規約
          </Link>
          <Link
            href="/privacy"
            className="transition-colors hover:text-[var(--foreground)]"
          >
            プライバシーポリシー
          </Link>
        </div>
        <p>© {new Date().getFullYear()} pen</p>
      </div>
    </footer>
  );
}
