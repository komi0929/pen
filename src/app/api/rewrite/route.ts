import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

/**
 * 記事リライトAPI
 * 既存の記事を指定した文体リファレンスでリライトする
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, styleReferenceId } = body;

    if (!articleId || !styleReferenceId) {
      return NextResponse.json(
        { error: "articleId と styleReferenceId が必要です" },
        { status: 400 }
      );
    }

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

    // 記事を取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: article } = await (supabase.from("articles") as any)
      .select("*, themes(title, description)")
      .eq("id", articleId)
      .eq("user_id", user.id)
      .single();

    if (!article) {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    // 文体リファレンスを取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: styleRef } = await (supabase.from("style_references") as any)
      .select("source_text, label")
      .eq("id", styleReferenceId)
      .eq("user_id", user.id)
      .single();

    if (!styleRef) {
      return NextResponse.json(
        { error: "文体リファレンスが見つかりません" },
        { status: 404 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI APIキーが設定されていません" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const rewritePrompt = `あなたはプロのライターです。以下の既存記事を、参考文体のトーン・リズム・雰囲気にリライトしてください。

## リライトのルール
1. 記事の内容・情報・構造はできるだけ維持する
2. 文体・トーン・リズム・語尾の使い方を参考文体に合わせる
3. 最初の行に「# タイトル」形式でタイトルを付ける（内容に合った魅力的なタイトルに変えてもOK）
4. マークダウン記法はnoteで使える範囲に限定する（#, ##, ###, **太字**, 改行）
5. 参考文体の内容そのものはコピーしない。あくまで文体・雰囲気のみを参考にする

## 参考文体（トーン・スタイルの参考）
---
${styleRef.source_text}
---

## リライト対象の記事
---
# ${article.title}

${article.content}
---`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: rewritePrompt,
    });

    let rawResponse: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(
          "上記の記事を参考文体のトーンでリライトしてください。"
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
      throw new Error("リライトに失敗しました");
    }

    // タイトルとコンテンツを分離
    const lines = rawResponse.trim().split("\n");
    let newTitle = article.title;
    let newContent = rawResponse;

    if (lines[0].startsWith("# ")) {
      newTitle = lines[0].replace(/^#\s*/, "").trim();
      newContent = lines.slice(1).join("\n").trim();
    }

    // 記事を更新
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from("articles") as any)
      .update({
        title: newTitle,
        content: newContent,
        word_count: newContent.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (updateError) {
      return NextResponse.json(
        { error: `記事の更新に失敗しました: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      title: newTitle,
      content: newContent,
    });
  } catch (error) {
    console.error("Rewrite error:", error);
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: `リライトに失敗しました: ${message}` },
      { status: 500 }
    );
  }
}
