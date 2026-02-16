"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

/**
 * クライアントサイドでイベントを送信
 */
export function trackClientEvent(
  eventName: string,
  eventData: Record<string, unknown> = {}
): void {
  try {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("analytics_events") as any)
        .insert({
          user_id: user?.id ?? null,
          event_name: eventName,
          event_data: eventData,
        })
        .then(() => {});
    });
  } catch {
    // サイレント
  }
}

/**
 * ページビュー計測フック
 * コンポーネントマウント時に1度だけ発火
 */
export function usePageView(
  pageName: string,
  data: Record<string, unknown> = {}
) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackClientEvent("page_view", { page: pageName, ...data });
  }, [pageName, data]);
}
