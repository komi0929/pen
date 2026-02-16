"use client";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import type { KPISummary } from "@/lib/actions/admin";
import { getKPISummary } from "@/lib/actions/admin";
import type { FeatureFlag } from "@/lib/actions/feature-flags";
import {
  getFeatureFlags,
  toggleFeatureFlag,
} from "@/lib/actions/feature-flags";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Eye,
  FileText,
  Globe,
  Lock,
  Minus,
  Settings2,
  Timer,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ===== GA型定義 =====
interface GAOverview {
  pageViews: number;
  activeUsers: number;
  sessions: number;
  newUsers: number;
  avgSessionDuration: number;
}

interface GATopPage {
  path: string;
  pageViews: number;
  activeUsers: number;
}

interface GAReport {
  overview: GAOverview;
  overviewYesterday: GAOverview;
  topPages: GATopPage[];
}

// ===== 管理者コード入力画面 =====
function AdminCodeGate({ onAuth }: { onAuth: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === "0929") {
      onAuth(code);
    } else {
      setError("管理者コードが正しくありません");
      setCode("");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center">
        <div className="pen-fade-in w-full max-w-sm px-4">
          <div className="border-border bg-card rounded-2xl border p-8 text-center">
            <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Lock className="text-muted-foreground h-6 w-6" />
            </div>
            <h1 className="mb-1 text-xl font-bold">管理者ダッシュボード</h1>
            <p className="text-muted-foreground mb-6 text-sm">
              管理者コードを入力してください
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                placeholder="管理者コード"
                className="border-border bg-background mb-3 w-full rounded-lg border px-4 py-2.5 text-center text-lg tracking-widest focus:ring-2 focus:ring-black/10 focus:outline-none"
                autoFocus
              />
              {error && (
                <p className="mb-3 text-sm font-medium text-red-500">{error}</p>
              )}
              <button
                type="submit"
                className="bg-foreground text-background w-full rounded-lg px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-80"
              >
                ログイン
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ===== ダッシュボード本体 =====
function AdminDashboardContent({ adminCode }: { adminCode: string }) {
  const [kpi, setKpi] = useState<KPISummary | null>(null);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [gaReport, setGaReport] = useState<GAReport | null>(null);
  const [gaError, setGaError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Supabase KPI + Feature Flags
    const [kpiResult, flagsResult] = await Promise.all([
      getKPISummary(),
      getFeatureFlags(),
    ]);
    if (kpiResult.success) setKpi(kpiResult.data);
    if (flagsResult.success) setFlags(flagsResult.data);

    // GA Data API
    try {
      const res = await fetch("/api/admin/ga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: adminCode }),
      });
      const json = await res.json();
      if (json.success) {
        setGaReport(json.data); // null = GA未設定
      } else {
        setGaError(json.error);
      }
    } catch {
      setGaError("GA データの取得に失敗しました");
    }

    setLoading(false);
  }, [adminCode]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (key: string, currentEnabled: boolean) => {
    setTogglingKey(key);
    const result = await toggleFeatureFlag(key, !currentEnabled);
    if (result.success) {
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
      );
    }
    setTogglingKey(null);
  };

  // KPIカードの差分表示
  const renderDelta = (today: number, yesterday: number) => {
    const diff = today - yesterday;
    if (diff > 0)
      return (
        <span className="flex items-center gap-0.5 text-xs font-bold text-green-600">
          <ArrowUp className="h-3 w-3" />+{diff}
        </span>
      );
    if (diff < 0)
      return (
        <span className="flex items-center gap-0.5 text-xs font-bold text-red-500">
          <ArrowDown className="h-3 w-3" />
          {diff}
        </span>
      );
    return (
      <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
        <Minus className="h-3 w-3" />0
      </span>
    );
  };

  // 秒数をフォーマット
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
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

  const summaryCards = [
    { label: "ログイン", key: "login_completed" },
    { label: "テーマ作成", key: "theme_created" },
    { label: "メモ追加", key: "memo_created" },
    { label: "インタビュー開始", key: "interview_started" },
    { label: "インタビュー完了", key: "interview_completed" },
    { label: "記事コピー", key: "article_copied" },
  ];

  const gaCards = gaReport
    ? [
        {
          label: "ページビュー",
          icon: Eye,
          today: gaReport.overview.pageViews,
          yesterday: gaReport.overviewYesterday.pageViews,
        },
        {
          label: "アクティブユーザー",
          icon: Users,
          today: gaReport.overview.activeUsers,
          yesterday: gaReport.overviewYesterday.activeUsers,
        },
        {
          label: "セッション",
          icon: Globe,
          today: gaReport.overview.sessions,
          yesterday: gaReport.overviewYesterday.sessions,
        },
        {
          label: "新規ユーザー",
          icon: UserPlus,
          today: gaReport.overview.newUsers,
          yesterday: gaReport.overviewYesterday.newUsers,
        },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-14 pb-8">
          <div className="mb-8 flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-2xl font-bold">ダッシュボード</h1>
          </div>

          {/* ===== GA サイト概要 ===== */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <TrendingUp className="h-5 w-5" />
              Google Analytics
              <span className="text-muted-foreground text-sm font-normal">
                （今日 vs 昨日）
              </span>
            </h2>
            {gaReport ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {gaCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="border-border bg-card rounded-xl border p-4"
                      >
                        <div className="text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-xs">{card.label}</span>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold">
                            {card.today.toLocaleString()}
                          </span>
                          {renderDelta(card.today, card.yesterday)}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          昨日: {card.yesterday.toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* 滞在時間 */}
                <div className="border-border bg-card mb-4 flex items-center gap-4 rounded-xl border px-5 py-3">
                  <Timer className="text-muted-foreground h-4 w-4" />
                  <div>
                    <p className="text-muted-foreground text-xs">
                      平均セッション時間
                    </p>
                    <p className="font-bold">
                      {formatDuration(gaReport.overview.avgSessionDuration)}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-muted-foreground text-xs">昨日</p>
                    <p className="text-sm">
                      {formatDuration(
                        gaReport.overviewYesterday.avgSessionDuration
                      )}
                    </p>
                  </div>
                </div>

                {/* ページ別PVランキング */}
                {gaReport.topPages.length > 0 && (
                  <div className="border-border bg-card overflow-hidden rounded-xl border">
                    <div className="border-border flex items-center gap-2 border-b px-5 py-3">
                      <FileText className="text-muted-foreground h-4 w-4" />
                      <h3 className="text-sm font-bold">
                        ページ別PV（Top {gaReport.topPages.length}）
                      </h3>
                    </div>
                    <div className="divide-border divide-y">
                      {gaReport.topPages.map((page, i) => (
                        <div
                          key={page.path}
                          className="flex items-center gap-3 px-5 py-2.5"
                        >
                          <span className="text-muted-foreground w-5 text-right text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {page.path}
                          </span>
                          <span className="text-sm font-bold">
                            {page.pageViews.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            PV
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : gaError ? (
              <div className="border-border bg-card rounded-xl border px-5 py-6 text-center">
                <p className="text-muted-foreground text-sm">{gaError}</p>
              </div>
            ) : (
              <div className="border-border bg-card rounded-xl border px-5 py-6 text-center">
                <p className="text-muted-foreground text-sm">
                  Google Analytics 未設定
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  .env.local に GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY
                  を設定してください
                </p>
              </div>
            )}
          </section>

          {/* ===== 自前KPIサマリーカード ===== */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              📊 アプリ内KPI
              <span className="text-muted-foreground text-sm font-normal">
                （今日 vs 昨日）
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {summaryCards.map((card) => {
                const todayVal = kpi?.today[card.key]?.users ?? 0;
                const yesterdayVal = kpi?.yesterday[card.key]?.users ?? 0;
                return (
                  <div
                    key={card.key}
                    className="border-border bg-card rounded-xl border p-4"
                  >
                    <p className="text-muted-foreground mb-1 text-xs">
                      {card.label}
                    </p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">{todayVal}</span>
                      {renderDelta(todayVal, yesterdayVal)}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      昨日: {yesterdayVal}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===== ファネル ===== */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              🔽 ファネル
              <span className="text-muted-foreground text-sm font-normal">
                （今日のステップ通過率）
              </span>
            </h2>
            <div className="border-border bg-card overflow-hidden rounded-xl border">
              {kpi?.funnel.map((step, i) => {
                const maxCount = Math.max(
                  ...((kpi?.funnel ?? []).map((s) => s.count) ?? [1]),
                  1
                );
                const barWidth =
                  maxCount > 0 ? (step.count / maxCount) * 100 : 0;
                return (
                  <div
                    key={step.step}
                    className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? "border-border border-t" : ""}`}
                  >
                    <div className="w-36 shrink-0">
                      <p className="text-sm font-bold">{step.label}</p>
                      {step.rate !== null && (
                        <p className="text-muted-foreground text-xs">
                          通過率: {step.rate}%
                        </p>
                      )}
                    </div>
                    <div className="bg-muted relative h-6 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-accent h-full rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-bold">
                      {step.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===== Feature Flags ===== */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Settings2 className="h-5 w-5" />
              Feature Flags
            </h2>
            <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-xl border">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-bold">{flag.key}</p>
                    <p className="text-muted-foreground text-xs">
                      {flag.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle(flag.key, flag.enabled)}
                    disabled={togglingKey === flag.key}
                    className={`transition-colors ${
                      flag.enabled
                        ? "text-green-600 hover:text-green-700"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {flag.enabled ? (
                      <ToggleRight className="h-8 w-8" />
                    ) : (
                      <ToggleLeft className="h-8 w-8" />
                    )}
                  </button>
                </div>
              ))}
              {flags.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    Feature Flagが登録されていません
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ===== ページコンポーネント =====
export default function AdminDashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  // sessionStorageから復帰
  useEffect(() => {
    const saved = sessionStorage.getItem("pen_admin_code");
    if (saved === "0929") {
      setAuthed(true);
      setAdminCode(saved);
    }
  }, []);

  const handleAuth = (code: string) => {
    sessionStorage.setItem("pen_admin_code", code);
    setAdminCode(code);
    setAuthed(true);
  };

  if (!authed) {
    return <AdminCodeGate onAuth={handleAuth} />;
  }

  return <AdminDashboardContent adminCode={adminCode} />;
}
