"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export function CtaSection() {
  const { user, loading } = useAuth();

  // ログイン済み or ロード中は非表示
  if (loading || user) return null;

  return (
    <section className="mb-12 text-center">
      <div className="bg-muted rounded-xl p-8">
        <h2 className="mb-4 text-2xl font-bold">さっそく始めてみましょう</h2>
        <p className="text-muted-foreground mx-auto mb-8 max-w-md text-sm leading-relaxed">
          アカウント登録は無料。テーマを作って、AIと対話するだけで記事が完成します。
        </p>
        <Link
          href="/login"
          className="pen-btn pen-btn-primary px-8 py-3 text-base"
        >
          無料で始める
        </Link>
      </div>
    </section>
  );
}
