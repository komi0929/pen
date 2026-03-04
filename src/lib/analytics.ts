"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * サーバーサイドイベントトラッキング
 * SERVER_ROLE_KEY を使用して RLS をバイパスし、確実に記録する
 */
export async function trackEvent(
  eventName: string,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  try {
    // ユーザーIDを取得（通常クライアントから）
    const supabase = await createClient();
    let userId: string | null = null;
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }

    // SERVICE_ROLE でINSERT（RLSバイパス）
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("analytics_events") as any).insert({
      user_id: userId,
      event_name: eventName,
      event_data: eventData,
    });
  } catch {
    // ログ失敗はサイレントに処理（本体処理を止めない）
    console.error(`[Analytics] Failed to track event: ${eventName}`);
  }
}
