import { buildInterviewPrompt } from "@/lib/prompts/registry";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
      }
    }

    const body = await request.json();
    const {
      themeTitle,
      themeDescription,
      memos,
      messages,
      isSkip,
      referenceArticles,
    } = body;

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
    const systemPrompt = buildInterviewPrompt(
      themeTitle,
      themeDescription,
      memos,
      referenceArticles
    );
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
