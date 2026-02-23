import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  getCurrentVersion,
  getVersions,
  type PromptCategory,
} from "@/lib/prompts/registry";
import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { VersionCard } from "./VersionCard";

export const metadata: Metadata = {
  title: "penの仕組み | pen",
  description:
    "penのインタビュー・ライティングの仕組みとバージョン情報を公開しています。",
};

function getVersionData(category: PromptCategory) {
  return {
    current: getCurrentVersion(category),
    versions: getVersions(category),
  };
}

export default function AiSystemPage() {
  const interviewData = getVersionData("interview");
  const writingData = getVersionData("writing");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-14 pb-8">
          {/* ヘッダー */}
          <div className="mb-10 text-center">
            <div className="bg-muted mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
              <Settings className="text-accent h-8 w-8" />
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight">
              penの仕組み
            </h1>
            <p className="text-muted-foreground mx-auto max-w-lg text-sm leading-relaxed">
              penでは、仕組みをバージョン管理し、すべての記録を公開しています。
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
            label="インタビューAI"
            iconName="MessageSquare"
            current={interviewData.current}
            versions={interviewData.versions}
          />

          {/* ライティングAI */}
          <VersionCard
            label="ライティングAI"
            iconName="PenLine"
            current={writingData.current}
            versions={writingData.versions}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
