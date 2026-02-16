"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * サーバーサイドイベントトラッキング
 * Server Actions内で呼び出してイベントを記録する
 */
export async function trackEvent(
  eventName: string,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("analytics_events") as any).insert({
      user_id: user?.id ?? null,
      event_name: eventName,
      event_data: eventData,
    });
  } catch {
    // ログ失敗はサイレントに処理（本体処理を止めない）
    console.error(`[Analytics] Failed to track event: ${eventName}`);
  }
}
