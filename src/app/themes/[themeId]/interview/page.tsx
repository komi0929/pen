"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getArticleRefs } from "@/lib/actions/article-refs";
import {
  addMessage,
  completeInterview,
  createInterview,
  getActiveInterview,
  getInterview,
} from "@/lib/actions/interviews";
import { getMemos } from "@/lib/actions/memos";
import { getStyleReferences } from "@/lib/actions/style-references";
import { getTheme } from "@/lib/actions/themes";
import type {
  Interview,
  InterviewMessage,
  Memo,
  StyleReference,
  Theme,
  ThemeArticleRef,
} from "@/types";
import {
  ArrowLeft,
  Check,
  FileText,
  Flame,
  Loader2,
  MessageSquare,
  PenLine,
  Send,
  SkipForward,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type InterviewMode = "normal" | "hard";

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
  const [articleRefs, setArticleRefs] = useState<ThemeArticleRef[]>([]);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiReadiness, setAiReadiness] = useState(-1);
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("normal");
  const [showMotivation, setShowMotivation] = useState(false);
  const [showPreGeneration, setShowPreGeneration] = useState(false);
  const [articleTone, setArticleTone] = useState("casual");
  const [toneNote, setToneNote] = useState("");
  const [targetLength, setTargetLength] = useState(1000);

  // 文体設定
  const [pronoun, setPronoun] = useState("私");
  const [customPronoun, setCustomPronoun] = useState("");
  const [writingStyle, setWritingStyle] = useState<"desu_masu" | "da_dearu">(
    "desu_masu"
  );

  // 文体リファレンス
  const [styleReferences, setStyleReferences] = useState<StyleReference[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");

  const [completing, setCompleting] = useState(false);
  const [generatedArticleId, setGeneratedArticleId] = useState<string | null>(
    null
  );
  const [generationComplete, setGenerationComplete] = useState(false);

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

  // インタビュー中のブラウザ離脱防止
  useEffect(() => {
    if (!interview || messages.length === 0 || completing) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [interview, messages.length, completing]);

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
      isSkip = false,
      articleRefsData?: ThemeArticleRef[],
      mode?: InterviewMode
    ) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const refsForApi = (articleRefsData ?? articleRefs)
          .filter((r) => r.article_title && r.article_content)
          .map((r) => ({
            title: r.article_title!,
            content: r.article_content!,
          }));

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
            referenceArticles: refsForApi.length > 0 ? refsForApi : undefined,
            interviewMode: mode ?? interviewMode,
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
      const [
        themeResult,
        memosResult,
        interviewResult,
        refsResult,
        stylesResult,
      ] = await Promise.all([
        getTheme(themeId),
        getMemos(themeId),
        getActiveInterview(themeId),
        getArticleRefs(themeId),
        getStyleReferences(),
      ]);

      const loadedTheme = themeResult.success ? themeResult.data : null;
      const loadedMemos = memosResult.success ? memosResult.data : [];
      const loadedRefs = refsResult.success ? refsResult.data : [];
      const loadedStyles = stylesResult.success ? stylesResult.data : [];

      if (loadedTheme) setTheme(loadedTheme);
      if (memosResult.success) setMemos(loadedMemos);
      setArticleRefs(loadedRefs);
      setStyleReferences(loadedStyles);

      // デフォルト文体を自動選択
      const defaultStyle = loadedStyles.find((s) => s.is_default);
      if (defaultStyle) {
        setSelectedStyleId(defaultStyle.id);
      }

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
              loadedMemos,
              false,
              loadedRefs
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

    // ハードモードの場合、激励メッセージを表示
    if (interviewMode === "hard" && !showMotivation) {
      setShowMotivation(true);
      return;
    }

    setSending(true);
    setError(null);
    const result = await createInterview(themeId, targetLength);
    if (result.success) {
      setInterview(result.data);
      await fetchAI(
        result.data.id,
        [],
        theme,
        memos,
        false,
        undefined,
        interviewMode
      );
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
      await fetchAI(
        interview.id,
        updatedMessages,
        theme,
        memos,
        false,
        undefined,
        interviewMode
      );
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
    await fetchAI(
      interview.id,
      messages,
      theme,
      memos,
      true,
      undefined,
      interviewMode
    );
    setSending(false);
  };

  // 記事を生成して完了（待機画面を表示）
  const handleGenerateAndComplete = async () => {
    if (!interview || completing) return;

    // 初回クリック時は文体設定ステップを表示
    if (!showPreGeneration) {
      setShowPreGeneration(true);
      return;
    }

    setCompleting(true);
    setError(null);

    try {
      const effectivePronoun =
        pronoun === "_custom" ? customPronoun || "私" : pronoun;
      const res = await fetch("/api/generate-article-async", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId,
          interviewId: interview.id,
          themeTitle: theme?.title ?? "",
          themeDescription: theme?.description ?? "",
          targetLength: interview.target_length,
          memos: memos.map((m) => ({ content: m.content })),
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          articleId: articleId ?? undefined,
          referenceArticles: articleRefs
            .filter((r) => r.article_title && r.article_content)
            .map((r) => ({
              title: r.article_title!,
              content: r.article_content!,
            })),
          pronoun: effectivePronoun,
          writingStyle,
          styleReferenceId: selectedStyleId || undefined,
          articleTone,
          toneNote: toneNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.articleId) {
        setGeneratedArticleId(json.articleId);
        setGenerationComplete(true);
        // 3秒後に記事詳細へ自動遷移
        setTimeout(() => {
          router.push(`/articles/${json.articleId}`);
        }, 3000);
      } else {
        setError(json.error || "記事の生成に失敗しました");
        setCompleting(false);
      }
    } catch {
      setError("記事の生成中にエラーが発生しました");
      setCompleting(false);
    }
  };

  // 記事生成せずに完了
  const handleCompleteOnly = async () => {
    if (!interview || completing) return;
    setCompleting(true);
    setError(null);
    try {
      await completeInterview(interview.id);
      router.push(`/themes/${themeId}`);
    } catch {
      setError("インタビューの完了に失敗しました");
      setCompleting(false);
    }
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

  // 激励メッセージ画面（ハードモード選択時）
  if (showMotivation && !interview) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="pen-fade-in w-full max-w-md px-4 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
              <Flame className="h-10 w-10 animate-pulse text-orange-500" />
            </div>
            <h2 className="mb-3 text-2xl font-bold">ハード深堀モード</h2>
            <div className="bg-muted mb-6 rounded-xl p-5 text-left">
              <p className="mb-3 text-sm leading-relaxed">
                このモードでは、AIが<strong>かなり踏み込んだ質問</strong>
                をします。
              </p>
              <ul className="text-muted-foreground space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  曖昧な回答には「もっと具体的に」と切り返します
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  数字・日時・場所など、裏付けを求めます
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  「あなたにしか書けないこと」を徹底的に引き出します
                </li>
              </ul>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              大変ですが、その分<strong>圧倒的に質の高い記事</strong>
              の素材が集まります。
              <br />
              覚悟はいいですか？
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStart}
                disabled={sending}
                className="pen-btn rounded-xl bg-orange-500 px-8 py-3 text-base font-bold text-white shadow-lg transition-all hover:bg-orange-600"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Flame className="h-5 w-5" />
                )}
                覚悟はできた、始めよう
              </button>
              <button
                onClick={() => setShowMotivation(false)}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                戻る
              </button>
            </div>
          </div>
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
          <div className="pen-container pen-fade-in pt-14 pb-8">
            <Link
              href={`/themes/${themeId}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {theme?.title ?? "テーマ"}に戻る
            </Link>

            <div className="py-8 text-center">
              <h1 className="mb-2 text-2xl font-bold">AIインタビュー</h1>
              <p className="text-muted-foreground mx-auto mb-8 max-w-md">
                AIがあなたに質問を投げかけます。対話を通じて考えを整理し、
                記事の素材を作りましょう。
              </p>
              {memos.length > 0 && (
                <p className="text-muted-foreground mb-2 text-sm">
                  📝 {memos.length}件のメモを参考にAIが質問を生成します
                </p>
              )}
              {articleRefs.length > 0 && (
                <p className="text-muted-foreground mb-6 text-sm">
                  📄 {articleRefs.length}
                  件の参考記事がインタビュー時に参照されます
                </p>
              )}

              {/* モード選択 */}
              <div className="mx-auto mb-8 max-w-sm">
                <label className="text-muted-foreground mb-3 block text-sm">
                  インタビューモード
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setInterviewMode("normal")}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      interviewMode === "normal"
                        ? "border-accent bg-accent/5 shadow-sm"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <MessageSquare
                        className={`h-5 w-5 ${
                          interviewMode === "normal"
                            ? "text-accent"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-sm font-bold">通常モード</span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      リラックスした対話で
                      <br />
                      自然に素材を引き出します
                    </p>
                  </button>
                  <button
                    disabled
                    className="border-border relative cursor-not-allowed rounded-xl border-2 p-4 text-left opacity-50"
                  >
                    <div className="absolute -top-2 -right-2 rounded-full bg-orange-400 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      開発中
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <Flame className="text-muted-foreground h-5 w-5" />
                      <span className="text-sm font-bold">ハード深堀</span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      一次性・独自性・検証可能性
                      <br />
                      を妥協なく追求します
                    </p>
                  </button>
                </div>
              </div>

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
                className={`pen-btn px-8 py-3 text-base ${
                  interviewMode === "hard"
                    ? "rounded-xl bg-orange-500 font-bold text-white shadow-lg hover:bg-orange-600"
                    : "pen-btn-accent"
                }`}
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : interviewMode === "hard" ? (
                  <Flame className="h-5 w-5" />
                ) : (
                  <MessageSquare className="h-5 w-5" />
                )}
                {interviewMode === "hard"
                  ? "ハード深堀を始める"
                  : "インタビューを始める"}
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  // 記事生成前の文体設定ステップ
  if (showPreGeneration && !completing) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="pen-container pen-fade-in mx-auto max-w-lg pt-10 pb-8">
            <h2 className="mb-1 text-center text-xl font-bold">
              記事のスタイルを設定
            </h2>
            <p className="text-muted-foreground mb-6 text-center text-sm">
              インタビューの内容をどんなトーンで記事にするか決めます
            </p>

            {/* トーンプリセット */}
            <div className="mb-6">
              <label className="text-muted-foreground mb-3 block text-sm">
                記事のトーン
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    key: "record",
                    emoji: "📝",
                    label: "淡々と記録する",
                    desc: "日記・備忘録的。教訓や感想は控えめ",
                  },
                  {
                    key: "think",
                    emoji: "💭",
                    label: "考えを整理する",
                    desc: "内省あり、でも押し付けない",
                  },
                  {
                    key: "casual",
                    emoji: "🗣️",
                    label: "気軽に話す",
                    desc: "雑談・ブログっぽく親しみやすく",
                  },
                  {
                    key: "teach",
                    emoji: "🎯",
                    label: "学びを伝える",
                    desc: "ノウハウ共有・教訓型",
                  },
                  {
                    key: "story",
                    emoji: "📖",
                    label: "ストーリーで描く",
                    desc: "物語調・臨場感重視",
                  },
                ].map((tone) => (
                  <button
                    key={tone.key}
                    onClick={() => setArticleTone(tone.key)}
                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      articleTone === tone.key
                        ? "border-accent bg-accent/5 shadow-sm"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className="text-xl">{tone.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{tone.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {tone.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ひとこと補足 */}
            <div className="mb-6">
              <label className="text-muted-foreground mb-2 block text-sm">
                補足メモ（任意）
              </label>
              <input
                type="text"
                value={toneNote}
                onChange={(e) => setToneNote(e.target.value)}
                placeholder="例: 説教くさくしないで、あっさりめで、ポエムみたいに..."
                className="border-border bg-card focus:border-accent w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                AIへの一言メモ。トーンの微調整に使えます
              </p>
            </div>

            {/* 一人称 & 文体 */}
            <div className="mb-6 grid grid-cols-2 gap-6">
              {/* 一人称 */}
              <div>
                <label className="text-muted-foreground mb-2 block text-sm">
                  一人称
                </label>
                <div className="space-y-2">
                  {["私", "僕", "俺", "自分", "筆者"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPronoun(p)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        pronoun === p
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPronoun("_custom")}
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      pronoun === "_custom"
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    その他
                  </button>
                  {pronoun === "_custom" && (
                    <input
                      type="text"
                      value={customPronoun}
                      onChange={(e) => setCustomPronoun(e.target.value)}
                      placeholder="例: わたし、ウチ..."
                      className="border-border bg-card focus:border-accent w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* 文体 */}
              <div>
                <label className="text-muted-foreground mb-2 block text-sm">
                  文体
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setWritingStyle("desu_masu")}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                      writingStyle === "desu_masu"
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium">です・ます調</p>
                    <p className="text-xs opacity-70">敬体・丁寧な印象</p>
                  </button>
                  <button
                    onClick={() => setWritingStyle("da_dearu")}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                      writingStyle === "da_dearu"
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium">だ・である調</p>
                    <p className="text-xs opacity-70">常体・力強い印象</p>
                  </button>
                </div>
              </div>
            </div>

            {/* 参考文体 */}
            <div className="mb-6">
              <label className="text-muted-foreground mb-2 block text-sm">
                参考文体
              </label>
              {styleReferences.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedStyleId("")}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                        selectedStyleId === ""
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <p className="text-sm font-medium">指定なし</p>
                      <p className="text-xs opacity-70">
                        デフォルトの文体で生成
                      </p>
                    </button>
                    {styleReferences.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyleId(style.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                          selectedStyleId === style.id
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <p className="text-sm font-medium">
                          {style.label}
                          {style.is_default && (
                            <span className="ml-2 text-xs opacity-60">
                              ★ デフォルト
                            </span>
                          )}
                        </p>
                        <p className="line-clamp-1 text-xs opacity-70">
                          {style.source_text.slice(0, 50)}...
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="border-border bg-muted/50 rounded-xl border p-4">
                  <p className="mb-2 text-sm">
                    💡 <strong>参考文体</strong>
                    を登録すると、好みのトーン・文体で記事を生成できます
                  </p>
                  <p className="text-muted-foreground mb-3 text-xs">
                    例: けんすうさん風、ビジネス論文風、カジュアルブログ風 など
                  </p>
                  <Link
                    href="/settings/styles"
                    className="pen-btn pen-btn-secondary inline-flex text-sm"
                  >
                    <PenLine className="h-4 w-4" />
                    文体を登録する
                  </Link>
                </div>
              )}
            </div>

            {error && (
              <p className="text-danger mb-4 text-center text-sm">{error}</p>
            )}

            {/* アクションボタン */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGenerateAndComplete}
                disabled={completing}
                className="pen-btn pen-btn-accent w-full px-8 py-3 text-base"
              >
                {completing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                この設定で記事を生成する
              </button>
              <button
                onClick={() => setShowPreGeneration(false)}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                インタビューに戻る
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 記事執筆中の待機画面
  if (completing) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="pen-fade-in w-full max-w-md px-4 text-center">
            {generationComplete ? (
              // 完成メッセージ
              <>
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <Sparkles className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="mb-2 text-2xl font-bold">
                  記事が完成しました！
                </h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  まもなく記事の画面に移動します...
                </p>
                {generatedArticleId && (
                  <Link
                    href={`/articles/${generatedArticleId}`}
                    className="pen-btn pen-btn-accent inline-flex px-6 py-3"
                  >
                    <FileText className="h-4 w-4" />
                    記事を見る
                  </Link>
                )}
              </>
            ) : (
              // 執筆中アニメーション
              <>
                <div className="bg-muted mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
                  <PenLine className="text-accent h-10 w-10 animate-pulse" />
                </div>
                <h2 className="mb-2 text-2xl font-bold">記事を執筆中...</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  AIがインタビュー内容をもとに記事を作成しています。
                  <br />
                  しばらくお待ちください。
                </p>
                <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="bg-accent h-full animate-pulse rounded-full"
                    style={{
                      width: "60%",
                      animation:
                        "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, shimmer 3s ease-in-out infinite",
                    }}
                  />
                </div>
                {error && <p className="text-danger mt-4 text-sm">{error}</p>}
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // チャットUI
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* 固定プログレスバー */}
      {displayReadiness >= 0 && (
        <div
          className={`border-border sticky top-14 z-40 border-b px-4 py-2 backdrop-blur-sm ${
            interviewMode === "hard"
              ? "bg-orange-50/95 dark:bg-orange-950/30"
              : "bg-card/95"
          }`}
        >
          <div className="pen-container">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                {interviewMode === "hard" && (
                  <Flame className="h-3 w-3 text-orange-500" />
                )}
                記事素材の準備度{interviewMode === "hard" ? "（ハード）" : ""}
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
              className={`h-1.5 w-full overflow-hidden rounded-full ${
                interviewMode === "hard" ? "bg-orange-100" : info.bgColor
              }`}
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  interviewMode === "hard" ? "bg-orange-500" : info.color
                }`}
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
            <button
              onClick={() => {
                if (
                  messages.length >= 2 &&
                  !window.confirm(
                    "インタビューを中断しますか？\n\n入力済みの会話は保存されています。あとで「インタビューを続ける」から再開できます。"
                  )
                )
                  return;
                router.push(`/themes/${themeId}`);
              }}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </button>
            {/* 記事生成ボタン + 生成せず完了ボタン */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateAndComplete}
                disabled={messages.length < 2 || sending || completing}
                className={`pen-btn ${
                  isReady ? "pen-btn-accent shadow-lg" : "pen-btn-secondary"
                } transition-all`}
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isReady ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isReady ? "記事を生成する" : "完了して記事を生成"}
              </button>
              <button
                onClick={handleCompleteOnly}
                disabled={messages.length < 2 || sending || completing}
                className="pen-btn pen-btn-secondary text-xs"
                title="記事を生成せずにインタビューのみ完了"
              >
                生成せず完了
              </button>
            </div>
          </div>

          {error && (
            <p className="text-danger mb-4 text-center text-sm">{error}</p>
          )}

          {/* チャットメッセージ */}
          <div className="mb-6 space-y-4">
            {messages.map((msg, idx) => {
              const isLastAssistant =
                msg.role === "assistant" &&
                idx === messages.length - 1;
              return (
                <div key={msg.id}>
                  <div
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
                  {/* スキップボタン（最後のAIメッセージの吹き出し直下に配置） */}
                  {isLastAssistant && !sending && (
                    <div className="mt-1.5 flex justify-start">
                      <button
                        onClick={() => {
                          if (window.confirm("この質問をスキップしますか？")) {
                            handleSkip();
                          }
                        }}
                        disabled={sending}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                        この質問をスキップする
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="pen-bubble-ai flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">考え中...</span>
                </div>
              </div>
            )}

            {/* チャット内インライン「記事を生成する」ボタン */}
            {isReady &&
              !sending &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" && (
                <div className="flex justify-center">
                  <button
                    onClick={handleGenerateAndComplete}
                    disabled={completing}
                    className="pen-btn pen-btn-accent animate-in fade-in slide-in-from-bottom-2 px-6 py-3 text-base shadow-lg"
                  >
                    <FileText className="h-5 w-5" />
                    記事を生成する
                  </button>
                </div>
              )}

            {/* 入力フォームとの間に余白を確保（誤タップ防止） */}
            <div className="h-16" />

            <div ref={chatEndRef} />
          </div>

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

      {/* モーダル廃止: 完了ボタンはインラインに統合済み */}
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
