import { CtaSection } from "@/components/CtaSection";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  PenLine,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* ========================================
            Section 1: ヒーロー
            ======================================== */}
        <section className="pen-container pen-fade-in pt-16 pb-12 sm:pt-20 sm:pb-16">
          <div className="text-center">
            <div className="bg-primary mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-white">
              <PenLine className="h-8 w-8" />
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              話すだけで、記事になる。
            </h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-lg text-base leading-relaxed sm:text-lg">
              penは、AIとの対話であなたの考えを引き出し、
              <br className="hidden sm:block" />
              noteに投稿できる記事に仕上げるツールです。
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/themes/discover"
                className="pen-btn pen-btn-primary w-full px-8 py-3.5 text-base sm:w-auto"
              >
                <Search className="h-5 w-5" />
                まずはテーマを探してみる
              </Link>
              <Link
                href="/login"
                className="pen-btn pen-btn-secondary w-full px-8 py-3.5 text-base sm:w-auto"
              >
                ログインして記事を書く
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              テーマ探索はログイン不要・無料で始められます
            </p>
          </div>
        </section>

        {/* ========================================
            Section 2: 「何を書けばいいかわからない？」
            ======================================== */}
        <section className="bg-muted py-12 sm:py-16">
          <div className="pen-container">
            <div className="mx-auto max-w-2xl text-center">
              <span className="bg-foreground text-background mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                注目機能
              </span>
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                何を書けばいいかわからない？
              </h2>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed sm:text-base">
                大丈夫。AI編集者が、あなたの経験や知識を引き出しながら
                <br className="hidden sm:block" />
                noteで長く読まれるテーマを一緒に見つけます。
              </p>
            </div>

            <div className="mx-auto mb-8 max-w-lg">
              <div className="bg-card border-border rounded-xl border p-5">
                <p className="mb-3 text-sm font-bold">
                  noteの調査でわかった「長く読まれる記事」の条件
                </p>
                <div className="space-y-2">
                  {[
                    "書き手自身の経験に根ざした一次情報",
                    "繰り返し検索される普遍的な問いへの回答",
                    "ひとつのテーマを徹底的に深掘り",
                  ].map((text, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <span className="bg-foreground text-background mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        ✓
                      </span>
                      <span className="text-muted-foreground">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/themes/discover"
                className="pen-btn pen-btn-accent px-8 py-3.5 text-base"
              >
                <Search className="h-5 w-5" />
                テーマ探索を始める
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================
            Section 3: 使い方 3ステップ
            ======================================== */}
        <section className="py-12 sm:py-16">
          <div className="pen-container">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">
                3ステップで記事が完成
              </h2>
              <p className="text-muted-foreground text-sm">
                書く力は必要ありません。話すだけでOKです。
              </p>
            </div>

            <div className="mx-auto max-w-xl space-y-4">
              {[
                {
                  step: "1",
                  icon: Lightbulb,
                  title: "テーマを決める",
                  desc: "「副業で学んだこと」「転職して気づいたこと」など、自由にテーマを設定。迷ったらAIがテーマ探索を手伝います。",
                },
                {
                  step: "2",
                  icon: MessageSquare,
                  title: "AIと話す",
                  desc: "AIが質問を投げかけるので答えるだけ。あなたの経験や考えが、自然に言葉になっていきます。",
                },
                {
                  step: "3",
                  icon: BookOpen,
                  title: "記事が完成",
                  desc: "対話の内容をもとにAIが記事を自動生成。5つのトーンから文体を選んで、好みの雰囲気に仕上がります。",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="border-border bg-card flex items-start gap-4 rounded-xl border p-5 transition-shadow hover:shadow-md"
                >
                  <div className="bg-foreground text-background flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="mb-1 font-bold">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================
            Section 4: 主要機能ハイライト
            ======================================== */}
        <section className="bg-muted py-12 sm:py-16">
          <div className="pen-container">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">
                penにできること
              </h2>
              <p className="text-muted-foreground text-sm">
                記事を書くためのすべてが揃っています。
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Search,
                  title: "テーマ探索",
                  desc: "AI編集者との対話でテーマを発掘。あなたの経験から「書くべきテーマ」を3つの基準で見つけます。ログイン不要。",
                  tag: "人気機能",
                },
                {
                  icon: Zap,
                  title: "ストリーミングAI",
                  desc: "AIの回答がリアルタイムで表示。待ち時間なく、テンポよく対話が進みます。",
                },
                {
                  icon: RefreshCw,
                  title: "AIリライト",
                  desc: "完成した記事を5つのトーン（記録・思考・カジュアル・ティーチ・ストーリー）で書き直し。文体を変えるだけで印象が変わります。",
                },
                {
                  icon: TrendingUp,
                  title: "成長トラッキング",
                  desc: "テーマ磨き込みやメモ機能で、あなたのライティングの変化を記録。AIがパーソナル編集者として寄り添います。",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="border-border bg-card flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{item.title}</h3>
                      {item.tag && (
                        <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {item.tag}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================
            Section 5: こんな人におすすめ
            ======================================== */}
        <section className="py-12 sm:py-16">
          <div className="pen-container">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">こんな人におすすめ</h2>
            </div>

            <div className="mx-auto max-w-xl space-y-3">
              {[
                {
                  emoji: "💭",
                  text: "書きたいことはあるけど、うまく言葉にできない",
                },
                {
                  emoji: "⏰",
                  text: "記事を書く時間がなかなか取れない",
                },
                {
                  emoji: "🔰",
                  text: "noteやブログを始めたいけど、何を書けばいいかわからない",
                },
                {
                  emoji: "✨",
                  text: "自分の経験を誰かの役に立つ情報にしたい",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="border-border bg-card flex items-center gap-4 rounded-xl border px-5 py-4 transition-shadow hover:shadow-md"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <p className="text-sm font-bold">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================
            Section 6: スマホ対応 & 品質
            ======================================== */}
        <section className="bg-muted py-12 sm:py-16">
          <div className="pen-container">
            <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
              <div className="border-border bg-card rounded-xl border p-5 text-center">
                <Smartphone className="mx-auto mb-3 h-8 w-8" />
                <h3 className="mb-1 font-bold">スマホ対応</h3>
                <p className="text-muted-foreground text-sm">
                  通勤中やちょっとした空き時間に。
                  <br />
                  ホーム画面に追加してアプリのように使えます。
                </p>
              </div>
              <div className="border-border bg-card rounded-xl border p-5 text-center">
                <TrendingUp className="mx-auto mb-3 h-8 w-8" />
                <h3 className="mb-1 font-bold">継続的な改善</h3>
                <p className="text-muted-foreground text-sm">
                  累計130件超の改善を実施。
                  <br />
                  ユーザーの声をもとに毎週アップデートしています。
                </p>
                <Link
                  href="/improvements"
                  className="text-foreground mt-2 inline-flex items-center gap-1 text-xs font-bold underline underline-offset-2"
                >
                  改善履歴を見る
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================
            Section 7: コンセプト
            ======================================== */}
        <section className="py-12 sm:py-16">
          <div className="pen-container">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="mb-6 text-2xl font-bold">penが目指すこと</h2>
              <div className="space-y-4 text-left">
                <p className="leading-relaxed">
                  「書きたいことはあるのに、うまく言葉にできない」——
                  そんな経験はありませんか？
                </p>
                <p className="leading-relaxed">
                  penは、AIとの対話を通じて自然に考えを整理し、断片的なメモを完成度の高い記事へと昇華させるツールです。
                </p>
                <p className="leading-relaxed">
                  「書く」のではなく「話す」ことで、もっと気軽に、もっと多くの人が発信できる世界を作りたいと思って開発しています。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================
            Section 8: CTA（未ログインのみ）
            ======================================== */}
        <section className="pb-12 sm:pb-16">
          <div className="pen-container">
            <CtaSection />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
