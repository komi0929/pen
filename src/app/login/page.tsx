"use client";

import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, PenLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage("確認メールを送信しました。メールをご確認ください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/themes");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "認証中にエラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="pen-fade-in w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-2 text-2xl font-bold"
          >
            <PenLine className="h-7 w-7" />
            pen
          </Link>
          <p className="text-sm text-[var(--muted-fg)]">
            {isSignUp ? "アカウントを作成" : "ログイン"}
          </p>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="pen-btn pen-btn-secondary mb-4 w-full py-3"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Googleでログイン
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--muted-fg)]">または</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              required
              className="pen-input"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              required
              minLength={6}
              className="pen-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="pen-btn pen-btn-primary w-full py-3"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {isSignUp ? "アカウント作成" : "メールでログイン"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-center text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 text-center text-sm text-[var(--accent)]">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-[var(--muted-fg)]">
          {isSignUp
            ? "すでにアカウントをお持ちですか？"
            : "アカウントをお持ちでないですか？"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            {isSignUp ? "ログイン" : "新規登録"}
          </button>
        </p>

        <div className="mt-8 text-center text-xs text-[var(--muted-fg)]">
          <Link href="/terms" className="hover:underline">
            利用規約
          </Link>{" "}
          と{" "}
          <Link href="/privacy" className="hover:underline">
            プライバシーポリシー
          </Link>{" "}
          に同意の上ご利用ください。
        </div>
      </div>
    </div>
  );
}
