import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { themeTitle, themeDescription, memos, messages } = body;

    const messageCount = messages?.length ?? 0;

    // Gemini APIキーチェック
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // APIキー未設定時はモック応答
      const response = generateMockResponse(
        themeTitle,
        themeDescription,
        memos,
        messages,
        messageCount
      );
      return NextResponse.json({ response });
    }

    // Gemini AI を使用したインタビュー
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = buildSystemPrompt(themeTitle, themeDescription, memos);

    // 会話履歴を構築
    const chatHistory = (messages ?? []).map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    );

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: systemPrompt,
    });

    // 最初の質問 or 会話の続き
    let prompt: string;
    if (messageCount === 0) {
      prompt = "インタビューを開始してください。最初の質問をしてください。";
    } else {
      const lastUserMessage = messages[messages.length - 1];
      prompt = lastUserMessage?.content ?? "続けてください";
    }

    const result = await chat.sendMessage(prompt);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Interview API error:", error);
    return NextResponse.json(
      { error: "インタビューの処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(
  themeTitle: string,
  themeDescription: string,
  memos: { content: string }[] | null
): string {
  const memoSection =
    memos && memos.length > 0
      ? `\n\nユーザーのメモ:\n${memos.map((m, i) => `${i + 1}. ${m.content}`).join("\n")}`
      : "";

  return `あなたはプロのライターインタビュアーです。ユーザーがnoteに投稿する記事を書くための素材を引き出すインタビューを行います。

## インタビュー対象テーマ
タイトル: ${themeTitle}
${themeDescription ? `説明: ${themeDescription}` : ""}${memoSection}

## インタビューのルール
1. 一度に1つの質問だけをする（複数の質問を同時にしない）
2. ユーザーの回答を深掘りし、具体的なエピソードや感情を引き出す
3. 共感を示しながら、自然な対話を心がける
4. 5〜8回のやり取りで十分な素材が集まるようにする
5. 質問は短く、分かりやすく
6. 回答には「なるほど」「面白いですね」などの相槌を入れる
7. メモがある場合は、メモの内容に触れながら質問する
8. 敬語で話す（ですます調）
9. 絵文字は使わない`;
}

function generateMockResponse(
  themeTitle: string,
  themeDescription: string,
  memos: any[] | null,
  messages: any[] | null,
  messageCount: number
): string {
  const userMessages =
    messages?.filter((m: { role: string }) => m.role === "user") ?? [];

  if (messageCount === 0) {
    return memos && memos.length > 0
      ? `「${themeTitle}」について、メモを拝見しました。\n\n特に「${memos[0].content.slice(0, 30)}...」が気になりました。\n\nこのテーマについて記事を書こうと思ったきっかけを教えていただけますか？`
      : `「${themeTitle}」について記事を書くんですね！\n\n${themeDescription ? `「${themeDescription}」とのことですが、` : ""}まず、このテーマに興味を持ったきっかけを教えてください。`;
  } else if (userMessages.length <= 2) {
    const depthQuestions = [
      "なるほど！具体的なエピソードや例はありますか？",
      "それは面白いですね。読者にとって一番伝えたいポイントは何ですか？",
      "もう少し詳しく聞かせてください。なぜそう考えるようになりましたか？",
    ];
    return depthQuestions[userMessages.length - 1] ?? depthQuestions[0];
  } else if (userMessages.length <= 4) {
    const expandQuestions = [
      "素晴らしいですね。他に補足したいことや、読者に知ってほしいことはありますか？",
      "この経験から学んだことや、変化したことはありますか？",
      "最後に、このテーマについて一言でまとめるとしたら、どう表現しますか？",
    ];
    return expandQuestions[userMessages.length - 3] ?? expandQuestions[0];
  } else {
    return "ありがとうございます。十分な素材が集まりました！\n\n「インタビュー完了」ボタンを押すと、これまでの会話をもとに記事を生成します。";
  }
}
