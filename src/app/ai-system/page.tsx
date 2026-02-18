import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  getCurrentVersion,
  getVersions,
  type PromptCategory,
  type PromptVersion,
} from "@/lib/prompts/registry";
import { Bot, History, MessageSquare, PenLine } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIのしくみ | pen",
  description:
    "penのインタビュー・ライティングAIの仕組みとバージョン情報を公開しています。",
};

function VersionCard({
  category,
  label,
  icon: Icon,
}: {
  category: PromptCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const current = getCurrentVersion(category);
  const versions = getVersions(category);

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-xl">
          <Icon className="text-accent h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{label}</h2>
          <p className="text-muted-foreground text-sm">
            現在のバージョン:{" "}
            <span className="text-accent font-bold">{current.id}</span>
            <span className="ml-2">（{current.date} リリース）</span>
          </p>
        </div>
      </div>

      {/* 現在のバージョンの概要 */}
      <div className="border-accent/20 bg-accent/5 mb-6 rounded-xl border p-5">
        <p className="mb-3 font-bold">{current.summary}</p>
        <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
          {current.description}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="border-border bg-muted rounded-lg border px-2.5 py-1 text-xs font-medium">
            使用モデル: {current.model}
          </span>
        </div>
      </div>

      {/* バージョン履歴タイムライン */}
      {versions.length > 1 && (
        <div>
          <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-bold">
            <History className="h-4 w-4" />
            バージョン履歴
          </h3>
          <div className="space-y-3">
            {versions.map((v: PromptVersion) => (
              <div
                key={v.id}
                className={`border-border rounded-lg border p-4 ${
                  v.id === current.id
                    ? "border-accent/30 bg-accent/5"
                    : "bg-card"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-bold">{v.id}</span>
                  <span className="text-muted-foreground text-xs">
                    {v.date}
                  </span>
                  {v.id === current.id && (
                    <span className="bg-accent/20 text-accent rounded-full px-2 py-0.5 text-xs font-bold">
                      使用中
                    </span>
                  )}
                </div>
                <p className="text-sm">{v.summary}</p>
                {v.changelog && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    変更: {v.changelog}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function AiSystemPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-14 pb-8">
          {/* ヘッダー */}
          <div className="mb-10 text-center">
            <div className="bg-muted mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
              <Bot className="text-accent h-8 w-8" />
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight">
              AIのしくみ
            </h1>
            <p className="text-muted-foreground mx-auto max-w-lg text-sm leading-relaxed">
              penでは、AIの仕組みをバージョン管理し、すべての記録を公開しています。
              <br />
              インタビューとライティングのAIは継続的に改善されます。
            </p>
          </div>

          {/* コンセプト説明 */}
          <div className="bg-muted mb-10 rounded-xl p-6">
            <h2 className="mb-3 text-lg font-bold">📐 運用の方針</h2>
            <ul className="text-muted-foreground space-y-2 text-sm leading-relaxed">
              <li>
                • penのインタビューと記事生成は
                <strong className="text-foreground">
                  AIプロンプト（指示文）
                </strong>
                によって品質が決まります
              </li>
              <li>
                •
                プロンプトは常に改善を重ねますが、変更が裏目に出る可能性もあります
              </li>
              <li>
                •
                そのため全バージョンを厳密に記録し、いつでも前の状態に戻せるようにしています
              </li>
              <li>
                • ユーザーの皆さまに透明性を担保するため、概要を公開しています
              </li>
            </ul>
          </div>

          {/* インタビューAI */}
          <VersionCard
            category="interview"
            label="🎤 インタビューAI"
            icon={MessageSquare}
          />

          {/* ライティングAI */}
          <VersionCard
            category="writing"
            label="✍️ ライティングAI"
            icon={PenLine}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
