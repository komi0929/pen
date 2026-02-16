import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

/**
 * バックグラウンド記事生成API
 * インタビュー完了 → 記事生成 → DB保存 を一括処理
 * クライアントは即座に遷移可能
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      themeId,
      interviewId,
      themeTitle,
      themeDescription,
      targetLength,
      memos,
      messages,
      articleId, // 追加インタビュー時の既存記事ID
    } = body;

    // 1. インタビューを完了ステータスに更新
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("interviews") as any)
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", interviewId);

    // 2. 記事を生成
    const apiKey = process.env.GEMINI_API_KEY;
    let title: string;
    let content: string;

    if (!apiKey) {
      // モック
      title = themeTitle || "無題の記事";
      content = generateMockArticle(themeTitle, messages);
    } else {
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

      const interviewText = (messages ?? [])
        .map(
          (m: { role: string; content: string }) =>
            `${m.role === "assistant" ? "インタビュアー" : "回答者"}: ${m.content}`
        )
        .join("\n\n");

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

      const lines = rawResponse.trim().split("\n");
      title = themeTitle;
      content = rawResponse;

      if (lines[0].startsWith("# ")) {
        title = lines[0].replace(/^#\s*/, "").trim();
        content = lines.slice(1).join("\n").trim();
      } else if (lines[0].startsWith("## ")) {
        title = lines[0].replace(/^##\s*/, "").trim();
        content = lines.slice(1).join("\n").trim();
      }
    }

    // 3. 記事をDB保存
    const wordCount = content.length;

    if (articleId) {
      // 追加インタビュー: 既存記事を上書き
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("articles") as any)
        .update({
          title,
          content,
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", articleId);
    } else {
      // 新規記事
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("articles") as any).insert({
        theme_id: themeId,
        interview_id: interviewId,
        user_id: user.id,
        title,
        content,
        word_count: wordCount,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Async article generation error:", error);
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
