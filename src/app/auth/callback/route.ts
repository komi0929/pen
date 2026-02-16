import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/themes";
  // オープンリダイレクト防止: 相対パスのみ許可
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/themes";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // ログイン成功イベントを記録
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("analytics_events") as any).insert({
            user_id: user.id,
            event_name: "login_completed",
            event_data: { method: code ? "oauth" : "magic_link" },
          });
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
