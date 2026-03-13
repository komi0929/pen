"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { SuggestedTheme } from "@/app/api/theme-discovery/route";
import type { UserProfile } from "@/lib/prompts/theme-discovery";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Loader2,
  Pen,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// --- Types ---

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface DiscoverySession {
  sessionId: string;
  messages: ChatMessage[];
  userProfile: UserProfile | null;
  discoveryProgress: number;
  suggestedThemes: SuggestedTheme[] | null;
  createdAt: string;
  updatedAt: string;
  completed: boolean;
}

// --- Storage Helpers ---

const STORAGE_KEY = "pen_discovery_sessions";
const PROFILE_KEY = "pen_discovery_profile";
const MAX_SESSIONS = 10;
const SESSION_TTL_DAYS = 30;

function loadSessions(): DiscoverySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions: DiscoverySession[] = JSON.parse(raw);
    // 古いセッションを自動削除
    const cutoff = Date.now() - SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => new Date(s.updatedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveSessions(sessions: DiscoverySession[]) {
  if (typeof window === "undefined") return;
  // 最大件数制限
  const trimmed = sessions.slice(0, MAX_SESSIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

function loadGlobalProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveGlobalProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function mergeProfiles(
  existing: UserProfile | null,
  incoming: UserProfile | null
): UserProfile | null {
  if (!incoming) return existing;
  if (!existing) return incoming;
  const merged: UserProfile = { ...existing };

  if (incoming.occupation) merged.occupation = incoming.occupation;

  const mergeArray = (a?: string[], b?: string[]): string[] | undefined => {
    if (!b || b.length === 0) return a;
    if (!a || a.length === 0) return b;
    return [...new Set([...a, ...b])];
  };

  merged.interests = mergeArray(existing.interests, incoming.interests);
  merged.expertise = mergeArray(existing.expertise, incoming.expertise);
  merged.uniqueExperiences = mergeArray(
    existing.uniqueExperiences,
    incoming.uniqueExperiences
  );
  merged.consultedTopics = mergeArray(
    existing.consultedTopics,
    incoming.consultedTopics
  );

  return merged;
}

function generateSessionId(): string {
  return `ds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Progress Info ---

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

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

// --- Main Component ---

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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionProfile, setSessionProfile] = useState<UserProfile | null>(
    null
  );
  const [pastSessions, setPastSessions] = useState<DiscoverySession[]>([]);
  const [showSessionHistory, setShowSessionHistory] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFetchingRef = useRef(false);

  const progressInfo = getProgressInfo(discoveryProgress);

  // 初回マウント時にセッション一覧を読み込み
  useEffect(() => {
    const sessions = loadSessions();
    setPastSessions(sessions);
    // グローバルプロファイルも読み込み
    const gp = loadGlobalProfile();
    if (gp) setSessionProfile(gp);
  }, []);

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

  // セッション保存
  const saveCurrentSession = useCallback(
    (
      msgs: ChatMessage[],
      progress: number,
      themes: SuggestedTheme[] | null,
      profile: UserProfile | null,
      sessionId: string,
      completed: boolean = false
    ) => {
      const sessions = loadSessions();
      const existing = sessions.findIndex((s) => s.sessionId === sessionId);
      const now = new Date().toISOString();
      const session: DiscoverySession = {
        sessionId,
        messages: msgs,
        userProfile: profile,
        discoveryProgress: progress,
        suggestedThemes: themes,
        createdAt:
          existing >= 0 ? sessions[existing].createdAt : now,
        updatedAt: now,
        completed,
      };

      if (existing >= 0) {
        sessions[existing] = session;
      } else {
        sessions.unshift(session);
      }

      saveSessions(sessions);
      setPastSessions(sessions);

      // グローバルプロファイルも更新
      if (profile) {
        const globalProfile = loadGlobalProfile();
        const merged = mergeProfiles(globalProfile, profile);
        if (merged) {
          saveGlobalProfile(merged);
          setSessionProfile(merged);
        }
      }
    },
    []
  );

  // AI応答取得
  const fetchAI = useCallback(
    async (
      currentMessages: ChatMessage[],
      sessionId: string,
      profile: UserProfile | null
    ) => {
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
            userProfile: profile,
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!data.response) throw new Error("AI応答が空です");

        let newProgress = discoveryProgress;
        if (
          typeof data.discoveryProgress === "number" &&
          data.discoveryProgress >= 0
        ) {
          newProgress = data.discoveryProgress;
          setDiscoveryProgress(newProgress);
        }

        let newThemes = suggestedThemes;
        if (data.suggestedThemes) {
          newThemes = data.suggestedThemes;
          setSuggestedThemes(newThemes);
        }

        // プロファイル更新
        let newProfile = profile;
        if (data.userProfile) {
          newProfile = mergeProfiles(profile, data.userProfile);
          setSessionProfile(newProfile);
        }

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.response,
        };
        const updatedMsgs = [...currentMessages, aiMsg];
        setMessages(updatedMsgs);

        // セッション保存
        saveCurrentSession(
          updatedMsgs,
          newProgress,
          newThemes,
          newProfile,
          sessionId,
          newProgress >= 90
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "AI応答の取得に失敗しました"
        );
      } finally {
        isFetchingRef.current = false;
      }
    },
    [discoveryProgress, suggestedThemes, saveCurrentSession]
  );

  // 新規チャット開始
  const handleStart = async () => {
    const sid = generateSessionId();
    setCurrentSessionId(sid);
    setStarted(true);
    setSending(true);
    setMessages([]);
    setDiscoveryProgress(-1);
    setSuggestedThemes(null);

    const globalProfile = loadGlobalProfile();
    setSessionProfile(globalProfile);

    await fetchAI([], sid, globalProfile);
    setSending(false);
    inputRef.current?.focus();
  };

  // 過去セッションの続きから再開
  const handleResume = async (session: DiscoverySession) => {
    setCurrentSessionId(session.sessionId);
    setMessages(session.messages);
    setDiscoveryProgress(session.discoveryProgress);
    setSuggestedThemes(session.suggestedThemes);
    setSessionProfile(session.userProfile);
    setStarted(true);
    setShowSessionHistory(false);
    inputRef.current?.focus();
  };

  // セッション削除
  const handleDeleteSession = (sessionId: string) => {
    const sessions = loadSessions().filter((s) => s.sessionId !== sessionId);
    saveSessions(sessions);
    setPastSessions(sessions);
  };

  // メッセージ送信
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !currentSessionId) return;

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

    await fetchAI(updatedMessages, currentSessionId, sessionProfile);
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
    // セッションを完了マーク
    if (currentSessionId) {
      saveCurrentSession(
        messages,
        discoveryProgress,
        suggestedThemes,
        sessionProfile,
        currentSessionId,
        true
      );
    }

    if (user) {
      router.push(
        `/themes?newTitle=${encodeURIComponent(theme.title)}&newDesc=${encodeURIComponent(theme.description + "\n\n切り口: " + theme.angle + "\n想定読者: " + theme.readers)}`
      );
    } else {
      router.push(
        `/login?from=discover&theme=${encodeURIComponent(theme.title)}&desc=${encodeURIComponent(theme.description)}`
      );
    }
  };

  // --- 未完了セッション ---
  const activeSessions = pastSessions.filter((s) => !s.completed);
  const completedSessions = pastSessions.filter((s) => s.completed);

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

            {/* 過去のセッション */}
            {pastSessions.length > 0 && (
              <div className="mt-8 text-left">
                <button
                  onClick={() => setShowSessionHistory(!showSessionHistory)}
                  className="text-muted-foreground hover:text-foreground mb-3 flex w-full items-center gap-2 text-xs font-bold transition-colors"
                >
                  <Clock className="h-3.5 w-3.5" />
                  過去の探索履歴（{pastSessions.length}件）
                  <span className="ml-auto">
                    {showSessionHistory ? "▲" : "▼"}
                  </span>
                </button>

                {showSessionHistory && (
                  <div className="space-y-2">
                    {/* 未完了セッション */}
                    {activeSessions.length > 0 && (
                      <>
                        <p className="text-muted-foreground text-[11px] font-bold">
                          途中の探索
                        </p>
                        {activeSessions.map((s) => (
                          <SessionCard
                            key={s.sessionId}
                            session={s}
                            onResume={() => handleResume(s)}
                            onDelete={() => handleDeleteSession(s.sessionId)}
                          />
                        ))}
                      </>
                    )}

                    {/* 完了セッション */}
                    {completedSessions.length > 0 && (
                      <>
                        <p className="text-muted-foreground mt-3 text-[11px] font-bold">
                          完了した探索
                        </p>
                        {completedSessions.map((s) => (
                          <SessionCard
                            key={s.sessionId}
                            session={s}
                            onResume={() => handleResume(s)}
                            onDelete={() => handleDeleteSession(s.sessionId)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
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
                  {theme.scores && (
                    <div className="mt-1.5 flex gap-2 text-[10px]">
                      <span className="bg-muted rounded px-1.5 py-0.5">
                        一次性{theme.scores.primary}
                      </span>
                      <span className="bg-muted rounded px-1.5 py-0.5">
                        普遍性{theme.scores.universal}
                      </span>
                      <span className="bg-muted rounded px-1.5 py-0.5">
                        深掘り{theme.scores.depth}
                      </span>
                    </div>
                  )}
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

// --- Session Card Component ---

function SessionCard({
  session,
  onResume,
  onDelete,
}: {
  session: DiscoverySession;
  onResume: () => void;
  onDelete: () => void;
}) {
  const userMsgs = session.messages.filter((m) => m.role === "user");
  const firstUserMsg = userMsgs[0]?.content ?? "";
  const preview =
    firstUserMsg.length > 60
      ? firstUserMsg.slice(0, 60) + "…"
      : firstUserMsg || "（開始直後）";
  const progress = session.discoveryProgress;

  return (
    <div className="border-border bg-card flex items-center gap-3 rounded-lg border p-3">
      <button onClick={onResume} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{preview}</p>
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[11px]">
          <span>{formatRelativeTime(session.updatedAt)}</span>
          {progress >= 0 && (
            <>
              <span>·</span>
              <span>進捗 {progress}%</span>
            </>
          )}
          <span>·</span>
          <span>
            {session.completed ? "完了" : `${userMsgs.length}回のやりとり`}
          </span>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {!session.completed && (
          <button
            onClick={onResume}
            className="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors"
            title="続きから再開"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-muted-foreground hover:text-red-500 rounded p-1.5 transition-colors"
          title="削除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
