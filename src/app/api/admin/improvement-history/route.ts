import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * 改善履歴を追加するAPIエンドポイント
 * POST /api/admin/improvement-history
 * Body: { code: string, title: string, description: string, date?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { code, title, description, date } = await request.json();

    // 管理者コード認証
    if (code !== "0929") {
      return NextResponse.json(
        { success: false, error: "認証エラー" },
        { status: 401 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: "titleは必須です" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "DB接続エラー" },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("improvement_history")
      .insert({
        title,
        description: description || "",
        date: date || new Date().toISOString().split("T")[0],
      });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "エラーが発生しました" },
      { status: 500 }
    );
  }
}
