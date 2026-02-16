"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export interface DailyKPI {
  day: string;
  event_name: string;
  event_count: number;
  unique_users: number;
}

export interface KPISummary {
  today: Record<string, { count: number; users: number }>;
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
 * 昨日 vs 一昨日 の比較データを返す
 */
export async function getKPISummary(): Promise<ActionResult<KPISummary>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    // 日本時間での「今日」「昨日」「一昨日」を計算
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = jst.toISOString().split("T")[0];
    const yesterday = new Date(jst.getTime() - 86400000);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // 2日分のデータを取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("analytics_events") as any)
      .select("event_name, user_id, created_at")
      .gte("created_at", yesterdayStr + "T00:00:00+09:00")
      .lte("created_at", todayStr + "T23:59:59+09:00");

    if (error) throw error;

    const events = (data ?? []) as {
      event_name: string;
      user_id: string | null;
      created_at: string;
    }[];

    // 日付ごと・イベントごとに集計
    const aggregate = (dayStr: string) => {
      const dayEvents = events.filter((e) => {
        const d = new Date(e.created_at);
        const dJst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        return dJst.toISOString().split("T")[0] === dayStr;
      });

      const result: Record<string, { count: number; users: number }> = {};
      const byEvent: Record<string, Set<string>> = {};

      for (const e of dayEvents) {
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

    const todayData = aggregate(todayStr);
    const yesterdayData = aggregate(yesterdayStr);

    // ファネル（昨日のデータ）
    const funnelSteps = [
      { step: "login_completed", label: "ログイン" },
      { step: "theme_created", label: "テーマ作成" },
      { step: "memo_created", label: "メモ追加" },
      { step: "interview_started", label: "インタビュー開始" },
      { step: "interview_completed", label: "インタビュー完了" },
      { step: "article_copied", label: "記事コピー" },
    ];

    const funnel = funnelSteps.map((s, i) => {
      const count = todayData[s.step]?.users ?? 0;
      const prev =
        i > 0 ? (todayData[funnelSteps[i - 1].step]?.users ?? 0) : null;
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
        today: todayData,
        yesterday: yesterdayData,
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
