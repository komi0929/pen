"use server";

import { createClient } from "@/lib/supabase/server";

export type ImprovementRequest = {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  is_official: boolean;
  likes_count: number;
  created_at: string;
  user_liked: boolean;
};

export type ImprovementHistory = {
  id: string;
  title: string;
  description: string;
  date: string;
  created_at: string;
};

export async function getImprovementRequests(): Promise<ImprovementRequest[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requests, error } = await (supabase as any)
    .from("improvement_requests")
    .select("*")
    .order("is_official", { ascending: false })
    .order("likes_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !requests) return [];

  let likedIds: Set<string> = new Set();
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: likes } = await (supabase as any)
      .from("improvement_likes")
      .select("request_id")
      .eq("user_id", user.id);
    if (likes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      likedIds = new Set(likes.map((l: any) => l.request_id));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (requests as any[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    description: r.description || "",
    is_official: r.is_official,
    likes_count: r.likes_count,
    created_at: r.created_at,
    user_liked: likedIds.has(r.id),
  }));
}

export async function getImprovementHistory(): Promise<ImprovementHistory[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("improvement_history")
    .select("*")
    .order("date", { ascending: false });

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((h) => ({
    id: h.id,
    title: h.title,
    description: h.description || "",
    date: h.date,
    created_at: h.created_at,
  }));
}

export async function submitImprovementRequest(
  title: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "ログインが必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("improvement_requests")
      .insert({
        user_id: user.id,
        title,
        description,
        is_official: false,
      });

    if (error) return { success: false, error: "投稿に失敗しました" };
    return { success: true };
  } catch {
    return { success: false, error: "エラーが発生しました" };
  }
}

export async function toggleLike(
  requestId: string
): Promise<{ success: boolean; liked: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, liked: false, error: "接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return { success: false, liked: false, error: "ログインが必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("improvement_likes")
      .select("id")
      .eq("request_id", requestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("improvement_likes")
        .delete()
        .eq("id", existing.id);
      return { success: true, liked: false };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("improvement_likes").insert({
        request_id: requestId,
        user_id: user.id,
      });
      return { success: true, liked: true };
    }
  } catch {
    return { success: false, liked: false, error: "エラーが発生しました" };
  }
}

/**
 * 改善履歴を追加する（管理者用）
 * devワークフローやAPIから呼び出される
 */
export async function addImprovementHistory(
  title: string,
  description: string,
  date?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "接続エラー" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("improvement_history")
      .insert({
        title,
        description,
        date: date ?? new Date().toISOString().split("T")[0],
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "エラーが発生しました" };
  }
}
