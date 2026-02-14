import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * インタビューAI応答エンドポイント
 * AI APIキー未設定時はルールベースのモック応答を返す
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB接続エラー" }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { themeTitle, memos, messages, themeDescription } =
      await request.json();

    // メッセージ数に応じた質問を生成
    const messageCount = messages?.length ?? 0;
    const userMessages =
      messages?.filter((m: { role: string }) => m.role === "user") ?? [];

    let response: string;

    if (messageCount === 0) {
      // 最初の質問
      response =
        memos && memos.length > 0
          ? `「${themeTitle}」について、メモを拝見しました。\n\n特に「${memos[0].content.slice(0, 30)}...」が気になりました。\n\nこのテーマについて記事を書こうと思ったきっかけを教えていただけますか？`
          : `「${themeTitle}」について記事を書くんですね！\n\n${themeDescription ? `「${themeDescription}」とのことですが、` : ""}まず、このテーマに興味を持ったきっかけを教えてください。`;
    } else if (userMessages.length <= 2) {
      // 序盤: 深堀り質問
      const depthQuestions = [
        "なるほど！具体的なエピソードや例はありますか？",
        "それは面白いですね。読者にとって一番伝えたいポイントは何ですか？",
        "もう少し詳しく聞かせてください。なぜそう考えるようになりましたか？",
      ];
      response = depthQuestions[userMessages.length - 1] ?? depthQuestions[0];
    } else if (userMessages.length <= 4) {
      // 中盤: 視点を広げる
      const expandQuestions = [
        "その考えに対して、反対意見や別の見方はありますか？",
        "この話を友人に説明するとしたら、どんな順番で話しますか？",
        "読者に最後に持ち帰ってほしいメッセージは何でしょうか？",
      ];
      response = expandQuestions[userMessages.length - 3] ?? expandQuestions[0];
    } else {
      // 終盤: まとめに向かう
      response =
        "ありがとうございます！とても充実した内容ですね。\n\nそろそろ記事にまとめられそうです。「インタビューを完了」ボタンを押すと、これまでの対話をもとに記事を生成できます。\n\n他に追加したいことがあれば、続けて入力してください。";
    }

    return NextResponse.json({ content: response });
  } catch (err) {
    const message = err instanceof Error ? err.message : "エラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
