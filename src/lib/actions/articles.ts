"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Article } from "@/types";

export async function getArticles(): Promise<ActionResult<Article[]>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { data, error } = await supabase
      .from("articles")
      .select("*, themes(title)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (data ?? []).map((a: any) => ({
      id: a.id,
      theme_id: a.theme_id,
      interview_id: a.interview_id,
      user_id: a.user_id,
      title: a.title,
      content: a.content,
      word_count: a.word_count,
      created_at: a.created_at,
      updated_at: a.updated_at,
      theme_title:
        a.themes && typeof a.themes === "object" ? a.themes.title : "",
    })) as Article[];

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "記事の取得に失敗しました",
    };
  }
}

export async function getArticle(
  articleId: string
): Promise<ActionResult<Article>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { data, error } = await supabase
      .from("articles")
      .select("*, themes(title)")
      .eq("id", articleId)
      .single();

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    const article: Article = {
      id: d.id,
      theme_id: d.theme_id,
      interview_id: d.interview_id,
      user_id: d.user_id,
      title: d.title,
      content: d.content,
      word_count: d.word_count,
      created_at: d.created_at,
      updated_at: d.updated_at,
      theme_title:
        d.themes && typeof d.themes === "object" ? d.themes.title : "",
    };

    return { success: true, data: article };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "記事の取得に失敗しました",
    };
  }
}

export async function createArticle(
  themeId: string,
  interviewId: string | null,
  title: string,
  content: string
): Promise<ActionResult<Article>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    const wordCount = content.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("articles") as any)
      .insert({
        theme_id: themeId,
        interview_id: interviewId,
        user_id: user.id,
        title,
        content,
        word_count: wordCount,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as unknown as Article };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "記事の保存に失敗しました",
    };
  }
}

export async function deleteArticle(articleId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", articleId);

    if (error) throw error;
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "記事の削除に失敗しました",
    };
  }
}

export async function updateArticle(
  articleId: string,
  title: string,
  content: string
): Promise<ActionResult<Article>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const wordCount = content.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("articles") as any)
      .update({
        title,
        content,
        word_count: wordCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as unknown as Article };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "記事の更新に失敗しました",
    };
  }
}
