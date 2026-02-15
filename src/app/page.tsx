import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FileText, MessageSquare, PenLine, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-muted/50 pen-fade-in pt-24 pb-16 text-center">
          <div className="pen-container">
            <div className="bg-primary mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-white">
              <PenLine className="h-8 w-8" />
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight">
              あなたの思考を、
              <br />
              <span className="text-accent">記事</span>に変える。
            </h1>
            <p className="text-muted-foreground mx-auto mb-10 max-w-md text-lg leading-relaxed">
              AIインタビューを通じて、あなたの考えを整理し、
              noteに投稿できる記事を自動生成します。
            </p>
            <Link
              href="/login"
              className="pen-btn pen-btn-accent px-8 py-3 text-base"
            >
              無料で始める
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="pen-container pt-20 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="pen-card text-center">
              <div className="bg-muted mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl">
                <MessageSquare className="text-accent h-6 w-6" />
              </div>
              <h3 className="mb-2 font-bold">AIインタビュー</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                AIが質問を投げかけ、あなたの回答を引き出します。
                自然な対話で思考を深堀りします。
              </p>
            </div>
            <div className="pen-card text-center">
              <div className="bg-muted mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl">
                <Sparkles className="text-accent h-6 w-6" />
              </div>
              <h3 className="mb-2 font-bold">自動記事生成</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                インタビュー内容から、noteに最適化された
                読みやすい記事を自動生成します。
              </p>
            </div>
            <div className="pen-card text-center">
              <div className="bg-muted mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl">
                <FileText className="text-accent h-6 w-6" />
              </div>
              <h3 className="mb-2 font-bold">コピー＆投稿</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                生成された記事をワンクリックでコピー。
                そのままnoteに投稿できます。
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-muted pt-16 pb-20">
          <div className="pen-container">
            <h2 className="mb-10 text-center text-2xl font-bold">使い方</h2>
            <div className="grid gap-8 md:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "テーマを決める",
                  desc: "書きたい記事のテーマを設定",
                },
                {
                  step: "02",
                  title: "メモを追加",
                  desc: "思いついたことをメモに残す",
                },
                {
                  step: "03",
                  title: "インタビュー",
                  desc: "AIが質問、あなたが回答",
                },
                {
                  step: "04",
                  title: "記事完成",
                  desc: "自動生成された記事をコピー",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="text-accent mb-2 text-3xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="mb-1 font-bold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="pen-container py-20 text-center">
          <h2 className="mb-4 text-2xl font-bold">さっそく始めてみましょう</h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-md text-sm leading-relaxed">
            アカウント登録は無料。テーマを作って、AIと対話するだけで記事が完成します。
          </p>
          <Link
            href="/login"
            className="pen-btn pen-btn-accent px-8 py-3 text-base"
          >
            無料で始める
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
