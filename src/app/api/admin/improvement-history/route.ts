import { createAdminClient } from "@/lib/supabase/admin";
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

    const supabase = createAdminClient();

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

/**
 * 文字化けエントリを削除するAPIエンドポイント
 * DELETE /api/admin/improvement-history
 * Body: { code: string, id?: string, table?: "history" | "requests" }
 * idが指定されればそのIDのエントリを削除、なければtitleに?が含まれるエントリを全削除
 * table: "requests" を指定すると improvement_requests テーブルから削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const { code, id, table } = await request.json();

    if (code !== "0929") {
      return NextResponse.json(
        { success: false, error: "認証エラー" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const tableName = table === "requests" ? "improvement_requests" : "improvement_history";

    if (id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(tableName)
        .delete()
        .eq("id", id);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    } else {
      // titleに?が含まれる文字化けエントリを削除
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(tableName)
        .delete()
        .like("title", "%?%");
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "エラーが発生しました" },
      { status: 500 }
    );
  }
}

