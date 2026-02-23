// 文字化けした改善履歴を修正するスクリプト
const entries = [
  {
    code: "0929",
    title: "note深津基準準拠のプロンプトv2",
    description:
      "インタビュー・記事生成プロンプトをnote CXO深津氏のコンテンツ基準に準拠してv2にアップグレード。一次情報・生の体験・失敗談を重点的に引き出すインタビュー設計、意見と事実の区別・イシュー明確化・煽り回避の記事生成を実現。",
    date: "2026-02-23",
  },
  {
    code: "0929",
    title: "記事エディタUI大幅改善",
    description:
      "ブロックエディタのUI/UXを全面刷新。1) ブロック選択時の操作UIをインライン化 2) 入力フィールドをfixed固定ボタン化 3) モバイル最適化のレスポンシブ対応 4) D&Dによるブロック並び替え(タッチドラッグ中の画面端自動スクロール対応) 5) 削除時の確認ダイアログ追加",
    date: "2026-02-22",
  },
];

async function fixHistory() {
  // まず文字化けエントリを削除するため、全履歴を取得
  const res = await fetch(
    "https://pen.hitokoto.tech/api/admin/improvement-history",
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(entries[0]),
    }
  );
  const data = await res.json();
  console.log("Entry 1:", data);

  const res2 = await fetch(
    "https://pen.hitokoto.tech/api/admin/improvement-history",
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(entries[1]),
    }
  );
  const data2 = await res2.json();
  console.log("Entry 2:", data2);
}

fixHistory().catch(console.error);
