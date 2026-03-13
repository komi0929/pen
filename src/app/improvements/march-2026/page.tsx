import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ChevronLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "2026年3月アップデート詳細 — pen",
  description:
    "テーマ探索の進化・スマホ対応・ストリーミングAI応答・PWA対応など、3月13-14日の大型改善詳細",
};

const sections = [
  {
    emoji: "🧭",
    title: "テーマ探索エディターモードの進化",
    items: [
      "プロンプトv3: 3回目のやり取りで必ずテーマ候補を提案するように改善。ダラダラした質問が続く問題を解消しました",
      "プロンプトv4: 過去に探索したテーマを記憶し、同じテーマを二度と提案しないように。利用回数に応じてAIの口調も変化します",
      "会話の永続化: ブラウザを閉じても次回アクセス時に続きから再開できるようになりました",
      "テーマ選択後、3つの品質基準（一次性・普遍性・深掘り）に基づくアドバイスを表示",
      "リピーターUX: プロフィール情報を蓄積し、2回目以降は自己紹介をスキップ。別角度からの探索も可能に",
    ],
  },
  {
    emoji: "✍️",
    title: "AI記事生成の大幅強化",
    items: [
      "ストリーミング応答: AIの回答がリアルタイムで文字ごとに表示されるように。体感の待ち時間を大幅に短縮しました",
      "ディープリライト: インタビュー素材を元に、5つのトーン（記録・思考・カジュアル・ティーチ・ストーリー）で記事を根本から再構成",
      "パーソナル編集者v5: AIが「編集者メモ」を記録し、あなたの書き手としての強みやトピック傾向を分析",
      "記事構成案: テーマ確定後、執筆前に具体的な構成案と改善アドバイスを表示",
    ],
  },
  {
    emoji: "📱",
    title: "スマートフォン対応の抜本的改善",
    items: [
      "タッチ操作: すべてのボタン・リンクのタップ領域を44px以上に拡大。指の太い方でも押しやすくなりました",
      "iOSオートズーム防止: 入力欄をタップした時にページが勝手に拡大される問題を解消",
      "IME誤送信防止: 日本語入力中にEnterキーで変換を確定する際、メッセージが誤って送信される問題を修正",
      "アクションバーのflex-wrap: スマホの狭い画面でボタンが画面外にはみ出る問題を修正",
      "文体設定のスマホ対応: 文体選択画面がスマホで正しく表示されるように改善",
      "スキップボタンの配置改善: 入力欄との距離を確保し、うっかりタップを防止",
    ],
  },
  {
    emoji: "📲",
    title: "PWA対応（ホーム画面に追加）",
    items: [
      "penをホーム画面に追加すると、アプリのように全画面で利用できます",
      "ファビコン・PWAアイコン・Apple Touch Iconのデザインを統一",
      "トースト通知: 操作の成功・失敗が画面上部に通知されるようになりました",
      "haptic feedback: 対応デバイスで操作時に軽い振動フィードバック",
      "オフライン検知: ネットワーク切断時にメッセージを表示",
    ],
  },
  {
    emoji: "🔍",
    title: "品質監査による徹底改善",
    items: [
      "カスタマージャーニー監査: 5つの利用パターン（初回・リピーター・ログイン済み・テーマ磨き込み・過去テーマ閲覧）を網羅的にテスト。致命的バグ3件を含む9件を修正",
      "ログイン後のテーマ消失バグ修正: テーマ探索中にログインすると探索結果が消える問題を解消",
      "テーマメモ（ネタ帳）: テーマごとにメモを残し、思いついたネタをストック可能に",
      "成長トラッキング: インタビューや記事作成の履歴から、あなたのライティング傾向を可視化",
    ],
  },
  {
    emoji: "⚡",
    title: "UXポリッシュ・細部の改善",
    items: [
      "スクロール追従: チャット画面でAIの回答が追加されると自動スクロール",
      "戻るボタンの改善: ブラウザバックで元の画面に適切に戻れるように",
      "削除確認: テーマや記事を削除する前に確認ダイアログを表示",
      "ローディング演出: 記事生成中の待機画面を追加",
      "SEOメタデータ: 各ページに最適化されたタイトル・説明文を設定",
      "テーマカードの段差アニメーション: 一覧表示時に心地よいアニメーション追加",
      "sticky CTA: スクロールしても常にアクセスできるCTAボタン",
    ],
  },
];

export default function MarchUpdatePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-14 pb-8">
          {/* 戻るリンク */}
          <Link
            href="/improvements"
            className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm font-bold transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            改善計画に戻る
          </Link>

          {/* ヘッダー */}
          <div className="mb-10 text-center">
            <div className="bg-foreground text-background mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              大型アップデート
            </div>
            <h1 className="mb-2 text-2xl font-bold">
              2026年3月 アップデート詳細
            </h1>
            <p className="text-muted-foreground text-sm">
              3月13-14日に実施した改善の詳細をお伝えします
            </p>
          </div>

          {/* セクション */}
          <div className="space-y-8">
            {sections.map((section, i) => (
              <div
                key={i}
                className="border-border bg-card rounded-xl border p-5 transition-shadow hover:shadow-md sm:p-6"
              >
                <h2 className="mb-4 text-lg font-bold">
                  {section.emoji} {section.title}
                </h2>
                <ul className="space-y-3">
                  {section.items.map((item, j) => (
                    <li
                      key={j}
                      className="text-muted-foreground flex items-start gap-2 text-sm"
                    >
                      <span className="text-foreground mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* フッターメッセージ */}
          <div className="mt-10 text-center">
            <p className="text-muted-foreground text-sm">
              ご質問やご要望は
              <Link
                href="/improvements"
                className="text-foreground mx-1 font-bold underline underline-offset-2"
              >
                改善計画ページ
              </Link>
              にてお気軽にお寄せください。
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
