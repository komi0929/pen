import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  FileText,
  Lightbulb,
  MessageSquare,
  PenLine,
  Sparkles,
  StickyNote,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-12 pb-8">
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

          {/* コンセプト */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-bold">✍️ コンセプト</h2>
            <div className="bg-muted rounded-xl p-6">
              <p className="mb-4 leading-relaxed">
                「書きたいことはあるのに、うまく言葉にできない」——
                そんな経験はありませんか？
              </p>
              <p className="mb-4 leading-relaxed">
                penは、AIインタビューを通じてあなたの考えを引き出し、
                整理し、読みやすい記事に変換するツールです。
                ブログや記事を書くハードルを極限まで下げることを目指しています。
              </p>
              <p className="leading-relaxed">
                テーマを設定し、メモを書き、AIと対話するだけ。
                あとはpenが記事を仕上げます。
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
                  title: "テーマを作る",
                  desc: "書きたいテーマを設定します。「副業で学んだこと」「最近読んだ本の感想」など、自由に。",
                },
                {
                  step: "2",
                  icon: StickyNote,
                  title: "メモを書く",
                  desc: "テーマについて思いついたことを、断片的でOK。箇条書きでもメモでも自由に書き溜めます。",
                },
                {
                  step: "3",
                  icon: MessageSquare,
                  title: "AIインタビュー",
                  desc: "AIがあなたに質問を投げかけます。対話を通じて、自分の考えが整理されていきます。",
                },
                {
                  step: "4",
                  icon: FileText,
                  title: "記事が完成",
                  desc: "インタビュー内容から、noteに最適化された読みやすい記事が自動生成されます。ワンクリックでコピー可能。",
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

          {/* 特徴 */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-bold">✨ 特徴</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Sparkles,
                  title: "AIが考えを引き出す",
                  desc: "ただ生成するのではなく、対話を通じてあなたの本音を引き出します。",
                },
                {
                  icon: FileText,
                  title: "note最適化",
                  desc: "生成される記事はnoteのフォーマットに最適化。すぐに投稿できます。",
                },
                {
                  icon: StickyNote,
                  title: "メモから始められる",
                  desc: "完璧な文章は不要。断片的なメモからでも記事が作れます。",
                },
                {
                  icon: PenLine,
                  title: "シンプルなUI",
                  desc: "余計な機能は一切なし。書くことだけに集中できるデザインです。",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="border-border bg-card rounded-xl border p-5"
                >
                  <div className="bg-muted mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg">
                    <item.icon className="text-accent h-5 w-5" />
                  </div>
                  <h3 className="mb-1 font-bold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA — ログインブロック */}
          <section className="mb-12 text-center">
            <div className="bg-muted rounded-xl p-8">
              <h2 className="mb-4 text-2xl font-bold">
                さっそく始めてみましょう
              </h2>
              <p className="text-muted-foreground mx-auto mb-8 max-w-md text-sm leading-relaxed">
                アカウント登録は無料。テーマを作って、AIと対話するだけで記事が完成します。
              </p>
              <Link
                href="/login"
                className="pen-btn pen-btn-primary px-8 py-3 text-base"
              >
                無料で始める
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
