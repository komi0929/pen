"use server";

import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Memo } from "@/types";

export async function getMemos(themeId: string): Promise<ActionResult<Memo[]>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .eq("theme_id", themeId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, data: (data ?? []) as unknown as Memo[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "メモの取得に失敗しました",
    };
  }
}

export async function createMemo(
  themeId: string,
  content: string
): Promise<ActionResult<Memo>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("memos") as any)
      .insert({ theme_id: themeId, user_id: user.id, content })
      .select()
      .single();

    if (error) throw error;
    trackEvent("memo_created", { theme_id: themeId, memo_id: data.id });
    return { success: true, data: data as unknown as Memo };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "メモの追加に失敗しました",
    };
  }
}

export async function deleteMemo(memoId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { error } = await supabase.from("memos").delete().eq("id", memoId);

    if (error) throw error;
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "メモの削除に失敗しました",
    };
  }
}
