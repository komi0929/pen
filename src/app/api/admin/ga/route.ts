import { getGAReport } from "@/lib/ga-client";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_CODE = "0929";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (code !== ADMIN_CODE) {
      return NextResponse.json(
        { error: "管理者コードが正しくありません" },
        { status: 401 }
      );
    }

    const report = await getGAReport();

    return NextResponse.json({
      success: true,
      data: report, // null の場合は GA未設定
    });
  } catch (err) {
    console.error("[Admin GA API]", err);
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
