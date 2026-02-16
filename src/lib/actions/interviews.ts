"use server";

import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import { interviewSchema, validate } from "@/lib/validations";
import type { ActionResult, Interview, InterviewMessage } from "@/types";

export async function createInterview(
  themeId: string,
  targetLength: number
): Promise<ActionResult<Interview>> {
  const v = validate(interviewSchema, { themeId, targetLength });
  if (!v.success) return { success: false, error: v.error };

  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("interviews") as any)
      .insert({
        theme_id: themeId,
        user_id: user.id,
        target_length: targetLength,
      })
      .select()
      .single();

    if (error) throw error;
    trackEvent("interview_started", {
      theme_id: themeId,
      interview_id: data.id,
    });
    return { success: true, data: data as unknown as Interview };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "インタビューの作成に失敗しました",
    };
  }
}

export async function getInterview(
  interviewId: string
): Promise<
  ActionResult<{ interview: Interview; messages: InterviewMessage[] }>
> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { data: interview, error: intError } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", interviewId)
      .single();

    if (intError) throw intError;

    const { data: messages, error: msgError } = await supabase
      .from("interview_messages")
      .select("*")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;

    return {
      success: true,
      data: {
        interview: interview as unknown as Interview,
        messages: (messages ?? []) as unknown as InterviewMessage[],
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "インタビューの取得に失敗しました",
    };
  }
}

export async function getActiveInterview(
  themeId: string
): Promise<ActionResult<Interview | null>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("theme_id", themeId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data: (data as unknown as Interview) ?? null };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "インタビューの取得に失敗しました",
    };
  }
}

export async function addMessage(
  interviewId: string,
  role: "assistant" | "user",
  content: string
): Promise<ActionResult<InterviewMessage>> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("interview_messages") as any)
      .insert({
        interview_id: interviewId,
        user_id: user.id,
        role,
        content,
      })
      .select()
      .single();

    if (error) throw error;
    if (role === "user") {
      trackEvent("interview_message_sent", { interview_id: interviewId });
    }
    return { success: true, data: data as unknown as InterviewMessage };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "メッセージの保存に失敗しました",
    };
  }
}

export async function completeInterview(
  interviewId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: "DB接続エラー" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("interviews") as any)
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", interviewId);

    if (error) throw error;
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "インタビューの完了に失敗しました",
    };
  }
}
