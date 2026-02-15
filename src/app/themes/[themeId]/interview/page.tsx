"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { createArticle, updateArticle } from "@/lib/actions/articles";
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
import {
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  SkipForward,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── 準備度の表示スケール ── */
// AI側: max 80 → 表示: 100%（つまり AI の 80 = ユーザー表示の 100%）
// AI の 100 = ユーザー表示の 125%（ボーナス）
function rescaleReadiness(aiReadiness: number): number {
  if (aiReadiness < 0) return -1;
  return Math.round((aiReadiness / 80) * 100);
}

function getReadinessInfo(display: number) {
  if (display < 0) return { label: "", color: "", bgColor: "", message: "" };
  if (display < 25)
    return {
      label: "導入",
      color: "bg-gray-300",
      bgColor: "bg-gray-100",
      message: "まだ始まったばかりです",
    };
  if (display < 50)
    return {
      label: "基本情報",
      color: "bg-gray-400",
      bgColor: "bg-gray-100",
      message: "基本的な情報が集まってきました",
    };
  if (display < 75)
    return {
      label: "深堀り中",
      color: "bg-gray-500",
      bgColor: "bg-gray-200",
      message: "素材が集まってきています",
    };
  if (display < 100)
    return {
      label: "あと少し",
      color: "bg-gray-600",
      bgColor: "bg-gray-200",
      message: "あと少しで記事が書けます",
    };
  return {
    label: "準備完了",
    color: "bg-gray-800",
    bgColor: "bg-gray-200",
    message: "記事を書く準備ができました！",
  };
}

function InterviewContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const themeId = params.themeId as string;
  const articleId = searchParams.get("articleId");

  const [theme, setTheme] = useState<Theme | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiReadiness, setAiReadiness] = useState(-1);
  const [targetLength, setTargetLength] = useState(1000);

  // 完了確認ダイアログ
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [generating, setGenerating] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isLoadingRef = useRef(false);
  const isFetchingRef = useRef(false);

  const displayReadiness = rescaleReadiness(aiReadiness);
  const info = getReadinessInfo(displayReadiness);
  const isReady = displayReadiness >= 100;

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // テキストエリア自動拡張
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  // AI応答を取得
  const fetchAI = useCallback(
    async (
      interviewId: string,
      currentMessages: InterviewMessage[],
      themeData: Theme | null,
      memosData: Memo[],
      isSkip = false
    ) => {
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
            isSkip,
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!data.response) throw new Error("AI応答が空です");

        if (typeof data.readiness === "number" && data.readiness >= 0) {
          setAiReadiness(data.readiness);
        }

        // スキップの場合、ダミーのuserメッセージをDBに保存
        if (isSkip) {
          await addMessage(
            interviewId,
            "user",
            "（この質問をスキップしました）"
          );
        }

        const saveResult = await addMessage(
          interviewId,
          "assistant",
          data.response
        );
        if (saveResult.success) {
          if (isSkip) {
            // スキップメッセージ + AI応答をまとめて追加
            const skipMsg: InterviewMessage = {
              id: `skip-${Date.now()}`,
              interview_id: interviewId,
              user_id: "",
              role: "user",
              content: "（この質問をスキップしました）",
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, skipMsg, saveResult.data]);
          } else {
            setMessages((prev) => [...prev, saveResult.data]);
          }
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
        const msgResult = await getInterview(interviewResult.data.id);
        if (msgResult.success) {
          setMessages(msgResult.data.messages);
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
    if (sending) return;
    setSending(true);
    setError(null);
    const result = await createInterview(themeId, targetLength);
    if (result.success) {
      setInterview(result.data);
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

    const userResult = await addMessage(interview.id, "user", input.trim());
    if (userResult.success) {
      const updatedMessages = [...messages, userResult.data];
      setMessages(updatedMessages);
      setInput("");
      // テキストエリアリセット
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      await fetchAI(interview.id, updatedMessages, theme, memos);
    } else {
      setError(userResult.error);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  // 質問スキップ
  const handleSkip = async () => {
    if (!interview || sending) return;
    setSending(true);
    setError(null);
    await fetchAI(interview.id, messages, theme, memos, true);
    setSending(false);
  };

  // 完了ボタンクリック → 確認ダイアログ表示
  const handleCompleteClick = () => {
    setShowCompleteDialog(true);
  };

  // 記事生成して完了
  const handleGenerateAndComplete = async () => {
    if (!interview || generating) return;
    setGenerating(true);
    setError(null);

    try {
      // 1. 記事生成API呼び出し
      const res = await fetch("/api/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeTitle: theme?.title ?? "",
          themeDescription: theme?.description ?? "",
          targetLength: interview.target_length,
          memos: memos.map((m) => ({ content: m.content })),
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // 2. 記事をDB保存（追加インタビューの場合は既存記事を上書き）
      let savedArticleId: string;
      if (articleId) {
        const updateResult = await updateArticle(
          articleId,
          data.title,
          data.content
        );
        if (!updateResult.success) throw new Error(updateResult.error);
        savedArticleId = articleId;
      } else {
        const articleResult = await createArticle(
          themeId,
          interview.id,
          data.title,
          data.content
        );
        if (!articleResult.success) throw new Error(articleResult.error);
        savedArticleId = articleResult.data.id;
      }

      // 3. インタビューを完了ステータスに更新
      await completeInterview(interview.id);

      // 4. 生成された記事ページへ遷移
      router.push(`/articles/${savedArticleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "記事の生成に失敗しました");
      setShowCompleteDialog(false);
    } finally {
      setGenerating(false);
    }
  };

  // 記事生成せずに完了
  const handleCompleteOnly = async () => {
    if (!interview || generating) return;
    setGenerating(true);
    await completeInterview(interview.id);
    router.push(`/themes/${themeId}`);
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

              {/* 文字数設定 */}
              <div className="mx-auto mb-8 max-w-xs">
                <label className="text-muted-foreground mb-2 block text-sm">
                  目標文字数
                </label>
                <div className="flex flex-wrap justify-center gap-2">
                  {[300, 500, 1000, 1500, 2000, 3000].map((len) => (
                    <button
                      key={len}
                      onClick={() => setTargetLength(len)}
                      className={`rounded-lg border px-4 py-2 text-sm font-bold transition-all ${
                        targetLength === len
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {len.toLocaleString()}字
                    </button>
                  ))}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  生成される記事のおおよその文字数です
                </p>
              </div>

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

      {/* 固定プログレスバー */}
      {displayReadiness >= 0 && (
        <div className="border-border bg-card/95 sticky top-14 z-40 border-b px-4 py-2 backdrop-blur-sm">
          <div className="pen-container">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">
                記事素材の準備度
              </span>
              <span className="text-xs font-bold">
                {Math.min(displayReadiness, 100)}%
                {info.label && (
                  <span className="text-muted-foreground ml-1 font-normal">
                    — {info.label}
                  </span>
                )}
              </span>
            </div>
            <div
              className={`h-1.5 w-full overflow-hidden rounded-full ${info.bgColor}`}
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${info.color}`}
                style={{ width: `${Math.min(displayReadiness, 100)}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {info.message}
            </p>
          </div>
        </div>
      )}

      <main className="flex-1">
        <div className="pen-container pen-fade-in py-6">
          {/* ヘッダー: 戻る + 完了ボタン */}
          <div className="mb-4 flex items-center justify-between">
            <Link
              href={`/themes/${themeId}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Link>
            <button
              onClick={handleCompleteClick}
              disabled={messages.length < 2 || sending}
              className={`pen-btn ${
                isReady ? "pen-btn-accent shadow-lg" : "pen-btn-secondary"
              } transition-all`}
            >
              {isReady ? (
                <FileText className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isReady ? "記事を生成する" : "インタビューを完了する"}
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

          {/* スキップボタン（最後のメッセージがAIの場合に表示） */}
          {messages.length > 0 &&
            messages[messages.length - 1].role === "assistant" &&
            !sending && (
              <div className="mb-4 flex justify-start">
                <button
                  onClick={handleSkip}
                  disabled={sending}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  この質問をスキップする
                </button>
              </div>
            )}

          {/* 入力フォーム */}
          <form
            onSubmit={handleSend}
            className="border-border bg-card sticky bottom-4 flex items-end gap-2 rounded-xl border p-2 shadow-lg"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力... (Enterで送信)"
              className="max-h-[200px] min-h-[44px] flex-1 resize-none rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
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

      {/* 完了確認ダイアログ */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold">インタビューを完了する</h3>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              インタビュー内容をもとに、AIが記事を自動生成します。
              生成には30秒ほどかかる場合があります。
            </p>

            {generating && (
              <div className="mb-4 flex items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                <span>記事を生成中です... しばらくお待ちください</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleGenerateAndComplete}
                disabled={generating}
                className="pen-btn pen-btn-accent w-full justify-center py-3"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                記事を生成して完了する
              </button>
              <button
                onClick={handleCompleteOnly}
                disabled={generating}
                className="pen-btn pen-btn-secondary w-full justify-center py-2.5"
              >
                記事を生成せずに完了する
              </button>
              <button
                onClick={() => setShowCompleteDialog(false)}
                disabled={generating}
                className="text-muted-foreground mt-1 text-sm hover:underline"
              >
                インタビューを続ける
              </button>
            </div>
          </div>
        </div>
      )}
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
