import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { themeTitle, themeDescription, memos, messages, isSkip } = body;

    const messageCount = messages?.length ?? 0;

    // Gemini APIキーチェック
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const mock = generateMockResponse(
        themeTitle,
        themeDescription,
        memos,
        messages,
        messageCount,
        isSkip
      );
      return NextResponse.json(mock);
    }

    // Gemini AI を使用したインタビュー
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = buildSystemPrompt(themeTitle, themeDescription, memos);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    });

    // 会話履歴を構築（Gemini APIは最初のメッセージがuserである必要がある）
    const rawHistory = (messages ?? []).map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    );

    // 履歴の先頭がmodelの場合、初期プロンプトをuser側として挿入
    if (rawHistory.length > 0 && rawHistory[0].role === "model") {
      rawHistory.unshift({
        role: "user",
        parts: [
          {
            text: "インタビューを開始してください。最初の質問をしてください。",
          },
        ],
      });
    }

    // sendMessageに渡すpromptと、startChatに渡すhistoryを分離
    let prompt: string;
    let chatHistory: typeof rawHistory;

    if (messageCount === 0) {
      prompt = "インタビューを開始してください。最初の質問をしてください。";
      chatHistory = [];
    } else if (isSkip) {
      // スキップの場合、最後のAIメッセージまでをhistoryに含め、別の質問を依頼
      chatHistory = rawHistory;
      prompt =
        "この質問はスキップします。別の角度から、違う質問をしてください。";
    } else {
      chatHistory = rawHistory.slice(0, -1);
      const lastMsg = rawHistory[rawHistory.length - 1];
      prompt = lastMsg.parts[0].text;
    }

    const chat = model.startChat({ history: chatHistory });

    // リトライ付きでメッセージ送信（429対策）
    let rawResponse: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await chat.sendMessage(prompt);
        rawResponse = result.response.text();
        break;
      } catch (retryError: unknown) {
        const isRateLimit =
          retryError instanceof Error && retryError.message.includes("429");
        if (isRateLimit && attempt < 2) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        throw retryError;
      }
    }

    // [[READY:XX]] をパースして分離
    const { text: response, readiness } = parseReadiness(rawResponse ?? "");

    return NextResponse.json({ response, readiness });
  } catch (error) {
    console.error("Interview API error:", error);
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: `インタビューの処理中にエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}

function parseReadiness(text: string): { text: string; readiness: number } {
  const match = text.match(/\[\[READY:(\d{1,3})\]\]/);
  const readiness = match
    ? Math.min(100, Math.max(0, parseInt(match[1], 10)))
    : -1;
  const cleanText = text.replace(/\s*\[\[READY:\d{1,3}\]\]\s*/g, "").trim();
  return { text: cleanText, readiness };
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
4. 質問は短く、分かりやすく
5. 回答には「なるほど」「面白いですね」などの相槌を入れる
6. メモがある場合は、メモの内容に触れながら質問する
7. 敬語で話す（ですます調）
8. 絵文字は使わない
9. ユーザーが質問をスキップした場合は、無理に深堀りせず別の話題で質問する

## 記事素材の準備度評価（必須）
あなたは毎回の応答の最後に、記事を書くための素材がどれくらい集まったかを評価してください。
応答テキストの**最終行**に以下のフォーマットで準備度を記載してください：

[[READY:XX]]

XXは0〜100の整数で、以下の基準に従ってください：

- **0〜15**: まだ始まったばかり。テーマの背景や動機がわかっていない
- **15〜30**: 基本的な導入情報は得たが、具体的なエピソードが不足
- **30〜50**: いくつかのエピソードが出てきた。もう少し深堀りが必要
- **50〜70**: 良い素材が揃ってきた。あと2〜3問で十分になりそう
- **70〜80**: 十分な素材が集まった。記事を書ける状態

80以上は使わないでください。最大値は80です。

**重要なルール：**
- 準備度が70以上になったら、通常の質問をやめて、以下のような完了提案メッセージを送ってください：
  「ここまでのお話で、記事を書くための素材が十分に集まりました。このままインタビューを完了して、記事の生成に進むことができます。もし他に伝えたいことがあれば、もちろん続けていただけます。」
  その後に「他に何か付け加えたいことはありますか？」と聞いてください
- 最初の質問（会話開始時）は必ず [[READY:5]] とする
- ユーザーの回答が短い・浅い場合は準備度を大きく上げない
- ユーザーの回答が具体的で豊かな場合は準備度を積極的に上げる
- スキップされた質問は準備度に影響しない

このタグはユーザーには表示されません。必ず毎回付与してください。`;
}

function generateMockResponse(
  themeTitle: string,
  themeDescription: string,
  memos: { content: string }[] | null,
  messages: { role: string; content: string }[] | null,
  messageCount: number,
  isSkip: boolean
): { response: string; readiness: number } {
  const userMessages = messages?.filter((m) => m.role === "user") ?? [];

  if (isSkip) {
    return {
      response:
        "わかりました、では別の角度からお聞きします。このテーマについて、特に読者に共感してもらいたい部分はどこですか？",
      readiness: Math.min(80, (userMessages.length - 1) * 12 + 5),
    };
  }

  if (messageCount === 0) {
    const response =
      memos && memos.length > 0
        ? `「${themeTitle}」について、メモを拝見しました。\n\n特に「${memos[0].content.slice(0, 30)}...」が気になりました。\n\nこのテーマについて記事を書こうと思ったきっかけを教えていただけますか？`
        : `「${themeTitle}」について記事を書くんですね！\n\n${themeDescription ? `「${themeDescription}」とのことですが、` : ""}まず、このテーマに興味を持ったきっかけを教えてください。`;
    return { response, readiness: 5 };
  } else if (userMessages.length <= 2) {
    const depthQuestions = [
      "なるほど！具体的なエピソードや例はありますか？",
      "それは面白いですね。読者にとって一番伝えたいポイントは何ですか？",
    ];
    return {
      response: depthQuestions[userMessages.length - 1] ?? depthQuestions[0],
      readiness: 15 + userMessages.length * 10,
    };
  } else if (userMessages.length <= 4) {
    const expandQuestions = [
      "この経験から学んだことや、変化したことはありますか？",
      "最後に、このテーマについて一言でまとめるとしたら、どう表現しますか？",
    ];
    return {
      response: expandQuestions[userMessages.length - 3] ?? expandQuestions[0],
      readiness: 40 + (userMessages.length - 2) * 12,
    };
  } else {
    return {
      response:
        "ここまでのお話で、記事を書くための素材が十分に集まりました。このままインタビューを完了して、記事の生成に進むことができます。もし他に伝えたいことがあれば、もちろん続けていただけます。\n\n他に何か付け加えたいことはありますか？",
      readiness: 75,
    };
  }
}
