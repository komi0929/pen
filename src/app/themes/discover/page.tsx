"use client";

import { useAuth } from "@/contexts/AuthContext";
import { showToast } from "@/components/Toast";
import { createTheme } from "@/lib/actions/themes";
import type { SuggestedTheme } from "@/app/api/theme-discovery/route";
import type { UserProfile } from "@/lib/prompts/theme-discovery";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Clock,
  Lightbulb,
  ListOrdered,
  Loader2,
  MessageSquarePlus,
  Pen,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  User,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
const MEMO_KEY = "pen_theme_memos";
const PENDING_THEME_KEY = "pen_pending_theme";
const MAX_SESSIONS = 10;
const SESSION_TTL_DAYS = 30;

function loadSessions(): DiscoverySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions: DiscoverySession[] = JSON.parse(raw);
    const cutoff = Date.now() - SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => new Date(s.updatedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveSessions(sessions: DiscoverySession[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage quota exceeded — 古いセッションを削除してリトライ
    try {
      const trimmed = sessions.slice(0, 3);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // 完全に失敗 — サイレントに処理
    }
  }
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
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage quota exceeded — サイレントに処理
  }
}

function clearGlobalProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
}

// --- テーマメモ（ネタ帳）---
interface ThemeMemo {
  id: string;
  text: string;
  createdAt: string;
}

function loadMemos(): ThemeMemo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEMO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMemos(memos: ThemeMemo[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMO_KEY, JSON.stringify(memos.slice(0, 20)));
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
  merged.uniqueExperiences = mergeArray(existing.uniqueExperiences, incoming.uniqueExperiences);
  merged.consultedTopics = mergeArray(existing.consultedTopics, incoming.consultedTopics);
  // v4フィールド: pastThemeTitlesとsessionCountは上書きではなく蓄積
  merged.pastThemeTitles = mergeArray(existing.pastThemeTitles, incoming.pastThemeTitles);
  if (incoming.sessionCount != null) {
    merged.sessionCount = Math.max(existing.sessionCount ?? 0, incoming.sessionCount);
  }
  // v5フィールド: パーソナル編集者
  merged.editorNotes = mergeArray(existing.editorNotes, incoming.editorNotes);
  merged.topicAreas = mergeArray(existing.topicAreas, incoming.topicAreas);
  if (incoming.writerStrengths) merged.writerStrengths = incoming.writerStrengths;
  return merged;
}

function generateSessionId(): string {
  return `ds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ストリーミング中にAI制御タグをリアルタイム除去
function cleanStreamText(text: string): string {
  // 完成したタグを除去: [[TAG:...]]
  let cleaned = text.replace(/\[\[[A-Z_]+:[\s\S]*?\]\]/g, "");
  // 未完了タグ（まだ閉じていない [[TAG: から末尾まで）を除去
  cleaned = cleaned.replace(/\[\[[A-Z_]+:[\s\S]*$/g, "");
  // 先頭・末尾の空行を除去
  return cleaned.trim();
}

// --- Helpers ---

function getProgressInfo(progress: number) {
  if (progress < 0)
    return { label: "", color: "bg-foreground/20", message: "" };
  if (progress < 20)
    return { label: "ヒアリング中", color: "bg-foreground/30", message: "あなたのことを教えてください" };
  if (progress < 45)
    return { label: "テーマの種を探索中", color: "bg-foreground/45", message: "面白い話題が見つかりそうです" };
  if (progress < 65)
    return { label: "有望なテーマを発見中", color: "bg-foreground/55", message: "テーマが絞り込まれてきました" };
  if (progress < 80)
    return { label: "テーマ提案準備中", color: "bg-foreground/70", message: "もう少しで提案できます" };
  return { label: "テーマ発見！", color: "bg-foreground/85", message: "あなたに最適なテーマが見つかりました" };
}

// AIバブルの連続空行を正規化（3行以上を2行に）
function normalizeLineBreaks(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
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

function scoreBadgeColor(score?: string): string {
  if (score === "◎") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (score === "○") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
}

function hasProfileData(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return !!(
    profile.occupation ||
    (profile.interests && profile.interests.length > 0) ||
    (profile.expertise && profile.expertise.length > 0) ||
    (profile.uniqueExperiences && profile.uniqueExperiences.length > 0)
  );
}

// 過去セッションから発見済みテーマを抽出
function getDiscoveredThemes(sessions: DiscoverySession[]): { theme: SuggestedTheme; date: string }[] {
  const themes: { theme: SuggestedTheme; date: string }[] = [];
  for (const s of sessions) {
    if (s.completed && s.suggestedThemes) {
      for (const t of s.suggestedThemes) {
        themes.push({ theme: t, date: s.updatedAt });
      }
    }
  }
  return themes;
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
  const [suggestedThemes, setSuggestedThemes] = useState<SuggestedTheme[] | null>(null);
  const [started, setStarted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionProfile, setSessionProfile] = useState<UserProfile | null>(null);
  const [pastSessions, setPastSessions] = useState<DiscoverySession[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<SuggestedTheme | null>(null);
  const [showProfileReset, setShowProfileReset] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  // テーマメモ
  const [memos, setMemos] = useState<ThemeMemo[]>([]);
  const [memoInput, setMemoInput] = useState("");
  const [showMemoForm, setShowMemoForm] = useState(false);
  // テーマ磨き込み
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [showRefine, setShowRefine] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const progressInfo = getProgressInfo(discoveryProgress);
  const chatEnded = suggestedThemes !== null && suggestedThemes.length > 0;
  const isReturning = hasProfileData(sessionProfile);

  useEffect(() => {
    const sessions = loadSessions();
    setPastSessions(sessions);
    const gp = loadGlobalProfile();
    if (gp) setSessionProfile(gp);
    setMemos(loadMemos());

    // ログイン後のテーマ自動復元
    const pendingRaw = localStorage.getItem(PENDING_THEME_KEY);
    if (pendingRaw) {
      try {
        const pendingTheme = JSON.parse(pendingRaw) as SuggestedTheme;
        localStorage.removeItem(PENDING_THEME_KEY);
        setSelectedTheme(pendingTheme);
      } catch {
        localStorage.removeItem(PENDING_THEME_KEY);
      }
    }
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // ページタイトル動的更新
  useEffect(() => {
    if (!started) {
      document.title = "テーマ探索 | pen";
    } else if (chatEnded) {
      document.title = "テーマ発見！ | pen";
    } else if (sending) {
      document.title = "AIが考え中... | pen";
    } else {
      document.title = "テーマ探索中... | pen";
    }
    return () => { document.title = "pen — AIインタビュー＆記事制作"; };
  }, [started, chatEnded, sending]);

  // オフライン検知
  useEffect(() => {
    const handleOffline = () => setError("インターネット接続が切れました。接続を確認してください。");
    const handleOnline = () => setError(null);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // セッション自動保存（毎回のAI応答後）
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
        createdAt: existing >= 0 ? sessions[existing].createdAt : now,
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

      // グローバルプロファイルも常に更新
      if (profile) {
        const globalProfile = loadGlobalProfile();
        const merged = mergeProfiles(globalProfile, profile);
        if (merged) {
          // テーマ完了時に発見テーマタイトルを蓄積
          if (completed && themes && themes.length > 0) {
            const existingTitles = merged.pastThemeTitles ?? [];
            const newTitles = themes.map((t) => t.title);
            merged.pastThemeTitles = [...new Set([...existingTitles, ...newTitles])];
          }
          saveGlobalProfile(merged);
          setSessionProfile(merged);
        }
      }
    },
    []
  );

  // AI応答取得（ストリーミング対応）
  const fetchAI = useCallback(
    async (
      currentMessages: ChatMessage[],
      sessionId: string,
      profile: UserProfile | null
    ) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      // 前のリクエストをキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // ストリーミング用のAIメッセージを先に追加（空の状態で）
      const aiMsgId = `ai-${Date.now()}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
      };
      // 関数型更新でReactのバッチングに安全に対応
      setMessages((prev) => [...prev, aiMsg]);

      // タイムアウト(45秒)
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const res = await fetch("/api/theme-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
            userProfile: profile,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error("リクエストが集中しています。少し待ってから再度お試しください。");
          }
          throw new Error("一時的に応答できません。もう一度お試しください。");
        }

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream") && res.body) {
          // ストリーミングモード
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let streamedText = "";
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const event = JSON.parse(line.slice(6));

                if (event.type === "text") {
                  streamedText += event.content;
                  // タグをリアルタイムで除去して表示
                  const displayText = cleanStreamText(streamedText);
                  // AIメッセージをリアルタイム更新
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId ? { ...m, content: displayText } : m
                    )
                  );
                } else if (event.type === "done") {
                  // クリーンテキストで最終更新
                  const cleanText = event.cleanText || streamedText;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId ? { ...m, content: cleanText } : m
                    )
                  );

                  // 構造化データの処理
                  let newProgress = -1;
                  if (typeof event.discoveryProgress === "number" && event.discoveryProgress >= 0) {
                    newProgress = event.discoveryProgress;
                    setDiscoveryProgress(newProgress);
                  }
                  let newThemes: SuggestedTheme[] | null = null;
                  if (event.suggestedThemes) {
                    newThemes = event.suggestedThemes;
                    setSuggestedThemes(newThemes);
                  }
                  let newProfile = profile;
                  if (event.userProfile) {
                    newProfile = mergeProfiles(profile, event.userProfile);
                    setSessionProfile(newProfile);
                  }
                  if (event.editorNotes) {
                    processEditorNotes(event.editorNotes);
                  }

                  // 最終メッセージで自動保存（editorNotes処理の後に実行）
                  const finalMsgs = currentMessages.concat({
                    id: aiMsgId,
                    role: "assistant",
                    content: cleanText,
                  });
                  const isCompleted = !!(newThemes && newThemes.length > 0);
                  saveCurrentSession(finalMsgs, newProgress, newThemes, newProfile, sessionId, isCompleted);
                } else if (event.type === "error") {
                  throw new Error(event.error);
                }
              } catch (parseErr) {
                // SSEパースエラーは無視
                if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                  throw parseErr;
                }
              }
            }
          }
        } else {
          // フォールバック: 非ストリーミング（モックモード等）
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          if (!data.response) throw new Error("AI応答が空です");

          let newProgress = -1;
          if (typeof data.discoveryProgress === "number" && data.discoveryProgress >= 0) {
            newProgress = data.discoveryProgress;
            setDiscoveryProgress(newProgress);
          }
          let newThemes: SuggestedTheme[] | null = null;
          if (data.suggestedThemes) {
            newThemes = data.suggestedThemes;
            setSuggestedThemes(newThemes);
          }
          let newProfile = profile;
          if (data.userProfile) {
            newProfile = mergeProfiles(profile, data.userProfile);
            setSessionProfile(newProfile);
          }
          if (data.editorNotes) {
            processEditorNotes(data.editorNotes);
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, content: data.response } : m
            )
          );

          const finalMsgs = currentMessages.concat({
            id: aiMsgId,
            role: "assistant",
            content: data.response,
          });
          const isCompleted = !!(newThemes && newThemes.length > 0);
          saveCurrentSession(finalMsgs, newProgress, newThemes, newProfile, sessionId, isCompleted);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // キャンセル or タイムアウト
          setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
          // タイムアウトの場合はエラー表示（手動キャンセル時はabortControllerRefがnull）
          if (abortControllerRef.current === controller) {
            setError("応答に時間がかかっています。もう一度お試しください。");
          }
        } else {
          setError(err instanceof Error ? err.message : "AI応答の取得に失敗しました");
          // 空のAIメッセージも削除
          setMessages((prev) => prev.filter((m) => m.id !== aiMsgId || m.content !== ""));
        }
      } finally {
        isFetchingRef.current = false;
        clearTimeout(timeoutId);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [saveCurrentSession]
  );

  // --- Actions ---

  const startNewSession = async () => {
    if (sending) return; // 二重クリック防止
    const sid = generateSessionId();
    setCurrentSessionId(sid);
    setStarted(true);
    setSending(true);
    setMessages([]);
    setDiscoveryProgress(-1);
    setSuggestedThemes(null);
    setSelectedTheme(null);
    setError(null);
    setShowMemoForm(false);
    setShowProfileReset(false);

    // セッションカウントをインクリメント
    const globalProfile = loadGlobalProfile();
    const profileWithCount = globalProfile
      ? { ...globalProfile, sessionCount: (globalProfile.sessionCount ?? 0) + 1 }
      : null;
    if (profileWithCount) {
      saveGlobalProfile(profileWithCount);
    }
    setSessionProfile(profileWithCount);

    // メモがある場合はAIの初回メッセージにメモを注入
    const currentMemos = loadMemos();
    if (currentMemos.length > 0) {
      const memoText = currentMemos.map((m) => `・${m.text}`).join("\n");
      const memoContext: ChatMessage = {
        id: `memo-${Date.now()}`,
        role: "user",
        content: `【テーマメモ】\n${memoText}`,
      };
      // メモメッセージをUIにも表示
      setMessages([memoContext]);
      await fetchAI([memoContext], sid, profileWithCount);
      // 使用済みメモをクリア
      saveMemos([]);
      setMemos([]);
    } else {
      await fetchAI([], sid, profileWithCount);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleResume = (session: DiscoverySession) => {
    setCurrentSessionId(session.sessionId);
    setMessages(session.messages);
    setDiscoveryProgress(session.discoveryProgress);
    setSuggestedThemes(session.suggestedThemes);
    setSessionProfile(session.userProfile);
    setStarted(true);
    setSelectedTheme(null);
    setError(null);
    setShowRefine(false);
    setRefineInput("");
    inputRef.current?.focus();
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!window.confirm("この探索セッションを削除しますか？")) return;
    const sessions = loadSessions().filter((s) => s.sessionId !== sessionId);
    saveSessions(sessions);
    setPastSessions(sessions);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !currentSessionId || chatEnded) return;
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
    if (inputRef.current) inputRef.current.style.height = "auto";
    await fetchAI(updatedMessages, currentSessionId, sessionProfile);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中はEnterを無視（日本語入力対応）
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  const handleThemeCardClick = (theme: SuggestedTheme) => {
    setSelectedTheme(theme);
    setError(null);
  };

  const handleSaveTheme = async (theme: SuggestedTheme) => {
    if (!user) {
      // テーマ情報を一時保存してログインへ
      localStorage.setItem(PENDING_THEME_KEY, JSON.stringify(theme));
      router.push(`/login?next=${encodeURIComponent("/themes/discover")}`);
      return;
    }
    setSavingTheme(true);
    try {
      const desc = `${theme.description}\n\n切り口: ${theme.angle}\n想定読者: ${theme.readers}`;
      const adviceText = theme.advice
        ? `\n\n--- 執筆アドバイス ---\n■ 一次性: ${theme.advice.primary ?? ""}\n■ 普遍性: ${theme.advice.universal ?? ""}\n■ 深掘り: ${theme.advice.depth ?? ""}`
        : "";
      const outlineText = theme.articleOutline
        ? `\n\n--- 記事の構成案 ---\n導入: ${theme.articleOutline.hook ?? ""}\n${(theme.articleOutline.sections ?? []).map((s, i) => `${i + 1}. ${s}`).join("\n")}\n締め: ${theme.articleOutline.closing ?? ""}`
        : "";
      const result = await createTheme(theme.title, desc + adviceText + outlineText);
      if (result.success) {
        // pastThemeTitlesに蓄積
        const gp = loadGlobalProfile();
        if (gp) {
          const titles = gp.pastThemeTitles ?? [];
          if (!titles.includes(theme.title)) {
            gp.pastThemeTitles = [...titles, theme.title];
            saveGlobalProfile(gp);
          }
        }
        router.replace(`/themes/${result.data.id}`);
        showToast("テーマを保存しました");
      } else {
        setError(result.error);
      }
    } catch {
      setError("テーマの保存に失敗しました");
    } finally {
      setSavingTheme(false);
    }
  };

  // 別の角度で探索（テーマ結果画面からの再探索）
  const handleExploreAnother = async () => {
    // 状態を完全リセットしてウェルカム経由で新セッション
    setSelectedTheme(null);
    setSuggestedThemes(null);
    setMessages([]);
    setDiscoveryProgress(-1);
    setStarted(false);
    setError(null);
  };

  const handleResetProfile = () => {
    clearGlobalProfile();
    setSessionProfile(null);
    setShowProfileReset(false);
    // セッションも全削除
    saveSessions([]);
    setPastSessions([]);
    // メモもクリア
    saveMemos([]);
    setMemos([]);
  };

  const handleBackFromDetail = () => {
    setSelectedTheme(null);
    setShowRefine(false);
    setRefineInput("");
    setError(null);
  };

  // テーマメモ追加
  const handleAddMemo = () => {
    if (!memoInput.trim()) return;
    const newMemo: ThemeMemo = {
      id: `memo-${Date.now()}`,
      text: memoInput.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newMemo, ...memos];
    setMemos(updated);
    saveMemos(updated);
    setMemoInput("");
    setShowMemoForm(false);
  };

  const handleDeleteMemo = (id: string) => {
    const updated = memos.filter((m) => m.id !== id);
    setMemos(updated);
    saveMemos(updated);
  };

  // テーマ磨き込み
  const handleRefineTheme = async () => {
    if (!refineInput.trim() || !selectedTheme) return;
    setRefining(true);
    setError(null);
    try {
      const res = await fetch("/api/theme-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `テーマ「${selectedTheme.title}」を以下の要望で磨き込んでください: ${refineInput}` },
          ],
          userProfile: sessionProfile,
          refineMode: true,
          originalTheme: selectedTheme,
        }),
      });
      if (!res.ok) {
        throw new Error(`サーバーエラー (${res.status})`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.suggestedThemes && data.suggestedThemes.length > 0) {
        const refined = data.suggestedThemes[0];
        setSelectedTheme(refined);
        // suggestedThemes内の該当テーマも更新
        if (suggestedThemes) {
          const idx = suggestedThemes.findIndex((t) => t.title === selectedTheme.title);
          if (idx >= 0) {
            const updated = [...suggestedThemes];
            updated[idx] = refined;
            setSuggestedThemes(updated);
          }
        }
      } else {
        throw new Error("磨き込み結果を取得できませんでした");
      }
      setRefineInput("");
      setShowRefine(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "磨き込みに失敗しました");
    } finally {
      setRefining(false);
    }
  };

  // --- ヘルパー: editorNotes処理 ---
  const processEditorNotes = (editorNotes: { strengths?: string; pattern?: string; nextSuggestion?: string; topicArea?: string }) => {
    const gp = loadGlobalProfile() ?? {};
    const notes = gp.editorNotes ?? [];
    if (editorNotes.strengths) {
      notes.push(`強み: ${editorNotes.strengths}`);
      gp.writerStrengths = editorNotes.strengths;
    }
    if (editorNotes.pattern) {
      notes.push(`観察: ${editorNotes.pattern}`);
    }
    if (editorNotes.nextSuggestion) {
      notes.push(`次回の提案: ${editorNotes.nextSuggestion}`);
    }
    gp.editorNotes = notes.slice(-6);
    if (editorNotes.topicArea) {
      const areas = gp.topicAreas ?? [];
      if (!areas.includes(editorNotes.topicArea)) {
        areas.push(editorNotes.topicArea);
      }
      gp.topicAreas = areas;
    }
    saveGlobalProfile(gp as UserProfile);
  };

  // --- Derived data (useMemo) ---
  const activeSessions = useMemo(() => pastSessions.filter((s) => !s.completed), [pastSessions]);
  const profileCompleteness = useMemo(() => {
    if (!sessionProfile) return 0;
    let score = 0;
    if (sessionProfile.occupation) score += 25;
    if (sessionProfile.interests && sessionProfile.interests.length > 0) score += 20;
    if (sessionProfile.expertise && sessionProfile.expertise.length > 0) score += 20;
    if (sessionProfile.uniqueExperiences && sessionProfile.uniqueExperiences.length > 0) score += 20;
    if (sessionProfile.consultedTopics && sessionProfile.consultedTopics.length > 0) score += 15;
    return score;
  }, [sessionProfile]);
  const discoveredThemes = useMemo(() => getDiscoveredThemes(pastSessions), [pastSessions]);

  // --- テーマ詳細ビュー ---
  if (selectedTheme) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="border-border bg-card/80 sticky top-0 z-50 border-b backdrop-blur-md">
          <div className="pen-container flex h-14 items-center gap-3">
            <button
              onClick={handleBackFromDetail}
              className="text-muted-foreground hover:text-foreground rounded-lg p-2.5 transition-colors"
              aria-label="戻る"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-bold">テーマ詳細</h1>
          </div>
        </header>

        <main className="pen-fade-in flex-1 overflow-y-auto px-4 py-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto max-w-lg">
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-bold leading-snug">
                {selectedTheme.title}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {selectedTheme.description}
              </p>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span>切り口: {selectedTheme.angle}</span>
                <span>想定読者: {selectedTheme.readers}</span>
              </div>
              {selectedTheme.scores && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${scoreBadgeColor(selectedTheme.scores.primary)}`}>
                    一次性 {selectedTheme.scores.primary}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${scoreBadgeColor(selectedTheme.scores.universal)}`}>
                    普遍性 {selectedTheme.scores.universal}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${scoreBadgeColor(selectedTheme.scores.depth)}`}>
                    深掘り {selectedTheme.scores.depth}
                  </span>
                </div>
              )}
            </div>

            {selectedTheme.advice && (
              <div className="mb-6 space-y-4">
                <h3 className="text-sm font-bold">
                  3つの条件を満たすための執筆アドバイス
                </h3>
                {[
                  { key: "primary" as const, label: "一次性", sub: "あなたにしか書けない情報" },
                  { key: "universal" as const, label: "普遍性", sub: "繰り返し検索されるニーズ" },
                  { key: "depth" as const, label: "深掘り", sub: "ひとつのテーマを徹底的に" },
                ].map(({ key, label, sub }) => (
                  <div key={key} className="border-border rounded-xl border p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreBadgeColor(selectedTheme.scores?.[key])}`}>
                        {label} {selectedTheme.scores?.[key]}
                      </span>
                      <span className="text-xs font-medium">{sub}</span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {selectedTheme.advice?.[key]}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* 記事の構成案 */}
            {selectedTheme.articleOutline && (
              <div className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <ListOrdered className="h-4 w-4" />
                  記事の構成案
                </h3>
                <div className="border-border bg-muted/30 rounded-xl border p-4 space-y-3">
                  {/* 導入 */}
                  {selectedTheme.articleOutline.hook && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1">導入</p>
                      <p className="text-sm leading-relaxed italic">
                        {selectedTheme.articleOutline.hook}
                      </p>
                    </div>
                  )}
                  {/* 本文セクション */}
                  {selectedTheme.articleOutline.sections && selectedTheme.articleOutline.sections.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">本文</p>
                      <ol className="space-y-1.5">
                        {selectedTheme.articleOutline.sections.map((section, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="bg-muted text-muted-foreground mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{section}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {/* 締め */}
                  {selectedTheme.articleOutline.closing && (
                    <div>
                      <p className="text-[10px] font-bold text-green-600 dark:text-green-400 mb-1">締め</p>
                      <p className="text-sm leading-relaxed">
                        {selectedTheme.articleOutline.closing}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* テーマ磨き込み */}
            <div className="mb-6">
              {!showRefine ? (
                <button
                  onClick={() => setShowRefine(true)}
                  className="pen-btn pen-btn-ghost flex w-full items-center justify-center gap-2 text-sm"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  テーマを磨き込む
                </button>
              ) : (
                <div className="border-border rounded-xl border p-4">
                  <p className="text-muted-foreground mb-2 text-xs">
                    どのように磨き込みたいですか？例: 「初心者向けにしたい」「切り口を変えたい」
                  </p>
                  <div className="flex gap-2">
                    <textarea
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !refining) { e.preventDefault(); handleRefineTheme(); } }}
                      placeholder="例: もっと実践的な内容にしたい"
                      className="pen-input flex-1 text-sm"
                      rows={2}
                      autoFocus
                      disabled={refining}
                    />
                    <button
                      onClick={handleRefineTheme}
                      disabled={refining || !refineInput.trim()}
                      className="pen-btn pen-btn-primary shrink-0 px-3"
                    >
                      {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </button>
                  </div>
                  {error && (
                    <p className="text-danger mt-2 text-xs">{error}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pb-4">
              <button
                onClick={handleBackFromDetail}
                className="pen-btn pen-btn-ghost flex-1 py-2.5 text-sm"
              >
                他のテーマ候補へ
              </button>
              <button
                onClick={handleExploreAnother}
                disabled={sending}
                className="pen-btn pen-btn-ghost flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                再探索
              </button>
            </div>
          </div>
        </main>

        {/* Sticky CTA */}
        <div className="border-border bg-card/90 sticky bottom-0 z-40 border-t px-4 py-3 backdrop-blur-md" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto max-w-lg">
            {user ? (
              <button
                onClick={() => handleSaveTheme(selectedTheme)}
                disabled={savingTheme}
                className="pen-btn pen-btn-accent flex w-full items-center justify-center gap-2 py-3 text-base font-bold"
              >
                {savingTheme ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {savingTheme ? "保存中..." : "このテーマで記事を書く"}
              </button>
            ) : (
              <button
                onClick={() => handleSaveTheme(selectedTheme)}
                className="pen-btn pen-btn-accent flex w-full items-center justify-center gap-2 py-3 text-base font-bold"
              >
                <UserPlus className="h-5 w-5" />
                登録してこのテーマで書く
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- ウェルカム画面 ---
  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="border-border bg-card/80 sticky top-0 z-50 border-b backdrop-blur-md">
          <div className="pen-container flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <Pen className="h-5 w-5" />
              <span>pen</span>
            </Link>
            {!authLoading && !user && (
              <Link href="/login" className="pen-btn pen-btn-primary text-sm">ログイン</Link>
            )}
          </div>
        </header>

        <main className="flex flex-1 justify-center overflow-y-auto px-4 py-6">
          <div className="pen-fade-in w-full max-w-md self-center text-center">
            {/* --- リピーター向け: プロファイル表示 + 高速スタート --- */}
            {isReturning ? (
              <>
                <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                  <User className="h-8 w-8" />
                </div>
                <h1 className="mb-2 text-xl font-bold tracking-tight">
                  おかえりなさい！
                </h1>
                <p className="text-muted-foreground mb-4 text-sm">
                  {sessionProfile?.sessionCount && sessionProfile.sessionCount >= 3
                    ? `${sessionProfile.sessionCount - 1}回の探索で${discoveredThemes.length}つのテーマを発見。さらに新しいテーマを探しましょう`
                    : "前回の情報を元に、新しいテーマを探索しましょう"}
                </p>

                {/* 成長統計バー */}
                {(discoveredThemes.length > 0 || profileCompleteness > 0) && (
                  <div className="bg-muted mb-5 flex gap-4 rounded-xl p-3">
                    <div className="flex-1 text-center">
                      <p className="text-lg font-bold">{discoveredThemes.length}</p>
                      <p className="text-muted-foreground text-[10px]">発見テーマ</p>
                    </div>
                    <div className="border-border border-l" />
                    <div className="flex-1 text-center">
                      <p className="text-lg font-bold">{sessionProfile?.sessionCount ? sessionProfile.sessionCount - 1 : 0}</p>
                      <p className="text-muted-foreground text-[10px]">探索回数</p>
                    </div>
                    <div className="border-border border-l" />
                    <div className="flex-1 text-center">
                      <p className="text-lg font-bold">{profileCompleteness}%</p>
                      <p className="text-muted-foreground text-[10px]">プロフィール</p>
                    </div>
                  </div>
                )}

                {/* プロファイルサマリー */}
                <div className="bg-muted mb-5 rounded-xl p-4 text-left">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold">あなたのプロフィール</p>
                    <button
                      onClick={() => setShowProfileReset(!showProfileReset)}
                      className="text-muted-foreground hover:text-foreground text-[10px] transition-colors"
                    >
                      {showProfileReset ? "キャンセル" : "リセット"}
                    </button>
                  </div>

                  {showProfileReset ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs">
                        プロフィール・探索履歴をすべて削除しますか？
                      </p>
                      <button
                        onClick={handleResetProfile}
                        className="pen-btn pen-btn-ghost w-full border-red-200 py-2 text-xs text-red-500 dark:border-red-800"
                      >
                        <Trash2 className="mr-1 inline h-3 w-3" />
                        すべてリセット
                      </button>
                    </div>
                  ) : (
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      {sessionProfile?.occupation && (
                        <li className="flex items-start gap-2">
                          <Briefcase className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="break-all">{sessionProfile.occupation}</span>
                        </li>
                      )}
                      {sessionProfile?.interests && sessionProfile.interests.length > 0 && (
                        <li className="flex items-start gap-2">
                          <Star className="mt-0.5 h-3 w-3 shrink-0" />
                          {sessionProfile.interests.join("、")}
                        </li>
                      )}
                      {sessionProfile?.expertise && sessionProfile.expertise.length > 0 && (
                        <li className="flex items-start gap-2">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" />
                          {sessionProfile.expertise.join("、")}
                        </li>
                      )}
                      {sessionProfile?.uniqueExperiences && sessionProfile.uniqueExperiences.length > 0 && (
                        <li className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                          {sessionProfile.uniqueExperiences.join("、")}
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* 編集者のインサイト */}
                {sessionProfile?.writerStrengths && (
                  <div className="bg-card border-border mb-4 rounded-xl border p-4 text-left">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold">
                      <Sparkles className="h-3.5 w-3.5" />
                      編集者があなたに気づいたこと
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {sessionProfile.writerStrengths}
                    </p>
                  </div>
                )}

                {/* 探索マップ */}
                {sessionProfile?.topicAreas && sessionProfile.topicAreas.length > 0 && (
                  <div className="bg-card border-border mb-5 rounded-xl border p-4 text-left">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold">
                      <Search className="h-3.5 w-3.5" />
                      探索マップ
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {sessionProfile.topicAreas.map((area) => (
                        <span
                          key={area}
                          className="bg-muted rounded-full px-2.5 py-1 text-[11px] font-medium"
                        >
                          {area}
                        </span>
                      ))}
                      <span className="text-muted-foreground rounded-full border border-dashed px-2.5 py-1 text-[11px]">
                        + 未開拓の領域
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={startNewSession}
                  disabled={sending}
                  className="pen-btn pen-btn-accent w-full py-3.5 text-base"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {memos.length > 0 ? `メモを元にテーマを探索する` : "新しいテーマを探索する"}
                </button>

                {/* テーマメモ（ネタ帳） */}
                <div className="mt-5 text-left">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-muted-foreground flex items-center gap-2 text-xs font-bold">
                      <Zap className="h-3.5 w-3.5" />
                      テーマメモ（ネタ帳）
                      {memos.length > 0 && (
                        <span className="text-muted-foreground font-normal">— 次回のAIが参考にします</span>
                      )}
                    </p>
                    <button
                      onClick={() => setShowMemoForm(!showMemoForm)}
                      className="text-muted-foreground hover:text-foreground text-[10px] transition-colors"
                    >
                      {showMemoForm ? "閉じる" : <><Plus className="mr-0.5 inline h-3 w-3" />追加</>}
                    </button>
                  </div>
                  {showMemoForm && (
                    <div className="mb-3 flex gap-2">
                      <input
                        type="text"
                        value={memoInput}
                        onChange={(e) => setMemoInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddMemo(); }}
                        placeholder="書いてみたいこと、気になるトピック..."
                        className="pen-input flex-1 text-sm"
                        maxLength={100}
                        autoFocus
                      />
                      <button
                        onClick={handleAddMemo}
                        disabled={!memoInput.trim()}
                        className="pen-btn pen-btn-primary shrink-0 px-3"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {memos.length > 0 ? (
                    <div className="space-y-1.5">
                      {memos.map((m) => (
                        <div
                          key={m.id}
                          className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2"
                        >
                          <Zap className="text-muted-foreground h-3 w-3 shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-xs">{m.text}</span>
                          <button
                            onClick={() => handleDeleteMemo(m.id)}
                            className="text-muted-foreground hover:text-red-500 shrink-0 p-1.5 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : !showMemoForm ? (
                    <button
                      onClick={() => setShowMemoForm(true)}
                      className="border-border hover:bg-muted flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs transition-colors"
                    >
                      <MessageSquarePlus className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">「書いてみたいこと」をメモしておくと、次のAIが参考にします</span>
                    </button>
                  ) : null}
                </div>

                {/* 発見済みテーマ一覧 */}
                {discoveredThemes.length > 0 && (
                  <div className="mt-6 text-left">
                    <p className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-bold">
                      <BookOpen className="h-3.5 w-3.5" />
                      過去に発見したテーマ（{discoveredThemes.length}件）
                    </p>
                    <div className="space-y-2">
                      {discoveredThemes.slice(0, 6).map(({ theme, date }) => (
                        <button
                          key={`${theme.title}-${date}`}
                          onClick={() => {
                            setSelectedTheme(theme);
                          }}
                          className="border-border bg-card hover:bg-muted flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{theme.title}</p>
                            <p className="text-muted-foreground mt-0.5 text-[11px]">
                              {formatRelativeTime(date)}
                            </p>
                          </div>
                          <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 途中のセッション */}
                {activeSessions.length > 0 && (
                  <div className="mt-6 text-left">
                    <p className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-bold">
                      <Clock className="h-3.5 w-3.5" />
                      途中の探索（{activeSessions.length}件）
                    </p>
                    <div className="space-y-2">
                      {activeSessions.map((s) => (
                        <SessionCard
                          key={s.sessionId}
                          session={s}
                          onResume={() => handleResume(s)}
                          onDelete={() => handleDeleteSession(s.sessionId)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* --- 初回ユーザー向け --- */
              <>
                <div className="bg-muted mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
                  <Search className="h-10 w-10" />
                </div>
                <h1 className="mb-3 text-2xl font-bold tracking-tight">
                  あなたの「書くべきテーマ」をAI編集者が見つけます
                </h1>
                <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                  noteで長く読まれる記事には共通点があります。AI編集者との短い対話で、あなたの経験の中に眠っている最高のテーマを一緒に発掘しましょう。
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
                  onClick={startNewSession}
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
              </>
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
          <button
            onClick={() => {
              // 会話途中の場合は確認ダイアログを表示
              if (messages.length > 0 && !chatEnded) {
                if (!window.confirm("探索を中断しますか？ 現在のセッションは保存されます。")) return;
                // 中間セッションを保存
                if (currentSessionId) {
                  saveCurrentSession(messages, discoveryProgress, suggestedThemes, sessionProfile, currentSessionId, false);
                }
              }
              setStarted(false);
              setMessages([]);
              setSuggestedThemes(null);
              setSelectedTheme(null);
              setDiscoveryProgress(-1);
              setError(null);
            }}
            className="text-muted-foreground hover:text-foreground rounded-lg p-2.5 transition-colors"
            aria-label="戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight">テーマ探索</h1>
            {discoveryProgress >= 0 && (
              <p className="text-muted-foreground text-[11px] leading-tight">
                {progressInfo.label}
              </p>
            )}
          </div>
        </div>
        {discoveryProgress >= 0 && (
          <div className="discover-progress-wrapper">
            <div
              className="discover-progress-track"
              role="progressbar"
              aria-valuenow={Math.min(discoveryProgress, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`テーマ探索進捗: ${Math.min(discoveryProgress, 100)}%`}
            >
              <div
                className={`discover-progress-fill ${progressInfo.color}`}
                style={{ width: `${Math.min(discoveryProgress, 100)}%` }}
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
            <div className={msg.role === "user" ? "pen-bubble-user" : "pen-bubble-ai"}>
              {msg.role === "assistant" && msg.content === "" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">考えています<span className="inline-block w-6 text-left"><span className="animate-pulse">...</span></span></span>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.role === "assistant" ? normalizeLineBreaks(msg.content) : msg.content}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* テーマ提案カード */}
        {chatEnded && suggestedThemes && (
          <div className="discover-themes-area">
            <p className="mb-3 text-center text-xs font-bold">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              あなたにおすすめのテーマ
            </p>
            <p className="text-muted-foreground mb-4 text-center text-[11px]">
              タップして執筆アドバイスを確認
            </p>
            <div className="space-y-3" role="group" aria-label="提案されたテーマ候補">
              {suggestedThemes.map((theme, i) => (
                <button
                  key={i}
                  onClick={() => handleThemeCardClick(theme)}
                  className="discover-theme-card"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-accent/10 text-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <h3 className="text-sm font-bold leading-snug">{theme.title}</h3>
                    </div>
                    <ArrowRight className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  </div>
                  <p className="text-muted-foreground mb-1.5 text-xs leading-relaxed">
                    {theme.description}
                  </p>
                  {theme.scores && (
                    <div className="flex gap-2 text-[10px]">
                      <span className={`rounded-full px-1.5 py-0.5 font-medium ${scoreBadgeColor(theme.scores.primary)}`}>
                        一次性{theme.scores.primary}
                      </span>
                      <span className={`rounded-full px-1.5 py-0.5 font-medium ${scoreBadgeColor(theme.scores.universal)}`}>
                        普遍性{theme.scores.universal}
                      </span>
                      <span className={`rounded-full px-1.5 py-0.5 font-medium ${scoreBadgeColor(theme.scores.depth)}`}>
                        深掘り{theme.scores.depth}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* 別の角度で探索ボタン */}
            <div className="mt-5 text-center">
              <button
                onClick={handleExploreAnother}
                disabled={sending}
                className="pen-btn pen-btn-ghost inline-flex items-center gap-2 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                別の角度でテーマを探索する
              </button>
            </div>
          </div>
        )}

        {sending && !messages.some(m => m.role === "assistant" && m.content === "") && (
          <div className="discover-msg-wrapper discover-msg-ai">
            <div className="discover-avatar">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="pen-bubble-ai">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground text-sm">考えています<span className="inline-block w-6 text-left"><span className="animate-pulse">...</span></span></span>
              </div>
            </div>
          </div>
        )}

        {error && !sending && (
          <div className="px-4 py-3 text-center">
            <p className="text-danger mb-2 text-xs">{error}</p>
            <button
              onClick={async () => {
                setError(null);
                if (currentSessionId) {
                  setSending(true);
                  // ゴーストAIメッセージを除外してリトライ
                  const cleanMessages = messages.filter(m => m.role !== "assistant" || m.content !== "");
                  await fetchAI(cleanMessages, currentSessionId, sessionProfile);
                  setSending(false);
                }
              }}
              className="pen-btn pen-btn-ghost text-xs"
              aria-label="再試行"
            >
              <RotateCcw className="mr-1 inline h-3 w-3" />
              再試行
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 入力エリア（テーマ提案後は非表示） */}
      {!chatEnded && (
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
              placeholder={sending ? "AIが考え中..." : "メッセージを入力..."}
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
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>
        </div>
      )}
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
          <span>{session.completed ? "完了" : `${userMsgs.length}回のやりとり`}</span>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {!session.completed && (
          <button
            onClick={onResume}
            className="text-muted-foreground hover:text-foreground rounded p-2 transition-colors"
            title="続きから再開"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-muted-foreground hover:text-red-500 rounded p-2 transition-colors"
          title="削除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
