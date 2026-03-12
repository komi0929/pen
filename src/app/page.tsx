import { CtaSection } from "@/components/CtaSection";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Lightbulb, MessageSquare, PenLine, Search, StickyNote } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-14 pb-8">
          {/* ヒーロー */}
          <div className="mb-12 text-center">
            <div className="bg-primary mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-white">
              <PenLine className="h-8 w-8" />
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight">penとは</h1>
            <p className="text-muted-foreground mx-auto max-w-lg text-lg leading-relaxed">
              あなたの頭の中にある考えを、AIとの対話を通じて
              noteに投稿できる記事に変えるツールです。
            </p>
          </div>

          {/* テーマ探索CTA — 目玉機能 */}
          <section className="mb-12">
            <div className="border-accent/20 bg-card relative overflow-hidden rounded-2xl border p-6 sm:p-8">
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-xl">
                    <Search className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="bg-accent/10 text-accent mb-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                      NEW
                    </span>
                    <h2 className="text-xl font-bold">何を書けばいいかわからない？</h2>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 max-w-lg text-sm leading-relaxed">
                  AI編集者があなたの経験を引き出し、noteで長く読まれるテーマを一緒に見つけます。
                  ログイン不要で今すぐ始められます。
                </p>
                <div className="bg-muted mb-5 rounded-xl p-4">
                  <p className="mb-2 text-xs font-bold">noteの調査でわかった「長く読まれる記事」の条件</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>✓ 書き手自身の経験に根ざした一次情報</li>
                    <li>✓ 繰り返し検索される普遍的な問いへの回答</li>
                    <li>✓ ひとつのテーマを徹底的に深掘り</li>
                  </ul>
                </div>
                <Link
                  href="/themes/discover"
                  className="pen-btn pen-btn-accent px-6 py-3 text-base"
                >
                  <Search className="h-5 w-5" />
                  テーマ探索を始める
                </Link>
              </div>
            </div>
          </section>

          {/* コンセプト */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-bold">✍️ コンセプト</h2>
            <div className="bg-muted rounded-xl p-6">
              <p className="mb-4 leading-relaxed">
                「書きたいことはあるのに、うまく言葉にできない」——
                そんな経験はありませんか？
              </p>
              <p className="mb-4 leading-relaxed">
                penは、AIとの対話を通じて自然に考えを整理し、断片的なメモを完成度の高い記事へと昇華させるツールです。
              </p>
              <p className="leading-relaxed">
                「書く」のではなく「話す」ことで、もっと気軽に、もっと多くの人が発信できる世界を作りたいと思って開発しています。
              </p>
            </div>
          </section>

          {/* 使い方 */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-bold">📖 使い方</h2>
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  icon: Lightbulb,
                  title: "テーマ設定",
                  desc: "書きたいテーマを設定します。「副業で学んだこと」「最近読んだ本の感想」など、自由に。",
                },
                {
                  step: "2",
                  icon: StickyNote,
                  title: "メモを追加",
                  desc: "テーマについて思いついたことを、断片的でOK。これをもとにインタビューが行われます。",
                },
                {
                  step: "3",
                  icon: MessageSquare,
                  title: "AIインタビュー",
                  desc: "AIがあなたに質問を投げかけます。対話を通じて、記事が出来上がります。",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="border-border bg-card flex items-start gap-4 rounded-xl border p-4"
                >
                  <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <item.icon className="text-accent h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-bold">
                      <span className="text-accent mr-2">Step {item.step}</span>
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA — 未ログインユーザーのみ表示 */}
          <CtaSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
