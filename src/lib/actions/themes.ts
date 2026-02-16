"use server";

import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Theme } from "@/types";

export async function getThemes(): Promise<ActionResult<Theme[]>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { data: themes, error } = await supabase
      .from("themes")
      .select("*, memos(count), articles(count)")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const result = (themes ?? [])
      .filter((t: any) => {
        // 記事が生成済みのテーマは除外
        const articleCount =
          Array.isArray(t.articles) && t.articles.length > 0
            ? t.articles[0].count
            : 0;
        return articleCount === 0;
      })
      .map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        title: t.title,
        description: t.description,
        created_at: t.created_at,
        updated_at: t.updated_at,
        memo_count:
          Array.isArray(t.memos) && t.memos.length > 0 ? t.memos[0].count : 0,
      })) as Theme[];

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "テーマの取得に失敗しました",
    };
  }
}

export async function getTheme(themeId: string): Promise<ActionResult<Theme>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { data, error } = await supabase
      .from("themes")
      .select("*, memos(count)")
      .eq("id", themeId)
      .single();

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    const theme: Theme = {
      id: d.id,
      user_id: d.user_id,
      title: d.title,
      description: d.description,
      created_at: d.created_at,
      updated_at: d.updated_at,
      memo_count:
        Array.isArray(d.memos) && d.memos.length > 0 ? d.memos[0].count : 0,
    };

    return { success: true, data: theme };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "テーマの取得に失敗しました",
    };
  }
}

export async function createTheme(
  title: string,
  description: string = ""
): Promise<ActionResult<Theme>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("themes") as any)
      .insert({ title, description, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    trackEvent("theme_created", { theme_id: data.id });
    return { success: true, data: data as unknown as Theme };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "テーマの作成に失敗しました",
    };
  }
}

export async function updateTheme(
  themeId: string,
  title: string,
  description: string = ""
): Promise<ActionResult<Theme>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("themes") as any)
      .update({
        title,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", themeId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as unknown as Theme };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "テーマの更新に失敗しました",
    };
  }
}

export async function deleteTheme(themeId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { error } = await supabase.from("themes").delete().eq("id", themeId);

    if (error) throw error;
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "テーマの削除に失敗しました",
    };
  }
}
