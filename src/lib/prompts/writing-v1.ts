/**
 * ライティングプロンプト ver1
 * リリース: 2026-02-19
 *
 * 概要:
 * - プロのライターとしてインタビュー内容からnote記事を生成
 * - 一人称・文体（敬体/常体）をユーザーが選択可能
 * - 参考記事がある場合は続編として構成
 * - noteのマークダウン記法に限定
 */

export function buildWritingPrompt(
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
