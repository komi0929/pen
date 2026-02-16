"use server";

import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import { idSchema, themeSchema, validate } from "@/lib/validations";
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const themeIds = (themes ?? []).map((t: any) => t.id);

    // 各テーマの最新メモ日時を取得
    const memoLatestMap: Record<string, string> = {};
    if (themeIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: memos } = await (supabase as any)
        .from("memos")
        .select("theme_id, created_at")
        .in("theme_id", themeIds)
        .order("created_at", { ascending: false });
      if (memos) {
        for (const m of memos) {
          if (!memoLatestMap[m.theme_id]) {
            memoLatestMap[m.theme_id] = m.created_at;
          }
        }
      }
    }

    // 各テーマの最新記事日時を取得
    const articleLatestMap: Record<string, string> = {};
    if (themeIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: articles } = await (supabase as any)
        .from("articles")
        .select("theme_id, created_at")
        .in("theme_id", themeIds)
        .order("created_at", { ascending: false });
      if (articles) {
        for (const a of articles) {
          if (!articleLatestMap[a.theme_id]) {
            articleLatestMap[a.theme_id] = a.created_at;
          }
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (themes ?? []).map((t: any) => ({
      id: t.id,
      user_id: t.user_id,
      title: t.title,
      description: t.description,
      created_at: t.created_at,
      updated_at: t.updated_at,
      memo_count:
        Array.isArray(t.memos) && t.memos.length > 0 ? t.memos[0].count : 0,
      article_count:
        Array.isArray(t.articles) && t.articles.length > 0
          ? t.articles[0].count
          : 0,
      latest_memo_at: memoLatestMap[t.id] || null,
      latest_article_at: articleLatestMap[t.id] || null,
    })) as Theme[];

    // ソート: 記事なし（メモ最新順）→ 記事あり（記事制作日時最新順）
    result.sort((a, b) => {
      const aHasArticle = (a.article_count ?? 0) > 0;
      const bHasArticle = (b.article_count ?? 0) > 0;

      // 記事なしグループを先に
      if (!aHasArticle && bHasArticle) return -1;
      if (aHasArticle && !bHasArticle) return 1;

      if (!aHasArticle && !bHasArticle) {
        // 両方記事なし → メモ最新日時の降順（メモがないものは最後）
        const aDate = a.latest_memo_at || a.updated_at;
        const bDate = b.latest_memo_at || b.updated_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }

      // 両方記事あり → 記事制作日時の降順
      const aDate = a.latest_article_at || a.updated_at;
      const bDate = b.latest_article_at || b.updated_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

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
      .select("*, memos(count), articles(count)")
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
      article_count:
        Array.isArray(d.articles) && d.articles.length > 0
          ? d.articles[0].count
          : 0,
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
  const v = validate(themeSchema, { title, description });
  if (!v.success) return { success: false, error: v.error };

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
  const vId = validate(idSchema, { id: themeId });
  if (!vId.success) return { success: false, error: vId.error };
  const v = validate(themeSchema, { title, description });
  if (!v.success) return { success: false, error: v.error };

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
  const v = validate(idSchema, { id: themeId });
  if (!v.success) return { success: false, error: v.error };

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
