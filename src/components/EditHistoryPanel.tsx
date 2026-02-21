"use client";

import {
  getArticleEditHistory,
  restoreArticleFromHistory,
} from "@/lib/actions/article-editor";
import type { ArticleEditHistory } from "@/types";
import { Clock, Loader2, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function EditHistoryPanel({
  articleId,
  isOpen,
  onClose,
  onRestored,
}: {
  articleId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [history, setHistory] = useState<ArticleEditHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(
    async (signal?: { cancelled: boolean }) => {
      setLoading(true);
      const result = await getArticleEditHistory(articleId);
      if (signal?.cancelled) return;
      if (result.success) {
        setHistory(result.data);
      }
      setLoading(false);
    },
    [articleId]
  );

  useEffect(() => {
    if (!isOpen) return;
    const signal = { cancelled: false };
    loadHistory(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [isOpen, loadHistory]);

  const handleRestore = async (historyId: string) => {
    if (
      !window.confirm("この版に復元しますか？現在の内容は履歴に保存されます。")
    )
      return;
    setRestoring(historyId);
    const result = await restoreArticleFromHistory(articleId, historyId);
    if (result.success) {
      onRestored();
      onClose();
    } else {
      alert("復元に失敗しました");
    }
    setRestoring(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* パネル */}
      <div className="pen-fade-in fixed inset-y-0 right-0 z-50 w-full max-w-md">
        <div className="bg-card border-border flex h-full flex-col border-l shadow-xl">
          {/* ヘッダー */}
          <div className="border-border flex items-center justify-between border-b px-4 py-3">
            <h3 className="flex items-center gap-2 font-bold">
              <Clock className="h-4 w-4" />
              編集履歴
            </h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-2 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 一覧 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  編集履歴はまだありません
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  記事を編集すると、自動的に履歴が作成されます
                </p>
              </div>
            ) : (
              <div className="divide-border divide-y">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {/* 概要行 */}
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === item.id ? null : item.id)
                      }
                      className="w-full px-4 py-3 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {item.title}
                          </p>
                          <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                            <span>{formatDate(item.created_at)}</span>
                            <span>·</span>
                            <span>{item.word_count.toLocaleString()}文字</span>
                            {item.edit_label && (
                              <>
                                <span>·</span>
                                <span className="pen-badge text-[10px]!">
                                  {item.edit_label}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* 展開時: プレビュー＆復元 */}
                    {expandedId === item.id && (
                      <div className="border-border border-t px-4 pt-2 pb-3">
                        <div className="bg-muted mb-3 max-h-48 overflow-y-auto rounded-lg p-3">
                          <p className="text-muted-foreground line-clamp-10 text-xs leading-relaxed whitespace-pre-wrap">
                            {item.content.slice(0, 500)}
                            {item.content.length > 500 && "..."}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestore(item.id)}
                          disabled={restoring === item.id}
                          className="pen-btn pen-btn-secondary w-full py-2! text-xs"
                        >
                          {restoring === item.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              復元中...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-3.5 w-3.5" />
                              この版に復元する
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
