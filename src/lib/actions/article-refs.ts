"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ThemeArticleRef } from "@/types";

export async function getArticleRefs(
  themeId: string
): Promise<ActionResult<ThemeArticleRef[]>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("theme_article_refs")
      .select("*, articles(title, content, theme_id, themes(title))")
      .eq("theme_id", themeId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refs = (data ?? []).map((r: any) => ({
      id: r.id,
      theme_id: r.theme_id,
      article_id: r.article_id,
      user_id: r.user_id,
      created_at: r.created_at,
      article_title: r.articles?.title ?? "",
      article_content: r.articles?.content ?? "",
      source_theme_title:
        r.articles?.themes && typeof r.articles.themes === "object"
          ? r.articles.themes.title
          : "",
    })) as ThemeArticleRef[];

    return { success: true, data: refs };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "参考記事の取得に失敗しました",
    };
  }
}

export async function addArticleRef(
  themeId: string,
  articleId: string
): Promise<ActionResult<ThemeArticleRef>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("theme_article_refs")
      .insert({
        theme_id: themeId,
        article_id: articleId,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "この記事は既に追加されています" };
      }
      throw error;
    }

    return { success: true, data: data as unknown as ThemeArticleRef };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "参考記事の追加に失敗しました",
    };
  }
}

export async function removeArticleRef(refId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("theme_article_refs")
      .delete()
      .eq("id", refId);

    if (error) throw error;
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "参考記事の削除に失敗しました",
    };
  }
}

/**
 * 記事をメモとして追加可能なテーマ一覧を取得
 * - 記事の元テーマを除外
 * - 既に追加済みのテーマを除外
 */
export async function getThemesForArticleRef(
  articleId: string
): Promise<
  ActionResult<{ id: string; title: string; already_added: boolean }[]>
> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    // 記事の元テーマIDを取得
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("theme_id")
      .eq("id", articleId)
      .single();

    if (articleError) throw articleError;

    // ユーザーの全テーマを取得
    const { data: themes, error: themesError } = await supabase
      .from("themes")
      .select("id, title")
      .order("updated_at", { ascending: false });

    if (themesError) throw themesError;

    // 既に追加済みの参照を取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRefs } = await (supabase as any)
      .from("theme_article_refs")
      .select("theme_id")
      .eq("article_id", articleId);

    const addedThemeIds = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (existingRefs ?? []).map((r: any) => r.theme_id)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceThemeId = (article as any)?.theme_id;

    const result = (themes ?? [])
      .filter((t: { id: string }) => t.id !== sourceThemeId)
      .map((t: { id: string; title: string }) => ({
        id: t.id,
        title: t.title,
        already_added: addedThemeIds.has(t.id),
      }));

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "テーマ一覧の取得に失敗しました",
    };
  }
}

/**
 * テーマに参考記事として追加可能な記事一覧を取得
 * - このテーマの記事を除外
 * - 既に追加済みの記事をマーク
 */
export async function getArticlesForThemeRef(themeId: string): Promise<
  ActionResult<
    {
      id: string;
      title: string;
      theme_title: string;
      already_added: boolean;
    }[]
  >
> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    // ユーザーの全記事を取得（このテーマの記事を除外）
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, theme_id, themes(title)")
      .neq("theme_id", themeId)
      .order("created_at", { ascending: false });

    if (articlesError) throw articlesError;

    // 既に追加済みの参照を取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRefs } = await (supabase as any)
      .from("theme_article_refs")
      .select("article_id")
      .eq("theme_id", themeId);

    const addedArticleIds = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (existingRefs ?? []).map((r: any) => r.article_id)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (articles ?? []).map((a: any) => ({
      id: a.id,
      title: a.title || "無題の記事",
      theme_title:
        a.themes && typeof a.themes === "object" ? a.themes.title : "",
      already_added: addedArticleIds.has(a.id),
    }));

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "記事一覧の取得に失敗しました",
    };
  }
}
