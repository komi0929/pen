import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

/**
 * バックグラウンド記事生成API
 * インタビュー完了 → 記事生成 → DB保存 を一括処理
 * クライアントは即座に遷移可能
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    themeId,
    interviewId,
    themeTitle,
    themeDescription,
    targetLength,
    memos,
    messages,
    articleId: existingArticleId,
    referenceArticles,
    pronoun,
    writingStyle,
  } = body;
  let articleId = existingArticleId as string | undefined;

  try {
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
        targetLength ?? 2000,
        referenceArticles,
        pronoun,
        writingStyle
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
      const { data: insertedArticle } = await (supabase.from("articles") as any)
        .insert({
          theme_id: themeId,
          interview_id: interviewId,
          user_id: user.id,
          title,
          content,
          word_count: wordCount,
        })
        .select("id")
        .single();

      if (insertedArticle) {
        articleId = insertedArticle.id;
      }
    }
    // 4. Analyticsイベント記録（失敗しても記事生成は成功させる）
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("analytics_events") as any).insert({
        user_id: user.id,
        event_name: "interview_completed",
        event_data: {
          interview_id: interviewId,
          theme_id: themeId,
          word_count: wordCount,
          message_count: messages?.length ?? 0,
        },
      });
    } catch {
      // analyticsテーブル未作成でも記事保存には影響しない
    }

    return NextResponse.json({ success: true, articleId: articleId ?? null });
  } catch (error) {
    console.error("Async article generation error:", error);

    // 記事生成に失敗した場合、インタビューをactiveに戻してリカバリ可能にする
    try {
      const supabase = await createClient();
      if (supabase) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("interviews") as any)
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", interviewId);
      }
    } catch {
      // ステータス復帰失敗はログのみ
      console.error("Failed to revert interview status");
    }

    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      {
        error: `記事の生成に失敗しました。インタビューのデータは保存されているので、再度お試しいただけます。: ${message}`,
      },
      { status: 500 }
    );
  }
}

function buildArticlePrompt(
  themeTitle: string,
  themeDescription: string,
  memos: { content: string }[] | null,
  targetLength: number,
  referenceArticles?: { title: string; content: string }[] | null,
  pronoun?: string,
  writingStyle?: string
): string {
  const memoSection =
    memos && memos.length > 0
      ? `\n\n参考メモ:\n${memos.map((m, i) => `${i + 1}. ${m.content}`).join("\n")}`
      : "";

  const refArticleSection =
    referenceArticles && referenceArticles.length > 0
      ? `\n\n## 参考記事（前提情報）\n以下の記事はユーザーが過去に同じテーマで作成した関連記事です。この記事で既に書かれている内容との重複を避け、続編として自然に読めるようにしてください。前回の記事の内容を「前回の記事では〜」のように自然に参照しても構いません。\n\n${referenceArticles.map((a, i) => `### 既存記事${i + 1}: 「${a.title}」\n${a.content}`).join("\n\n")}`
      : "";

  const effectivePronoun = pronoun || "私";
  const styleLabel =
    writingStyle === "da_dearu"
      ? "「だ・である調（常体）」"
      : "「です・ます調（敬体）」";

  return `あなたはプロのライターです。インタビュー内容をもとに、noteに投稿する記事を作成してください。

## 記事のテーマ
タイトル: ${themeTitle}
${themeDescription ? `説明: ${themeDescription}` : ""}${memoSection}${refArticleSection}

## 記事作成のルール
1. 最初の行に「# タイトル」形式で記事タイトルを付ける（テーマのタイトルをそのまま使わず、内容に合った魅力的なタイトルにする）
2. 読者が共感しやすい、親しみやすい文章で書く
3. 改行を適切に使い、読みやすくする
4. 段落の区切りには空行を入れる
5. 見出し（##）を使って構成を整理する
6. ${targetLength.toLocaleString()}文字程度の記事にする
7. インタビューの質問・回答形式そのままではなく、自然な記事に再構成する
8. ${styleLabel}を使用する
9. 一人称は「${effectivePronoun}」を使用する（他の一人称を混在させない）
10. noteの読者層を意識した、カジュアルだが内容のある文章にする
11. マークダウン記法はnoteで使える範囲に限定する（#, ##, ###, **太字**, 改行）
12. 参考記事がある場合は、内容の重複を避けつつ、テーマの発展・続編として書く`;
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
