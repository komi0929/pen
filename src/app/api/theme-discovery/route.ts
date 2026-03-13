import {
  buildThemeDiscoveryPrompt,
  type UserProfile,
} from "@/lib/prompts/theme-discovery";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// --- レートリミット（認証不要APIのため必須）---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
const RATE_LIMIT_MAX = 10; // 1分あたり10リクエスト

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// 古いエントリを定期クリーンアップ（サーバーレス環境での二重起動防止）
let cleanupStarted = false;
if (typeof setInterval !== "undefined" && !cleanupStarted) {
  cleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }, 5 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    // レートリミットチェック
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。少し待ってから再度お試しください。" },
        { status: 429 }
      );
    }

    // 認証不要 — ログインなしで利用可能

    const body = await request.json();
    const { messages, userProfile: incomingProfile, refineMode, originalTheme } = body;
    const messageCount = messages?.length ?? 0;

    // ユーザーのターン数を計算（user roleのメッセージ数）
    const userTurnCount =
      messages?.filter((m: { role: string }) => m.role === "user").length ?? 0;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const mock = generateMockResponse(messageCount, userTurnCount);
      return NextResponse.json(mock);
    }

    // --- 磨き込みモード ---
    if (refineMode && originalTheme) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const refinePrompt = `あなたは記事テーマの編集者です。以下のテーマを、ユーザーの要望に基づいて磨き込んでください。

元のテーマ:
- タイトル: ${originalTheme.title}
- 説明: ${originalTheme.description}
- 切り口: ${originalTheme.angle}
- 想定読者: ${originalTheme.readers}
${originalTheme.articleOutline ? `- 構成案: ${JSON.stringify(originalTheme.articleOutline)}` : ""}

ユーザーの要望を反映して、テーマを改善してください。
**必ず以下のタグを出力してください:**
[[THEMES:{"themes":[{"title":"改善後のタイトル","description":"改善後の説明","angle":"改善後の切り口","readers":"改善後の想定読者","scores":${JSON.stringify(originalTheme.scores ?? {primary:"○",universal:"○",depth:"○"})},"advice":{"primary":"一次性の具体的アドバイス","universal":"普遍性の具体的アドバイス","depth":"深掘りの具体的アドバイス"},"articleOutline":{"hook":"改善後の導入文","sections":["セクション1","セクション2","セクション3"],"closing":"改善後の締め"}}]}]]
[[DISCOVERY:90]]`;
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: refinePrompt,
      });
      const userMsg = messages?.[0]?.content ?? "テーマを改善してください";
      const result = await model.generateContent(userMsg);
      const rawText = result.response.text();
      const parsed = parseDiscoveryResponse(rawText);
      return NextResponse.json({
        response: parsed.text,
        discoveryProgress: parsed.discoveryProgress,
        suggestedThemes: parsed.suggestedThemes,
        userProfile: null,
        editorNotes: parsed.editorNotes,
      });
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
      editorNotes,
    } = parseDiscoveryResponse(rawResponse ?? "");

    return NextResponse.json({
      response,
      discoveryProgress,
      suggestedThemes,
      userProfile,
      editorNotes,
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
  articleOutline?: {
    hook?: string;
    sections?: string[];
    closing?: string;
  };
}

function parseDiscoveryResponse(text: string): {
  text: string;
  discoveryProgress: number;
  suggestedThemes: SuggestedTheme[] | null;
  userProfile: UserProfile | null;
  editorNotes: { strengths?: string; pattern?: string; nextSuggestion?: string; topicArea?: string } | null;
} {
  // [[DISCOVERY:XX]] をパース
  const progressMatch = text.match(/\[\[DISCOVERY:(\d{1,3})\]\]/);
  const discoveryProgress = progressMatch
    ? Math.min(100, Math.max(0, parseInt(progressMatch[1], 10)))
    : -1;

  // [[THEMES:{...}]] をパース（ネストブラケット対応）
  let suggestedThemes: SuggestedTheme[] | null = null;
  const themesJson = extractTagContent(text, "THEMES");
  if (themesJson) {
    try {
      const parsed = JSON.parse(themesJson);
      if (parsed.themes && Array.isArray(parsed.themes)) {
        suggestedThemes = parsed.themes;
      }
    } catch {
      // JSONパース失敗 — 無視
    }
  }

  // [[PROFILE:{...}]] をパース（ネストブラケット対応）
  let userProfile: UserProfile | null = null;
  const profileJson = extractTagContent(text, "PROFILE");
  if (profileJson) {
    try {
      const parsed = JSON.parse(profileJson);
      userProfile = parsed as UserProfile;
    } catch {
      // JSONパース失敗 — 無視
    }
  }

  // [[EDITOR_NOTES:{...}]] をパース
  let editorNotes: { strengths?: string; pattern?: string; nextSuggestion?: string; topicArea?: string } | null = null;
  const editorJson = extractTagContent(text, "EDITOR_NOTES");
  if (editorJson) {
    try {
      editorNotes = JSON.parse(editorJson);
    } catch {
      // JSONパース失敗 — 無視
    }
  }

  // タグを除去
  let cleanText = text;
  cleanText = cleanText.replace(/\s*\[\[DISCOVERY:\d{1,3}\]\]\s*/g, "");
  cleanText = removeTag(cleanText, "THEMES");
  cleanText = removeTag(cleanText, "PROFILE");
  cleanText = removeTag(cleanText, "EDITOR_NOTES");

  return { text: cleanText.trim(), discoveryProgress, suggestedThemes, userProfile, editorNotes };
}

/** [[TAG:{...}]] からJSONコンテンツを抽出。ネストされたブラケットに対応 */
function extractTagContent(text: string, tag: string): string | null {
  const marker = `[[${tag}:`;
  const start = text.indexOf(marker);
  if (start === -1) return null;
  const jsonStart = start + marker.length;
  // ブラケットの深さでマッチングして ]] の正しい終了位置を見つける
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = jsonStart; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0 && i + 1 < text.length && text[i + 1] === ']') {
        // これが最後の } または ] で、直後に ]] がある
        return text.slice(jsonStart, i + 1);
      }
    }
  }
  // フォールバック: 旧正規表現
  const re = new RegExp(`\\[\\[${tag}:([\\s\\S]*?)\\]\\]`);
  const m = text.match(re);
  return m ? m[1] : null;
}

/** [[TAG:{...}]] 全体をテキストから除去 */
function removeTag(text: string, tag: string): string {
  const marker = `[[${tag}:`;
  const start = text.indexOf(marker);
  if (start === -1) return text;
  const content = extractTagContent(text, tag);
  if (content) {
    const fullTag = `[[${tag}:${content}]]`;
    return text.replace(fullTag, "");
  }
  // フォールバック
  const re = new RegExp(`\\s*\\[\\[${tag}:[\\s\\S]*?\\]\\]\\s*`, "g");
  return text.replace(re, "");
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
        articleOutline: {
          hook: "「効率化を追い求めた結果、たどり着いた答えは『効率化しないこと』だった」——3年間の試行錯誤で見つけた、本当に成果が出る仕事の進め方とは？",
          sections: [
            "なぜ『仕事術本』を読んでも生産性が上がらなかったのか",
            "転機になった3つの失敗エピソード",
            "今の仕事の進め方: 実践している具体的な5つの習慣",
          ],
          closing: "完璧な仕事術はない——自分だけの最適解を見つけるための考え方",
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
        articleOutline: {
          hook: "「え、そんなことも知らなかったの？」——周りから驚かれた経験はありませんか？ あなたが当然だと思っていることこそ、誰かが必死に検索している情報かもしれません。",
          sections: [
            "自分では『常識』だと思っていたこと3選",
            "実際に教えてみたときの相手のリアクション",
            "初心者が最初につまずくポイントと、その解決法",
            "「当たり前」を記事にするときの構成テンプレート",
          ],
          closing: "あなたの『普通』は、誰かの『求めていた答え』——まずは1つ書いてみましょう",
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
