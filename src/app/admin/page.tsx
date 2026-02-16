"use client";

import { AuthGuard } from "@/components/AuthGuard";
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
  Minus,
  Settings2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function AdminDashboardContent() {
  const [kpi, setKpi] = useState<KPISummary | null>(null);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [kpiResult, flagsResult] = await Promise.all([
      getKPISummary(),
      getFeatureFlags(),
    ]);
    if (kpiResult.success) setKpi(kpiResult.data);
    if (flagsResult.success) setFlags(flagsResult.data);
    setLoading(false);
  }, []);

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
    {
      label: "ログイン",
      key: "login_completed",
    },
    {
      label: "テーマ作成",
      key: "theme_created",
    },
    {
      label: "メモ追加",
      key: "memo_created",
    },
    {
      label: "インタビュー開始",
      key: "interview_started",
    },
    {
      label: "インタビュー完了",
      key: "interview_completed",
    },
    {
      label: "記事コピー",
      key: "article_copied",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-14 pb-8">
          <div className="mb-8 flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-2xl font-bold">ダッシュボード</h1>
          </div>

          {/* ===== KPIサマリーカード ===== */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              📊 今日の数字
              <span className="text-muted-foreground text-sm font-normal">
                （vs 昨日）
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

export default function AdminDashboardPage() {
  return (
    <AuthGuard>
      <AdminDashboardContent />
    </AuthGuard>
  );
}
