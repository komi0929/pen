import { Header } from "@/components/Header";
import { PenLine } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="pen-fade-in text-center">
          <div className="bg-muted mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
            <PenLine className="text-muted-foreground h-10 w-10" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">404</h1>
          <p className="text-muted-foreground mb-6">
            ページが見つかりませんでした
          </p>
          <Link
            href="/"
            className="pen-btn pen-btn-primary inline-flex px-6 py-3"
          >
            トップに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
