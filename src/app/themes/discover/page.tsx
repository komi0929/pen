"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { SuggestedTheme } from "@/app/api/theme-discovery/route";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Loader2,
  Pen,
  Search,
  Send,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function getProgressInfo(progress: number) {
  if (progress < 0)
    return {
      label: "",
      color: "bg-gray-300",
      message: "",
    };
  if (progress < 20)
    return {
      label: "ヒアリング中",
      color: "bg-gray-400",
      message: "あなたのことを教えてください",
    };
  if (progress < 45)
    return {
      label: "テーマの種を探索中",
      color: "bg-gray-500",
      message: "面白い話題が見つかりそうです",
    };
  if (progress < 65)
    return {
      label: "有望なテーマを発見中",
      color: "bg-gray-600",
      message: "テーマが絞り込まれてきました",
    };
  if (progress < 80)
    return {
      label: "テーマ提案準備中",
      color: "bg-gray-700",
      message: "もう少しで提案できます",
    };
  return {
    label: "テーマ発見！",
    color: "bg-gray-800",
    message: "あなたに最適なテーマが見つかりました",
  };
}

export default function ThemeDiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryProgress, setDiscoveryProgress] = useState(-1);
  const [suggestedThemes, setSuggestedThemes] = useState<
    SuggestedTheme[] | null
  >(null);
  const [started, setStarted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFetchingRef = useRef(false);

  const progressInfo = getProgressInfo(discoveryProgress);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // テキストエリア自動拡張
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // AI応答取得
  const fetchAI = useCallback(
    async (currentMessages: ChatMessage[]) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const res = await fetch("/api/theme-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: currentMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!data.response) throw new Error("AI応答が空です");

        if (
          typeof data.discoveryProgress === "number" &&
          data.discoveryProgress >= 0
        ) {
          setDiscoveryProgress(data.discoveryProgress);
        }

        if (data.suggestedThemes) {
          setSuggestedThemes(data.suggestedThemes);
        }

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.response,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "AI応答の取得に失敗しました"
        );
      } finally {
        isFetchingRef.current = false;
      }
    },
    []
  );

  // チャット開始
  const handleStart = async () => {
    setStarted(true);
    setSending(true);
    await fetchAI([]);
    setSending(false);
    inputRef.current?.focus();
  };

  // メッセージ送信
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    await fetchAI(updatedMessages);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  // テーマを選んで次へ進む
  const handleSelectTheme = (theme: SuggestedTheme) => {
    if (user) {
      // ログイン済み → テーマ作成画面へ（将来的にServer Actionで自動作成）
      router.push(
        `/themes?newTitle=${encodeURIComponent(theme.title)}&newDesc=${encodeURIComponent(theme.description + "\n\n切り口: " + theme.angle + "\n想定読者: " + theme.readers)}`
      );
    } else {
      // 未ログイン → 登録画面へ誘導
      router.push(
        `/login?from=discover&theme=${encodeURIComponent(theme.title)}&desc=${encodeURIComponent(theme.description)}`
      );
    }
  };

  // --- ウェルカム画面 ---
  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col">
        {/* ヘッダー */}
        <header className="border-border bg-card/80 sticky top-0 z-50 border-b backdrop-blur-md">
          <div className="pen-container flex h-14 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold"
            >
              <Pen className="h-5 w-5" />
              <span>pen</span>
            </Link>
            {!authLoading && !user && (
              <Link href="/login" className="pen-btn pen-btn-primary text-sm">
                ログイン
              </Link>
            )}
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4">
          <div className="pen-fade-in w-full max-w-md text-center">
            <div className="bg-muted mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
              <Search className="h-10 w-10" />
            </div>
            <h1 className="mb-3 text-2xl font-bold tracking-tight">
              あなたの「書くべきテーマ」を
              <br />
              AI編集者が見つけます
            </h1>
            <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
              noteで長く読まれる記事には共通点があります。
              <br />
              AI編集者との対話を通じて、あなたの経験の中に
              <br />
              眠っている最高のテーマを一緒に発掘しましょう。
            </p>
            <div className="bg-muted mb-6 rounded-xl p-4 text-left">
              <p className="mb-2 text-xs font-bold">
                長く読まれる記事の3つの条件
              </p>
              <ul className="text-muted-foreground space-y-1.5 text-xs">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                  書き手自身の経験に根ざした一次情報
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                  繰り返し検索される普遍的な問いへの回答
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                  ひとつのテーマを徹底的に深掘り
                </li>
              </ul>
            </div>
            <button
              onClick={handleStart}
              disabled={sending}
              className="pen-btn pen-btn-accent w-full py-3.5 text-base"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              テーマ探索を始める
            </button>
            <p className="text-muted-foreground mt-3 text-xs">
              ログイン不要・無料で何度でも使えます
            </p>
          </div>
        </main>
      </div>
    );
  }

  // --- チャット画面 ---
  return (
    <div className="discover-chat-container">
      {/* ヘッダー */}
      <header className="discover-chat-header">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors"
            aria-label="戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight">テーマ探索</h1>
            {discoveryProgress >= 0 && (
              <p className="text-muted-foreground text-[11px] leading-tight">
                {progressInfo.label}
              </p>
            )}
          </div>
        </div>
        {/* プログレスバー */}
        {discoveryProgress >= 0 && (
          <div className="discover-progress-wrapper">
            <div className="discover-progress-track">
              <div
                className={`discover-progress-fill ${progressInfo.color}`}
                style={{
                  width: `${Math.min(discoveryProgress, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </header>

      {/* チャットエリア */}
      <div className="discover-chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`discover-msg-wrapper ${msg.role === "user" ? "discover-msg-user" : "discover-msg-ai"}`}
          >
            {msg.role === "assistant" && (
              <div className="discover-avatar">
                <BookOpen className="h-4 w-4" />
              </div>
            )}
            <div
              className={
                msg.role === "user" ? "pen-bubble-user" : "pen-bubble-ai"
              }
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* テーマ提案カード */}
        {suggestedThemes && suggestedThemes.length > 0 && (
          <div className="discover-themes-area">
            <p className="mb-3 text-center text-xs font-bold">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              あなたにおすすめのテーマ
            </p>
            <div className="space-y-3">
              {suggestedThemes.map((theme, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectTheme(theme)}
                  className="discover-theme-card"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold leading-snug">
                      {theme.title}
                    </h3>
                    <ArrowRight className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  </div>
                  <p className="text-muted-foreground mb-1.5 text-xs leading-relaxed">
                    {theme.description}
                  </p>
                  <div className="text-muted-foreground flex flex-wrap gap-3 text-[11px]">
                    <span>切り口: {theme.angle}</span>
                    <span>読者: {theme.readers}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 text-center">
              {user ? (
                <p className="text-muted-foreground text-xs">
                  テーマをタップして、記事作成を始めましょう
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">
                    テーマを保存して記事を書くには、アカウント登録が必要です
                  </p>
                  <Link
                    href={`/login?from=discover&theme=${encodeURIComponent(suggestedThemes[0]?.title ?? "")}`}
                    className="pen-btn pen-btn-accent inline-flex items-center gap-2 text-sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    無料で登録して始める
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI思考中インジケーター */}
        {sending && (
          <div className="discover-msg-wrapper discover-msg-ai">
            <div className="discover-avatar">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="pen-bubble-ai">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground text-sm">
                  考えています...
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 text-center">
            <p className="text-danger text-xs">{error}</p>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="discover-input-area">
        <form onSubmit={handleSend} className="discover-input-form">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="discover-input-textarea"
            rows={1}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="discover-send-btn"
            aria-label="送信"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
