"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ArticleEditHistory } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================
// Server Actions
// ============================================================

/** 編集前のスナップショットを保存してから記事を更新 */
export async function saveArticleWithHistory(
  articleId: string,
  title: string,
  content: string,
  editLabel: string = ""
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // 現在の記事を取得（スナップショット用）
    const { data: current, error: fetchError } = await (
      supabase.from("articles") as any
    )
      .select("title, content, word_count")
      .eq("id", articleId)
      .single();

    if (fetchError) throw fetchError;

    // 内容が変わっていない場合は履歴を作らない
    const hasChanged = current.title !== title || current.content !== content;

    if (hasChanged) {
      // 編集前のスナップショットを履歴に保存

      const { error: historyError } = await (
        supabase.from("article_edit_history") as any
      ).insert({
        article_id: articleId,
        user_id: user.id,
        title: current.title,
        content: current.content,
        word_count: current.word_count || 0,
        edit_label: editLabel,
      });

      if (historyError) throw historyError;
    }

    // 記事を更新
    const wordCount = content.length;

    const { error: updateError } = await (supabase.from("articles") as any)
      .update({
        title,
        content,
        word_count: wordCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (updateError) throw updateError;

    return { success: true, data: { id: articleId } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "記事の保存に失敗しました",
    };
  }
}

/** 編集履歴一覧を取得 */
export async function getArticleEditHistory(
  articleId: string
): Promise<ActionResult<ArticleEditHistory[]>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { data, error } = await (supabase.from("article_edit_history") as any)
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const history = (data ?? []).map((h: any) => ({
      id: h.id,
      article_id: h.article_id,
      user_id: h.user_id,
      title: h.title,
      content: h.content,
      word_count: h.word_count,
      edit_label: h.edit_label || "",
      created_at: h.created_at,
    })) as ArticleEditHistory[];

    return { success: true, data: history };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "履歴の取得に失敗しました",
    };
  }
}

/** 履歴から記事を復元 */
export async function restoreArticleFromHistory(
  articleId: string,
  historyId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // 復元先の履歴を取得
    const { data: historyItem, error: histError } = await (
      supabase.from("article_edit_history") as any
    )
      .select("*")
      .eq("id", historyId)
      .single();

    if (histError) throw histError;

    // 現在の記事をスナップショットとして保存
    const { data: current, error: fetchError } = await (
      supabase.from("articles") as any
    )
      .select("title, content, word_count")
      .eq("id", articleId)
      .single();

    if (fetchError) throw fetchError;

    const { error: snapError } = await (
      supabase.from("article_edit_history") as any
    ).insert({
      article_id: articleId,
      user_id: user.id,
      title: current.title,
      content: current.content,
      word_count: current.word_count || 0,
      edit_label: "復元前のバックアップ",
    });

    if (snapError) throw snapError;

    // 記事を履歴の内容で更新

    const { error: updateError } = await (supabase.from("articles") as any)
      .update({
        title: historyItem.title,
        content: historyItem.content,
        word_count: historyItem.word_count,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (updateError) throw updateError;

    return { success: true, data: { id: articleId } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "復元に失敗しました",
    };
  }
}
