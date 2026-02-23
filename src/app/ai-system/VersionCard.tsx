"use client";

import type { PromptVersion } from "@/lib/prompts/registry";
import {
  ChevronDown,
  ChevronUp,
  History,
  MessageSquare,
  PenLine,
} from "lucide-react";
import { useState } from "react";

const iconMap = {
  MessageSquare,
  PenLine,
} as const;

type IconName = keyof typeof iconMap;

export function VersionCard({
  label,
  iconName,
  current,
  versions,
}: {
  label: string;
  iconName: IconName;
  current: PromptVersion;
  versions: PromptVersion[];
}) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const Icon = iconMap[iconName];

  const toggleVersion = (versionId: string) => {
    setExpandedVersion((prev) => (prev === versionId ? null : versionId));
  };

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
            {versions.map((v: PromptVersion) => {
              const isCurrent = v.id === current.id;
              const isExpanded = expandedVersion === v.id;

              return (
                <div
                  key={v.id}
                  className={`border-border rounded-lg border ${
                    isCurrent ? "border-accent/30 bg-accent/5" : "bg-card"
                  }`}
                >
                  {/* ヘッダー部分（常に表示・クリック可能） */}
                  <button
                    type="button"
                    onClick={() => toggleVersion(v.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-bold">{v.id}</span>
                        <span className="text-muted-foreground text-xs">
                          {v.date}
                        </span>
                        {isCurrent && (
                          <span className="bg-accent/20 text-accent rounded-full px-2 py-0.5 text-xs font-bold">
                            使用中
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{v.summary}</p>
                    </div>
                    <div className="text-muted-foreground ml-3 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {/* 展開された詳細部分 */}
                  {isExpanded && (
                    <div className="border-border border-t px-4 pt-3 pb-4">
                      <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                        {v.description}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="border-border bg-muted rounded-lg border px-2.5 py-1 text-xs font-medium">
                          使用モデル: {v.model}
                        </span>
                      </div>
                      {v.changelog && (
                        <div className="bg-muted mt-3 rounded-lg p-3">
                          <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-line">
                            <span className="font-bold">変更点:</span>
                            {"\n"}
                            {v.changelog}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
