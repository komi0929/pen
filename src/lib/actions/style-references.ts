"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export interface StyleReference {
  id: string;
  user_id: string;
  label: string;
  source_text: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** ユーザーの全文体リファレンスを取得 */
export async function getStyleReferences(): Promise<
  ActionResult<StyleReference[]>
> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "Supabase未接続" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("style_references") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as StyleReference[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "不明なエラー",
    };
  }
}

/** 文体リファレンスを1件取得 */
export async function getStyleReference(
  id: string
): Promise<ActionResult<StyleReference>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "Supabase未接続" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("style_references") as any)
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as StyleReference };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "不明なエラー",
    };
  }
}

/** 文体リファレンスを作成 */
export async function createStyleReference(
  label: string,
  sourceText: string,
  isDefault: boolean = false
): Promise<ActionResult<StyleReference>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "Supabase未接続" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // デフォルト設定する場合、既存のデフォルトを解除
    if (isDefault) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("style_references") as any)
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_default", true);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("style_references") as any)
      .insert({
        user_id: user.id,
        label,
        source_text: sourceText,
        is_default: isDefault,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as StyleReference };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "不明なエラー",
    };
  }
}

/** 文体リファレンスを更新 */
export async function updateStyleReference(
  id: string,
  label: string,
  sourceText: string,
  isDefault: boolean
): Promise<ActionResult<StyleReference>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "Supabase未接続" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // デフォルト設定する場合、既存のデフォルトを解除
    if (isDefault) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("style_references") as any)
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_default", true)
        .neq("id", id);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("style_references") as any)
      .update({
        label,
        source_text: sourceText,
        is_default: isDefault,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as StyleReference };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "不明なエラー",
    };
  }
}

/** 文体リファレンスを削除 */
export async function deleteStyleReference(
  id: string
): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "Supabase未接続" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("style_references") as any)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "不明なエラー",
    };
  }
}
