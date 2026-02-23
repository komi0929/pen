/**
 * プロンプトバージョン管理レジストリ
 *
 * すべてのインタビュー・ライティングプロンプトのバージョンを管理する。
 * 新バージョン追加手順:
 *   1. interview-vN.ts / writing-vN.ts を新規作成
 *   2. このファイルの versions 配列にエントリを追加
 *   3. current を新バージョンのIDに変更
 *   4. 問題があれば current を戻すだけでロールバック完了
 */

// ─── 型定義 ───

export type PromptCategory = "interview" | "writing";

export type PromptVersion = {
  /** バージョンID（例: "v1"） */
  id: string;
  /** リリース日 */
  date: string;
  /** 使用AIモデル */
  model: string;
  /** ユーザー向け1行説明 */
  summary: string;
  /** 詳細説明（公開ページ用） */
  description: string;
  /** 前バージョンからの変更点（v1は初版のため省略可） */
  changelog?: string;
};

export type CategoryRegistry = {
  /** アクティブバージョンのID */
  current: string;
  /** 全バージョン一覧（新しい順） */
  versions: PromptVersion[];
};

export type PromptRegistry = {
  interview: CategoryRegistry;
  writing: CategoryRegistry;
};

// ─── レジストリ定義 ───

export const promptRegistry: PromptRegistry = {
  interview: {
    current: "v2",
    versions: [
      {
        id: "v2",
        date: "2026-02-23",
        model: "Gemini 3 Flash",
        summary:
          "note深津基準準拠: 一次情報・生の体験・失敗談を重点的に引き出す",
        description: `noteのCXO深津氏が提唱する「読まれるコンテンツ基準」に準拠したインタビュープロンプト。

**特徴:**
- 一次情報・生の体験・私の気づきを最優先で引き出す
- 具体的エピソード、失敗談、学びを深掘り
- 感情の動き、時系列の変化を意識的に引き出す
- 抽象的な回答には追加質問で解像度を上げる
- 煎り構文や一般論の再生産を避ける方向で質問設計
- 準備度の加点基準を素材の質（一次性・具体性）で評価`,
        changelog: `v1からの変更点:
- note深津CXOのコンテンツ基準をプロンプトに統合
- 「引き出すべき素材」「避けるべき方向性」を明確化
- 質問の流れの指針を追加
- 準備度の加点基準を素材の質で評価するように変更`,
      },
      {
        id: "v1",
        date: "2026-02-19",
        model: "Gemini 3 Flash",
        summary:
          "プロのインタビュアーがメモをもとに1問ずつ深掘りし、記事素材を引き出す",
        description: `AIがプロのライターインタビュアーとして、ユーザーに1問ずつ質問を投げかけます。

**特徴:**
- 一度に1つの質問のみ（回答者の負担を軽減）
- 共感を示す相槌を入れながら自然な対話
- ユーザーのメモを参照して的確な質問を生成
- 回答の深さに応じて準備度（0〜80）を自動評価
- 参考記事がある場合は重複質問を回避し、新しい角度から質問
- 質問スキップに対応（別の話題で質問を再生成）`,
      },
    ],
  },
  writing: {
    current: "v2",
    versions: [
      {
        id: "v2",
        date: "2026-02-23",
        model: "Gemini 3 Flash",
        summary: "note深津基準準拠: 一次情報ベースの構造化された記事を生成",
        description: `noteのCXO深津氏の「読まれるコンテンツ基準」に準拠した記事生成プロンプト。

**特徴:**
- 一次情報・生の体験を記事の柱にする構成
- 意見と事実の明確な区別
- イシューが明確で自己完結したテキスト
- 失敗談・試行錯誤も率直に書く
- 煎り構文・断定表現・一般論の再生産を回避
- 品質チェックリストで基準適合を確認`,
        changelog: `v1からの変更点:
- note深津CXOのコンテンツ基準をプロンプトに統合
- 「重視すべき要素」「避けるべきパターン」を明確化
- 記事の構成ガイドを追加
- 品質チェックリストを追加`,
      },
      {
        id: "v1",
        date: "2026-02-19",
        model: "Gemini 3 Flash",
        summary: "インタビュー内容をnote向けの読みやすい記事に再構成する",
        description: `AIがプロのライターとして、インタビューで得た素材をnoteに投稿できる記事に変換します。

**特徴:**
- インタビューのQ&A形式ではなく、自然な記事として再構成
- 一人称（私/僕/俺/自分/筆者/自由設定）を選択可能
- 文体（です・ます調 / だ・である調）を選択可能
- 目標文字数（300〜3,000字）に対応
- 見出し・段落を適切に使った読みやすいフォーマット
- 参考記事がある場合は続編として構成（重複回避）
- noteで使えるマークダウン記法に限定`,
      },
    ],
  },
};

// ─── ヘルパー関数 ───

/** カテゴリごとのバージョン一覧を取得 */
export function getVersions(category: PromptCategory): PromptVersion[] {
  return promptRegistry[category].versions;
}

/** カテゴリの現在のバージョン情報を取得 */
export function getCurrentVersion(category: PromptCategory): PromptVersion {
  const reg = promptRegistry[category];
  const found = reg.versions.find((v) => v.id === reg.current);
  if (!found)
    throw new Error(`Version ${reg.current} not found for ${category}`);
  return found;
}

/** 特定バージョンの情報を取得 */
export function getVersion(
  category: PromptCategory,
  versionId: string
): PromptVersion | undefined {
  return promptRegistry[category].versions.find((v) => v.id === versionId);
}

// ─── プロンプト関数のエクスポート ───
// 現在のバージョンのプロンプト関数をそのまま公開する。
// バージョン切替時はここのimportを更新するだけ。

export { buildInterviewPrompt } from "./interview-v2";
export { buildWritingPrompt } from "./writing-v2";
