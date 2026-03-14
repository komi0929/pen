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
              あなたの中にしかない話を、
              <br />
              読まれ続ける記事にする。
            </h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-lg text-base leading-relaxed sm:text-lg">
              AIが深く問いかけ、あなたの経験や考えを引き出す。
              <br className="hidden sm:block" />
              出てきた一次情報を、noteで長く読まれる作品に仕上げます。
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
                  読まれ続ける記事に共通する3つの条件
                </p>
                <div className="space-y-2">
                  {[
                    "書き手自身の経験に根ざした一次情報がある",
                    "繰り返し検索される普遍的な問いに答えている",
                    "ひとつのテーマを徹底的に深掘りしている",
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
            Section 3: penの考え方 — 悪い効率化 vs 良い効率化
            ======================================== */}
        <section className="py-12 sm:py-16">
          <div className="pen-container">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="mb-6 text-2xl font-bold">
                AIに「書かせる」のではなく、
                <br className="sm:hidden" />
                あなたの言葉を「引き出す」。
              </h2>
            </div>

            <div className="mx-auto max-w-xl space-y-4">
              {/* 悪い効率化 */}
              <div className="border-border bg-card rounded-xl border p-5 opacity-60">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-danger text-lg">✕</span>
                  <h3 className="font-bold">ありがちなAI執筆</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  AIに丸投げ → 文章は綺麗だけど中身はすっかすか。
                  読んでも一ミリも心が動かない。
                </p>
              </div>

              {/* 良い効率化 */}
              <div className="border-foreground/20 bg-card rounded-xl border-2 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">◎</span>
                  <h3 className="font-bold">penのやり方</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  AIが深く問いかけ、あなたの一次情報を徹底的に引き出す。
                  「自分、こんなこと考えてたんだ！」
                  そんな発見がある記事に仕上がります。
                </p>
              </div>
            </div>

            <p className="text-muted-foreground mx-auto mt-6 max-w-md text-center text-sm leading-relaxed">
              行くまではだるいジムみたいなもの。
              <br />
              15分、集中して頭の中を出し切る。
              <br />
              終わったあとの爽快感が、penの価値です。
            </p>
          </div>
        </section>

        {/* ========================================
            Section 4: 使い方 3ステップ
            ======================================== */}
        <section className="bg-muted py-12 sm:py-16">
          <div className="pen-container">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">
                一次情報を引き出す3ステップ
              </h2>
              <p className="text-muted-foreground text-sm">
                あなたは話すだけ。あとはAIが整えます。
              </p>
            </div>

            <div className="mx-auto max-w-xl space-y-4">
              {[
                {
                  step: "1",
                  icon: Lightbulb,
                  title: "テーマを決める",
                  desc: "「副業で学んだこと」「転職して気づいたこと」など、自由にテーマを設定。迷ったらAI編集者がテーマ探索を手伝います。",
                },
                {
                  step: "2",
                  icon: MessageSquare,
                  title: "AIのインタビューに答える",
                  desc: "AIが質問を投げかけます。答えていくうちに、自分でも気づいていなかった考えが言葉になっていきます。ここが一番大事なステップです。",
                },
                {
                  step: "3",
                  icon: BookOpen,
                  title: "あなたの言葉で記事が完成",
                  desc: "引き出された一次情報をもとに、AIが記事を構成。5つのトーンから雰囲気を選べば、あなたらしい作品に仕上がります。",
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
            Section 5: 主要機能ハイライト
            ======================================== */}
        <section className="py-12 sm:py-16">
          <div className="pen-container">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">
                一次情報を、作品にする機能
              </h2>
              <p className="text-muted-foreground text-sm">
                引き出したあなたの言葉を、読まれる記事に仕上げる道具が揃っています。
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
                  desc: "AIの回答がリアルタイムで表示。テンポよく対話が進み、集中を途切れさせません。",
                },
                {
                  icon: RefreshCw,
                  title: "AIリライト",
                  desc: "記事のトーンを5種類（記録・思考・カジュアル・ティーチ・ストーリー）から選択。同じ内容でも印象ががらりと変わります。",
                },
                {
                  icon: TrendingUp,
                  title: "パーソナル編集者",
                  desc: "AIがあなたの書き手としての強みを分析。テーマ磨き込みやネタ帳で、書くことが習慣になります。",
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
            Section 6: こんな人におすすめ
            ======================================== */}
        <section className="bg-muted py-12 sm:py-16">
          <div className="pen-container">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">こんな人におすすめ</h2>
            </div>

            <div className="mx-auto max-w-xl space-y-3">
              {[
                {
                  emoji: "💭",
                  text: "伝えたいことはあるのに、うまく言葉にできない",
                },
                {
                  emoji: "🔰",
                  text: "noteを始めたいけど、何を書いたら読まれるかわからない",
                },
                {
                  emoji: "😤",
                  text: "AI任せの薄っぺらい文章は嫌。自分の考えをちゃんと届けたい",
                },
                {
                  emoji: "✨",
                  text: "自分の経験を、誰かの役に立つ作品にしたい",
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
            Section 7: スマホ & 品質
            ======================================== */}
        <section className="py-12 sm:py-16">
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
            Section 8: コンセプト — ジムのメタファー
            ======================================== */}
        <section className="bg-muted py-12 sm:py-16">
          <div className="pen-container">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="mb-6 text-2xl font-bold">penが目指すこと</h2>
              <div className="space-y-4 text-left">
                <p className="leading-relaxed">
                  「楽に記事をつくる」ツールではありません。
                </p>
                <p className="leading-relaxed">
                  行くまではだるいけど、終わったあとは最高にスッキリする——
                  penは、そんな「ジムのような体験」を目指しています。
                </p>
                <p className="leading-relaxed">
                  15分、集中して、頭の中にあるものを全部出し切る。
                  AIに整えてもらうのではなく、自分の言葉で語り切る。
                  その先に「ああ、自分、こんなこと考えてたんだ」という驚きがあります。
                </p>
                <p className="leading-relaxed">
                  あなたしか持っていない一次情報を、読み続けられる作品に変える。
                  それがpenです。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================
            Section 9: CTA（未ログインのみ）
            ======================================== */}
        <section className="py-12 sm:py-16">
          <div className="pen-container">
            <CtaSection />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
