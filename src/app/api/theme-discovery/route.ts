import {
  buildThemeDiscoveryPrompt,
  type UserProfile,
} from "@/lib/prompts/theme-discovery";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 認証不要 — ログインなしで利用可能

    const body = await request.json();
    const { messages, userProfile: incomingProfile } = body;
    const messageCount = messages?.length ?? 0;

    // ユーザーのターン数を計算（user roleのメッセージ数）
    const userTurnCount =
      messages?.filter((m: { role: string }) => m.role === "user").length ?? 0;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const mock = generateMockResponse(messageCount, userTurnCount);
      return NextResponse.json(mock);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = buildThemeDiscoveryPrompt(
      userTurnCount,
      incomingProfile || null
    );
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    });

    // 会話履歴を構築
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
            text: "テーマ探索を開始してください。最初の質問をしてください。",
          },
        ],
      });
    }

    let prompt: string;
    let chatHistory: typeof rawHistory;

    if (messageCount === 0) {
      prompt = "テーマ探索を開始してください。最初の質問をしてください。";
      chatHistory = [];
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

    const {
      text: response,
      discoveryProgress,
      suggestedThemes,
      userProfile,
    } = parseDiscoveryResponse(rawResponse ?? "");

    return NextResponse.json({
      response,
      discoveryProgress,
      suggestedThemes,
      userProfile,
    });
  } catch (error) {
    console.error("Theme Discovery API error:", error);
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: `テーマ探索中にエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}

export interface SuggestedTheme {
  title: string;
  description: string;
  angle: string;
  readers: string;
  scores?: {
    primary?: string;
    universal?: string;
    depth?: string;
  };
  advice?: {
    primary?: string;
    universal?: string;
    depth?: string;
  };
}

function parseDiscoveryResponse(text: string): {
  text: string;
  discoveryProgress: number;
  suggestedThemes: SuggestedTheme[] | null;
  userProfile: UserProfile | null;
} {
  // [[DISCOVERY:XX]] をパース
  const progressMatch = text.match(/\[\[DISCOVERY:(\d{1,3})\]\]/);
  const discoveryProgress = progressMatch
    ? Math.min(100, Math.max(0, parseInt(progressMatch[1], 10)))
    : -1;

  // [[THEMES:{...}]] をパース
  let suggestedThemes: SuggestedTheme[] | null = null;
  const themesMatch = text.match(/\[\[THEMES:([\s\S]*?)\]\]/);
  if (themesMatch) {
    try {
      const parsed = JSON.parse(themesMatch[1]);
      if (parsed.themes && Array.isArray(parsed.themes)) {
        suggestedThemes = parsed.themes;
      }
    } catch {
      // JSONパース失敗 — 無視
    }
  }

  // [[PROFILE:{...}]] をパース
  let userProfile: UserProfile | null = null;
  const profileMatch = text.match(/\[\[PROFILE:([\s\S]*?)\]\]/);
  if (profileMatch) {
    try {
      const parsed = JSON.parse(profileMatch[1]);
      userProfile = parsed as UserProfile;
    } catch {
      // JSONパース失敗 — 無視
    }
  }

  // タグを除去
  const cleanText = text
    .replace(/\s*\[\[DISCOVERY:\d{1,3}\]\]\s*/g, "")
    .replace(/\s*\[\[THEMES:[\s\S]*?\]\]\s*/g, "")
    .replace(/\s*\[\[PROFILE:[\s\S]*?\]\]\s*/g, "")
    .trim();

  return { text: cleanText, discoveryProgress, suggestedThemes, userProfile };
}

function generateMockResponse(
  messageCount: number,
  userTurnCount: number
): {
  response: string;
  discoveryProgress: number;
  suggestedThemes: SuggestedTheme[] | null;
  userProfile: UserProfile | null;
} {
  if (messageCount === 0) {
    return {
      response: `はじめまして！ noteの記事テーマを一緒に探す編集者です。

noteでは、投稿された記事の約40%が1年後も読まれ続けているという調査結果があります。
長く読まれる記事には共通点があるのですが、実はそのテーマは、書き手が「当たり前」だと思っていることの中に隠れていることが多いんです。

今日は短い対話で、あなたの中に眠っている「書くべきテーマ」を見つけていきます。

まず教えてください——
・普段はどんなお仕事や活動をされていますか？
・趣味や打ち込んでいることはありますか？
・最近、人に話して「へえ！」と言われた経験はありますか？

どれか1つでも、全部でも、気軽にお答えください！`,
      discoveryProgress: 5,
      suggestedThemes: null,
      userProfile: null,
    };
  }

  if (userTurnCount <= 2) {
    return {
      response:
        "なるほど、とても興味深いお話ですね！ もしこの経験を1本の記事にまとめるなら、一番伝えたいことは何ですか？",
      discoveryProgress: 25 + userTurnCount * 20,
      suggestedThemes: null,
      userProfile: {
        occupation: "（モック: ユーザーの職業）",
        interests: ["（モック: ユーザーの興味）"],
        expertise: userTurnCount >= 2 ? ["（モック: 専門分野）"] : undefined,
      },
    };
  }

  return {
    response: `ここまでのお話を伺って、あなたが書くべきテーマが見えてきました！

**テーマ候補1: 「実体験から学んだ、仕事術の本質」**
- なぜこのテーマか: 一次性 ◎ / 普遍性 ○ / 深掘り ○
- 記事の切り口: 具体的なエピソードを軸に、学びを構造化して伝える
- 想定読者: 同じ業界で働く若手や、キャリアに悩む人

**テーマ候補2: 「誰も教えてくれなかった日常のコツ」**
- なぜこのテーマか: 一次性 ○ / 普遍性 ◎ / 深掘り ○
- 記事の切り口: ビフォーアフター形式で、具体的な手順を示す
- 想定読者: 初心者や、これから始める人

気になるテーマをタップして、詳しい執筆アドバイスを見てみてください！`,
    discoveryProgress: 80,
    suggestedThemes: [
      {
        title: "実体験から学んだ、仕事術の本質",
        description:
          "あなたの一次体験に基づいており、多くの人が検索するテーマです",
        angle: "具体的なエピソードを軸に、学びを構造化して伝える",
        readers: "同じ業界で働く若手や、キャリアに悩む人",
        scores: { primary: "◎", universal: "○", depth: "○" },
        advice: {
          primary: "あなた自身が実際に経験した具体的なエピソード（失敗談・成功談）を数値や固有名詞付きで盛り込みましょう",
          universal: "『仕事術』で検索する人が知りたい、すぐ実践できるステップを含めましょう",
          depth: "なぜその方法にたどり着いたか、試行錯誤の過程を丁寧に描きましょう",
        },
      },
      {
        title: "誰も教えてくれなかった日常のコツ",
        description:
          "あなたが『当たり前』だと思っていたことが、実は貴重な一次情報です",
        angle: "ビフォーアフター形式で、具体的な手順を示す",
        readers: "初心者や、これから始める人",
        scores: { primary: "○", universal: "◎", depth: "○" },
        advice: {
          primary: "あなた自身が『当たり前』だと思っていた具体的なコツを列挙しましょう",
          universal: "初心者が最初に直面する困りごとにフォーカスし、検索されやすいタイトルをつけましょう",
          depth: "1つのコツについてビフォーアフターの具体例を詳しく示しましょう",
        },
      },
    ],
    userProfile: {
      occupation: "（モック: ユーザーの職業）",
      interests: ["（モック: ユーザーの興味）"],
      expertise: ["（モック: 専門分野）"],
      uniqueExperiences: ["（モック: ユニークな経験）"],
    },
  };
}
