import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { themeTitle, themeDescription, memos, messages, targetLength } =
      body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // モック記事生成
      const title = themeTitle || "無題の記事";
      const content = generateMockArticle(
        themeTitle,
        themeDescription,
        messages
      );
      return NextResponse.json({ title, content });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = buildArticlePrompt(
      themeTitle,
      themeDescription,
      memos,
      targetLength ?? 2000
    );
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    });

    // インタビュー内容を1つのテキストにまとめる
    const interviewText = (messages ?? [])
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "assistant" ? "インタビュアー" : "回答者"}: ${m.content}`
      )
      .join("\n\n");

    // リトライ付き
    let rawResponse: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(
          `以下のインタビュー内容をもとに、noteに投稿する記事を書いてください。\n\n${interviewText}`
        );
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

    if (!rawResponse) {
      throw new Error("記事の生成に失敗しました");
    }

    // タイトルと本文を分離（最初の行をタイトルとして扱う）
    const lines = rawResponse.trim().split("\n");
    let title = themeTitle;
    let content = rawResponse;

    // 最初の行が # で始まる場合はタイトルとして使う
    if (lines[0].startsWith("# ")) {
      title = lines[0].replace(/^#\s*/, "").trim();
      content = lines.slice(1).join("\n").trim();
    } else if (lines[0].startsWith("## ")) {
      title = lines[0].replace(/^##\s*/, "").trim();
      content = lines.slice(1).join("\n").trim();
    }

    return NextResponse.json({ title, content });
  } catch (error) {
    console.error("Article generation error:", error);
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: `記事の生成中にエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}

function buildArticlePrompt(
  themeTitle: string,
  themeDescription: string,
  memos: { content: string }[] | null,
  targetLength: number
): string {
  const memoSection =
    memos && memos.length > 0
      ? `\n\n参考メモ:\n${memos.map((m, i) => `${i + 1}. ${m.content}`).join("\n")}`
      : "";

  return `あなたはプロのライターです。インタビュー内容をもとに、noteに投稿する記事を作成してください。

## 記事のテーマ
タイトル: ${themeTitle}
${themeDescription ? `説明: ${themeDescription}` : ""}${memoSection}

## 記事作成のルール
1. 最初の行に「# タイトル」形式で記事タイトルを付ける（テーマのタイトルをそのまま使わず、内容に合った魅力的なタイトルにする）
2. 読者が共感しやすい、親しみやすい文章で書く
3. 改行を適切に使い、読みやすくする
4. 段落の区切りには空行を入れる
5. 見出し（##）を使って構成を整理する
6. ${targetLength.toLocaleString()}文字程度の記事にする
7. インタビューの質問・回答形式そのままではなく、自然な記事に再構成する
8. 「ですます調」を使用する
9. noteの読者層を意識した、カジュアルだが内容のある文章にする
10. マークダウン記法はnoteで使える範囲に限定する（#, ##, ###, **太字**, 改行）`;
}

function generateMockArticle(
  themeTitle: string,
  _themeDescription: string,
  messages: { role: string; content: string }[] | null
): string {
  const userResponses =
    messages
      ?.filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n") ?? "";

  return `# ${themeTitle}について考えたこと

## はじめに

今回は「${themeTitle}」というテーマで、自分の考えをまとめてみました。

## 本題

${userResponses || "ここに記事本文が入ります。"}

## おわりに

最後まで読んでいただきありがとうございます。
この記事が何かのヒントになれば嬉しいです。`;
}
