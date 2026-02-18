"use client";

import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, PenLine } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const COOLDOWN_SECONDS = 60;
const RATE_LIMIT_COOLDOWN_SECONDS = 60;
const STORAGE_KEY_EMAIL = "pen_login_email";
const STORAGE_KEY_SENT_AT = "pen_login_sent_at";
const STORAGE_KEY_COOLDOWN = "pen_login_cooldown";

// Supabase のレート制限エラーかどうかを判定
function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    // Supabase AuthApiError の code プロパティ
    if (e.code === "over_email_send_rate_limit") return true;
    // status 429 もレート制限
    if (e.status === 429) return true;
  }
  // フォールバック: メッセージに "rate limit" を含む場合
  if (
    err instanceof Error &&
    err.message.toLowerCase().includes("rate limit")
  ) {
    return true;
  }
  return false;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const supabase = createClient();

  // 認証コールバックからのエラーを表示
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_failed") {
      setError("認証に失敗しました。もう一度お試しください。");
    }
  }, []);

  // 前回入力したメールアドレスとクールダウンを復元
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_EMAIL);
    if (saved) setEmail(saved);

    // レートリミットのクールダウンを復元
    const sentAt = localStorage.getItem(STORAGE_KEY_SENT_AT);
    const savedCooldown = Number(
      localStorage.getItem(STORAGE_KEY_COOLDOWN) || COOLDOWN_SECONDS
    );
    if (sentAt) {
      const elapsed = Math.floor((Date.now() - Number(sentAt)) / 1000);
      if (elapsed < savedCooldown) {
        setCooldown(savedCooldown - elapsed);
        // 送信済み状態も復元
        setSent(true);
      }
    }
  }, []);

  // クールダウンタイマー
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // クールダウン状態を保存するヘルパー
  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    localStorage.setItem(STORAGE_KEY_SENT_AT, String(Date.now()));
    localStorage.setItem(STORAGE_KEY_COOLDOWN, String(seconds));
  }, []);

  const handleMagicLink = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || cooldown > 0) return;
      setLoading(true);
      setError(null);

      try {
        // メールアドレスを記憶
        localStorage.setItem(STORAGE_KEY_EMAIL, email.trim());

        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        // 送信成功: クールダウン開始
        startCooldown(COOLDOWN_SECONDS);
        setSent(true);
      } catch (err) {
        if (isRateLimitError(err)) {
          // レート制限エラー: 長めのクールダウンを設定
          setError(
            "メールの送信回数制限に達しました。しばらく待ってから再度お試しください。"
          );
          startCooldown(RATE_LIMIT_COOLDOWN_SECONDS);
        } else {
          // その他のエラー: 元メッセージをそのまま表示
          const message =
            err instanceof Error
              ? err.message
              : "メールの送信に失敗しました。時間をおいて再度お試しください。";
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [email, cooldown, supabase.auth, startCooldown]
  );

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

  // マジックリンク送信完了画面
  if (sent) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-4">
        <div className="pen-fade-in w-full max-w-sm text-center">
          <div className="bg-accent/10 mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
            <Mail className="text-accent h-8 w-8" />
          </div>
          <h1 className="mb-3 text-xl font-bold">メールを確認してください</h1>
          <p className="text-muted-foreground mb-2 text-sm leading-relaxed">
            <span className="font-bold">{email}</span> に
            ログインリンクを送信しました。
          </p>
          <p className="text-muted-foreground mb-6 text-sm">
            メール内のリンクをクリックするとログインできます。
          </p>

          {error && <p className="text-danger mb-4 text-sm">{error}</p>}

          {/* 再送信ボタン */}
          <div className="mb-4">
            {cooldown > 0 ? (
              <p className="text-muted-foreground text-sm">
                再送信まで <span className="font-bold">{cooldown}秒</span>
              </p>
            ) : (
              <button
                onClick={() => {
                  setSent(false);
                  setError(null);
                }}
                className="pen-btn pen-btn-secondary text-sm"
              >
                ログインリンクを再送信
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setSent(false);
              setEmail("");
              setError(null);
            }}
            className="text-accent text-sm font-bold hover:underline"
          >
            別のメールアドレスで試す
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="pen-fade-in w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-2 text-2xl font-bold"
          >
            <PenLine className="h-7 w-7" />
            pen
          </Link>
          <p className="text-muted-foreground text-sm">ログイン / 新規登録</p>
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
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs">または</span>
          <div className="bg-border h-px flex-1" />
        </div>

        {/* Magic Link Form */}
        <form onSubmit={handleMagicLink} className="space-y-3">
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
          <p className="text-muted-foreground text-xs">
            パスワード不要。メールに届くリンクからログインできます。
          </p>
          <button
            type="submit"
            disabled={loading || !email.trim() || cooldown > 0}
            className="pen-btn pen-btn-primary w-full py-3"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {cooldown > 0 ? `再送信まで ${cooldown}秒` : "ログインリンクを送信"}
          </button>
        </form>

        {error && (
          <p className="text-danger mt-3 text-center text-sm">{error}</p>
        )}

        <div className="text-muted-foreground mt-8 text-center text-xs">
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
