"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  addMessage,
  completeInterview,
  createInterview,
  getActiveInterview,
  getInterview,
} from "@/lib/actions/interviews";
import { getMemos } from "@/lib/actions/memos";
import { getTheme } from "@/lib/actions/themes";
import type { Interview, InterviewMessage, Memo, Theme } from "@/types";
import { ArrowLeft, Check, Loader2, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function InterviewContent() {
  const params = useParams();
  const router = useRouter();
  const themeId = params.themeId as string;

  const [theme, setTheme] = useState<Theme | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 重複API呼び出し防止用ref
  const isLoadingRef = useRef(false);
  const isFetchingRef = useRef(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI応答を取得（共通関数）
  const fetchAI = useCallback(
    async (
      interviewId: string,
      currentMessages: InterviewMessage[],
      themeData: Theme | null,
      memosData: Memo[]
    ) => {
      // 重複呼び出し防止
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            themeTitle: themeData?.title ?? "",
            themeDescription: themeData?.description ?? "",
            memos: memosData.map((m) => ({ content: m.content })),
            messages: currentMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!data.response) throw new Error("AI応答が空です");

        // AI応答をDB保存
        const saveResult = await addMessage(
          interviewId,
          "assistant",
          data.response
        );
        if (saveResult.success) {
          setMessages((prev) => [...prev, saveResult.data]);
        }
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

  // 初期ロード
  const load = useCallback(async () => {
    // 重複ロード防止
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      const [themeResult, memosResult, interviewResult] = await Promise.all([
        getTheme(themeId),
        getMemos(themeId),
        getActiveInterview(themeId),
      ]);

      const loadedTheme = themeResult.success ? themeResult.data : null;
      const loadedMemos = memosResult.success ? memosResult.data : [];

      if (loadedTheme) setTheme(loadedTheme);
      if (memosResult.success) setMemos(loadedMemos);

      if (interviewResult.success && interviewResult.data) {
        setInterview(interviewResult.data);
        // 既存メッセージをロード
        const msgResult = await getInterview(interviewResult.data.id);
        if (msgResult.success) {
          setMessages(msgResult.data.messages);
          // メッセージが0件なら最初のAI質問を自動取得
          if (msgResult.data.messages.length === 0) {
            setLoading(false);
            setSending(true);
            await fetchAI(
              interviewResult.data.id,
              [],
              loadedTheme,
              loadedMemos
            );
            setSending(false);
            return;
          }
        }
      }

      setLoading(false);
    } finally {
      isLoadingRef.current = false;
    }
  }, [themeId, fetchAI]);

  useEffect(() => {
    load();
  }, [load]);

  // インタビュー開始
  const handleStart = async () => {
    if (sending) return; // 二重クリック防止
    setSending(true);
    setError(null);
    const result = await createInterview(themeId, 1000);
    if (result.success) {
      setInterview(result.data);
      // 最初のAI質問を取得
      await fetchAI(result.data.id, [], theme, memos);
    } else {
      setError(result.error);
    }
    setSending(false);
  };

  // ユーザーメッセージ送信
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !interview || sending) return;

    setSending(true);
    setError(null);

    // ユーザーメッセージ保存
    const userResult = await addMessage(interview.id, "user", input.trim());
    if (userResult.success) {
      const updatedMessages = [...messages, userResult.data];
      setMessages(updatedMessages);
      setInput("");
      // AI応答取得
      await fetchAI(interview.id, updatedMessages, theme, memos);
    } else {
      setError(userResult.error);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  // インタビュー完了
  const handleComplete = async () => {
    if (!interview || completing) return;
    setCompleting(true);
    const result = await completeInterview(interview.id);
    if (result.success) {
      router.push(`/themes/${themeId}`);
    } else {
      setError(result.error);
    }
    setCompleting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="pen-spinner" />
        </main>
      </div>
    );
  }

  // インタビュー未開始
  if (!interview) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="pen-container pen-fade-in py-8">
            <Link
              href={`/themes/${themeId}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {theme?.title ?? "テーマ"}に戻る
            </Link>

            <div className="py-16 text-center">
              <div className="bg-muted mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
                <MessageSquare className="text-accent h-8 w-8" />
              </div>
              <h1 className="mb-2 text-2xl font-bold">AIインタビュー</h1>
              <p className="text-muted-foreground mx-auto mb-8 max-w-md">
                AIがあなたに質問を投げかけます。対話を通じて考えを整理し、
                記事の素材を作りましょう。
              </p>
              {memos.length > 0 && (
                <p className="text-muted-foreground mb-6 text-sm">
                  📝 {memos.length}件のメモを参考にAIが質問を生成します
                </p>
              )}
              {error && <p className="text-danger mb-4 text-sm">{error}</p>}
              <button
                onClick={handleStart}
                disabled={sending}
                className="pen-btn pen-btn-accent px-8 py-3 text-base"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MessageSquare className="h-5 w-5" />
                )}
                インタビューを始める
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // チャットUI
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in py-8">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href={`/themes/${themeId}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Link>
            <button
              onClick={handleComplete}
              disabled={completing || messages.length < 2}
              className="pen-btn pen-btn-accent"
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              インタビューを完了
            </button>
          </div>

          {error && (
            <p className="text-danger mb-4 text-center text-sm">{error}</p>
          )}

          {/* チャットメッセージ */}
          <div className="mb-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
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
            {sending && (
              <div className="flex justify-start">
                <div className="pen-bubble-ai flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">考え中...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 入力フォーム */}
          <form
            onSubmit={handleSend}
            className="border-border bg-card sticky bottom-4 flex gap-2 rounded-xl border p-2 shadow-lg"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力... (Enterで送信)"
              className="min-h-[44px] flex-1 resize-none rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              rows={1}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="pen-btn pen-btn-secondary shrink-0 rounded-lg px-4"
            >
              <Send className="h-4 w-4" />
              送信
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <AuthGuard>
      <InterviewContent />
    </AuthGuard>
  );
}
