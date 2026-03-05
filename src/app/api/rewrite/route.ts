import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

/**
 * 記事リライトAPI
 * - 文体リファレンスでのリライト
 * - フリーフォーマット指示でのリライト
 * - トーンプリセットによるインタビュー素材の再構成（ディープリライト）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      articleId,
      styleReferenceId,
      customInstruction,
      articleTone,
      toneNote,
    } = body;

    if (!articleId) {
      return NextResponse.json(
        { error: "articleId が必要です" },
        { status: 400 }
      );
    }

    if (!styleReferenceId && !customInstruction && !articleTone) {
      return NextResponse.json(
        { error: "文体・トーン・リライト指示のいずれかが必要です" },
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

    // トーンプリセット選択時はインタビュー内容を取得（ディープリライト）
    let interviewText = "";
    if (articleTone && article.interview_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: messages } = await (
        supabase.from("interview_messages") as any
      )
        .select("role, content")
        .eq("interview_id", article.interview_id)
        .order("created_at", { ascending: true });

      if (messages && messages.length > 0) {
        interviewText = messages
          .map(
            (m: { role: string; content: string }) =>
              `${m.role === "assistant" ? "インタビュアー" : "回答者"}: ${m.content}`
          )
          .join("\n\n");
      }
    }

    // 文体リファレンスを取得（指定時のみ）
    let styleRef: { source_text: string; label: string } | null = null;
    if (styleReferenceId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("style_references") as any)
        .select("source_text, label")
        .eq("id", styleReferenceId)
        .eq("user_id", user.id)
        .single();

      if (!data) {
        return NextResponse.json(
          { error: "文体リファレンスが見つかりません" },
          { status: 404 }
        );
      }
      styleRef = data;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI APIキーが設定されていません" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // プロンプト構築
    const rewritePrompt = buildRewritePrompt({
      article,
      interviewText,
      styleRef,
      customInstruction,
      articleTone,
      toneNote,
    });

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: rewritePrompt,
    });

    let rawResponse: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(
          articleTone && interviewText
            ? "インタビュー内容と既存記事をもとに、指定されたトーンで記事を再構成してください。"
            : "上記の記事をリライトしてください。"
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

// ─── プロンプト構築 ───

function buildRewritePrompt(opts: {
  article: {
    title: string;
    content: string;
    themes?: { title?: string; description?: string };
  };
  interviewText: string;
  styleRef: { source_text: string; label: string } | null;
  customInstruction?: string;
  articleTone?: string;
  toneNote?: string;
}): string {
  const {
    article,
    interviewText,
    styleRef,
    customInstruction,
    articleTone,
    toneNote,
  } = opts;

  // トーンプリセット + インタビュー素材がある場合 → ディープリライト
  if (articleTone && interviewText) {
    return buildDeepRewritePrompt(
      article,
      interviewText,
      styleRef,
      articleTone,
      toneNote,
      customInstruction
    );
  }

  // 従来のリライト（文体変更 / フリーフォーマット指示）
  let styleSection = "";
  if (styleRef) {
    styleSection = `
## 参考文体（トーン・スタイルの参考）
---
${styleRef.source_text}
---`;
  }

  let customSection = "";
  if (customInstruction) {
    customSection = `
## ユーザーからの追加指示
${customInstruction}`;
  }

  let toneSection = "";
  if (articleTone) {
    toneSection = `\n${getToneInstruction(articleTone)}`;
  }

  const toneNoteSection = toneNote
    ? `\n## ユーザーからの補足指示（最優先）\n${toneNote}`
    : "";

  return `あなたはプロのライターです。以下の既存記事をリライトしてください。

## リライトのルール
1. 記事の内容・情報・構造はできるだけ維持する
2. ${styleRef ? "文体・トーン・リズム・語尾の使い方を参考文体に合わせる" : "ユーザーの指示に従って文体・トーンを調整する"}
3. 最初の行に「# タイトル」形式でタイトルを付ける（内容に合った魅力的なタイトルに変えてもOK）
4. マークダウン記法はnoteで使える範囲に限定する（#, ##, ###, **太字**, 改行）
5. ${styleRef ? "参考文体の内容そのものはコピーしない。あくまで文体・雰囲気のみを参考にする" : "内容の正確性は維持しつつ、指示どおりのトーンに変える"}
${styleSection}
${customSection}
${toneSection}
${toneNoteSection}

## リライト対象の記事
---
# ${article.title}

${article.content}
---`;
}

/**
 * ディープリライト:
 * インタビュー内容を素材として再分析し、トーンに応じて
 * どの素材を拾い、どう配置するかから再構成する
 */
function buildDeepRewritePrompt(
  article: {
    title: string;
    content: string;
    themes?: { title?: string; description?: string };
  },
  interviewText: string,
  styleRef: { source_text: string; label: string } | null,
  tone: string,
  toneNote?: string,
  customInstruction?: string
): string {
  const toneInstruction = getToneInstruction(tone);
  const themeTitle = article.themes?.title || article.title;

  const styleSection = styleRef
    ? `\n## 参考文体（トーン・スタイルの参考）\n語尾の使い方・リズム感・読者への語りかけ方を模倣してください。内容はコピーしないこと。\n---\n${styleRef.source_text}\n---`
    : "";

  const toneNoteSection = toneNote
    ? `\n## ユーザーからの補足指示（最優先で従うこと）\n${toneNote}`
    : "";

  const customSection = customInstruction
    ? `\n## ユーザーからの追加指示\n${customInstruction}`
    : "";

  return `あなたはnoteのプロのライターです。これは「ディープリライト」です。
単なる文体変更ではなく、**インタビューの生の素材に立ち返り、指定されたトーンに最適な形で記事を一から再構成**してください。

## 最重要原則
同じインタビュー素材でも、トーンが違えば**全く違う記事**になるべきです。
- **拾う素材が変わる**: トーンに合ったエピソード・発言・感情を優先的に選ぶ
- **構成が変わる**: 導入の仕方、展開の順序、結びの着地点がすべて変わる
- **詳細度が変わる**: あるトーンではサラッと触れることが、別のトーンでは深掘りされる
- **タイトルが変わる**: トーンに合った全く新しいタイトルを付ける

## テーマ
${themeTitle}

${toneInstruction}

## 素材の取り扱い指示
以下のインタビュー内容を「素材の宝庫」として読み解いてください。
既存記事は参考にしつつも、トーン指示に従って素材を再選択・再配置してください。

### やるべきこと
1. インタビュー全文を読み、使える素材（エピソード、数字、感情、具体例）をすべて洗い出す
2. 指定トーンに最も映える素材を選び、優先順位を付ける
3. トーンに合った構成（見出し構成・展開順序）を新たに設計する
4. 選んだ素材を新しい構成に配置して記事を書く
5. 既存記事に含まれていない素材もインタビューから積極的に拾う

### 避けるべきこと
- 既存記事の文章をそのまま流用してトーンだけ変えること
- インタビューに言及されていない情報の捏造
- 煽り表現や根拠なき断定

## ルール
1. 最初の行に「# タイトル」形式で新しいタイトルを付ける
2. マークダウン記法はnoteで使える範囲に限定する（#, ##, ###, **太字**, 改行）
3. 既存記事と同程度の文字数を目安にする
4. 記事単体で完結させる
${styleSection}
${customSection}
${toneNoteSection}

## インタビュー内容（生の素材）
---
${interviewText}
---

## 既存記事（参考）
以下は同じインタビューから以前生成された記事です。これとは**異なるアプローチ**で書いてください。
---
# ${article.title}

${article.content}
---`;
}

/**
 * トーンプリセットごとの指示文
 */
function getToneInstruction(tone: string): string {
  switch (tone) {
    case "record":
      return `## 記事のトーン：📝 淡々と記録する
**日記・備忘録スタイル**で書いてください。
- 起きたことを時系列で淡々と記録する
- 教訓や学びを無理に引き出さない。事実の記録が中心
- 感情表現は控えめに。あっさりした語り口
- 「こうすべき」「これが大事」のような説教調は禁止
- まとめ・結論を強調せず、自然に終わる
- 自分用のメモを公開している感覚
- **拾うべき素材**: 日付、場所、やったこと、起きた出来事、具体的な数字`;

    case "think":
      return `## 記事のトーン：💭 考えを整理する
**思考整理・内省スタイル**で書いてください。
- 頭の中を整理するように、自分に語りかける感覚で
- 考えがまとまりきっていない部分もそのまま残してOK
- 「〜かもしれない」「〜な気がする」など曖昧さを許容
- 教訓を押し付けない。「自分はこう感じた」に留める
- 結論を急がず、思考のプロセスそのものを記事にする
- **拾うべき素材**: 心境の変化、迷い、気づきの瞬間、価値観に関する発言`;

    case "casual":
      return `## 記事のトーン：🗣️ 気軽に話す
**カジュアルトーク・雑談スタイル**で書いてください。
- 友達に話しかけるような親しみやすい文体
- 「〜なんですよね」「〜だったんです」などの口語表現
- 堅い表現や専門用語は避ける
- 軽い脱線やツッコミも入れてOK
- シリアスになりすぎない。軽やかさを最優先
- **拾うべき素材**: 面白かったエピソード、意外だったこと、共感を呼ぶ場面`;

    case "teach":
      return `## 記事のトーン：🎯 学びを伝える
**ノウハウ共有・教訓型スタイル**で書いてください。
- 体験から得た具体的な学びを構造化して伝える
- ステップやポイントが明確な構成
- 読者が同じ状況で使える実用情報を提供
- 抽象論ではなく具体的なアクションに落とし込む
- 信頼性のために失敗談やつまずきも正直に書く
- **拾うべき素材**: 実践した手順、失敗と改善、数字による成果、再現可能なノウハウ`;

    case "story":
      return `## 記事のトーン：📖 ストーリーで描く
**物語・ナラティブスタイル**で書いてください。
- 冒頭で引き込むシーンから始める
- 登場人物・場面・会話を具体的に描写する
- 「起承転結」の流れを意識した構成
- 感情の動き、葛藤、転機を丁寧に書く
- 臨場感のある描写（五感を使った表現）
- 教訓は物語の中に自然に溶け込ませる
- **拾うべき素材**: ドラマチックな場面、会話、感情が動いた瞬間、転機となった出来事`;

    default:
      return "";
  }
}
