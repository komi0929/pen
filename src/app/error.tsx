"use client";

import { Header } from "@/components/Header";
import { AlertTriangle } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="pen-fade-in text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">エラーが発生しました</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            申し訳ありません。予期しないエラーが発生しました。
          </p>
          <button
            onClick={reset}
            className="pen-btn pen-btn-primary inline-flex px-6 py-3"
          >
            もう一度試す
          </button>
        </div>
      </main>
    </div>
  );
}
