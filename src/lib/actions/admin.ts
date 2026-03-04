"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

export interface KPISummary {
  total: Record<string, { count: number; users: number }>;
  yesterday: Record<string, { count: number; users: number }>;
  funnel: {
    step: string;
    label: string;
    count: number;
    rate: number | null;
  }[];
}

/**
 * ダッシュボード用のKPIサマリーを取得
 * 累計 + 昨日 の比較データを返す
 * SERVICE_ROLE_KEY で RLS をバイパスして全データを取得
 */
export async function getKPISummary(): Promise<ActionResult<KPISummary>> {
  try {
    const admin = createAdminClient();

    // 日本時間での「昨日」を計算
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const yesterday = new Date(jst.getTime() - 86400000);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // 全データを取得（累計用）
    const { data: allData, error: allError } =
      await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin.from("analytics_events") as any).select(
        "event_name, user_id, created_at"
      );

    if (allError) throw allError;

    // 昨日のデータのみ取得
    const { data: yesterdayData, error: ydError } =
      await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin.from("analytics_events") as any)
        .select("event_name, user_id, created_at")
        .gte("created_at", yesterdayStr + "T00:00:00+09:00")
        .lt("created_at", yesterdayStr + "T23:59:59+09:00");

    if (ydError) throw ydError;

    const events = (allData ?? []) as {
      event_name: string;
      user_id: string | null;
      created_at: string;
    }[];

    const yesterdayEvents = (yesterdayData ?? []) as {
      event_name: string;
      user_id: string | null;
      created_at: string;
    }[];

    // 集計関数
    const aggregate = (targetEvents: typeof events) => {
      const result: Record<string, { count: number; users: number }> = {};
      const byEvent: Record<string, Set<string>> = {};

      for (const e of targetEvents) {
        if (!result[e.event_name]) {
          result[e.event_name] = { count: 0, users: 0 };
          byEvent[e.event_name] = new Set();
        }
        result[e.event_name].count++;
        if (e.user_id) byEvent[e.event_name].add(e.user_id);
      }

      for (const [name, userSet] of Object.entries(byEvent)) {
        result[name].users = userSet.size;
      }

      return result;
    };

    const totalData = aggregate(events);
    const ydAggregated = aggregate(yesterdayEvents);

    // ファネル（累計データ）
    const funnelSteps = [
      { step: "login_completed", label: "ログイン" },
      { step: "theme_created", label: "テーマ作成" },
      { step: "memo_created", label: "メモ追加" },
      { step: "interview_started", label: "インタビュー開始" },
      { step: "interview_completed", label: "インタビュー完了" },
      { step: "article_copied", label: "記事コピー" },
    ];

    const funnel = funnelSteps.map((s, i) => {
      const count = totalData[s.step]?.users ?? 0;
      const prev =
        i > 0 ? (totalData[funnelSteps[i - 1].step]?.users ?? 0) : null;
      return {
        step: s.step,
        label: s.label,
        count,
        rate: prev && prev > 0 ? Math.round((count / prev) * 100) : null,
      };
    });

    return {
      success: true,
      data: {
        total: totalData,
        yesterday: ydAggregated,
        funnel,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "KPIの取得に失敗しました",
    };
  }
}
