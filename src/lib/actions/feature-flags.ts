"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
  updated_at: string;
}

/**
 * 全Feature Flagを取得
 */
export async function getFeatureFlags(): Promise<ActionResult<FeatureFlag[]>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("key");

    if (error) throw error;
    return { success: true, data: (data ?? []) as FeatureFlag[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "フラグの取得に失敗しました",
    };
  }
}

/**
 * 特定のFeature Flagの状態を取得
 */
export async function getFeatureFlag(key: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    if (!supabase) return true; // フォールバック: 有効

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("feature_flags") as any)
      .select("enabled")
      .eq("key", key)
      .single();

    if (error || !data) return true;
    return (data as { enabled: boolean }).enabled;
  } catch {
    return true; // フォールバック: 有効
  }
}

/**
 * Feature Flagの有効/無効を切り替え
 */
export async function toggleFeatureFlag(
  key: string,
  enabled: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("feature_flags") as any)
      .update({
        enabled,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("key", key);

    if (error) throw error;
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "フラグの更新に失敗しました",
    };
  }
}
