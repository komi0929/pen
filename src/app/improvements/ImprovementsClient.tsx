"use client";

import type {
  ImprovementHistory,
  ImprovementRequest,
} from "@/lib/actions/improvements";
import {
  getImprovementRequests,
  submitImprovementRequest,
  toggleLike,
} from "@/lib/actions/improvements";
import { Clock, Plus, Send, Sparkles, ThumbsUp, X } from "lucide-react";
import { useState, useTransition } from "react";

type Tab = "requests" | "history";

export function ImprovementsClient({
  initialRequests,
  initialHistory,
}: {
  initialRequests: ImprovementRequest[];
  initialHistory: ImprovementHistory[];
}) {
  const [tab, setTab] = useState<Tab>("requests");
  const [requests, setRequests] = useState(initialRequests);
  const [history] = useState(initialHistory);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleLike = (requestId: string) => {
    startTransition(async () => {
      const result = await toggleLike(requestId);
      if (result.success) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  user_liked: result.liked,
                  likes_count: r.likes_count + (result.liked ? 1 : -1),
                }
              : r
          )
        );
      }
    });
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await submitImprovementRequest(
        title.trim(),
        description.trim()
      );
      if (result.success) {
        setTitle("");
        setDescription("");
        setShowForm(false);
        // リフレッシュ
        const updated = await getImprovementRequests();
        setRequests(updated);
      }
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div>
      {/* タブ */}
      <div className="mb-8 flex justify-center">
        <div className="border-border inline-flex gap-1 rounded-full border p-1">
          <button
            onClick={() => setTab("requests")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === "requests"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            改善を希望
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === "history"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            改善履歴
          </button>
        </div>
      </div>

      {/* 改善を希望 */}
      {tab === "requests" && (
        <div className="pen-fade-in space-y-4">
          {/* 要望リスト */}
          {requests.map((r) => (
            <div
              key={r.id}
              className="border-border bg-card rounded-xl border p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    {r.is_official && (
                      <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-xs font-bold">
                        公式
                      </span>
                    )}
                    <h3 className="font-bold">{r.title}</h3>
                  </div>
                  {r.description && (
                    <p className="text-muted-foreground text-sm">
                      {r.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleLike(r.id)}
                  disabled={isPending}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-all ${
                    r.user_liked
                      ? "bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground border"
                  }`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {r.likes_count}
                </button>
              </div>
            </div>
          ))}

          {/* 投稿フォーム */}
          {showForm ? (
            <div className="border-border bg-card rounded-xl border p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">改善を提案する</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="タイトル"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="pen-input mb-3"
              />
              <textarea
                placeholder="補足（任意）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pen-textarea mb-3"
                rows={3}
                style={{ minHeight: "80px" }}
              />
              <button
                onClick={handleSubmit}
                disabled={isPending || !title.trim()}
                className="pen-btn pen-btn-primary w-full"
              >
                <Send className="h-4 w-4" />
                提案を送信
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="border-border text-muted-foreground hover:border-foreground hover:text-foreground flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-4 text-sm font-bold transition-colors"
            >
              <Plus className="h-4 w-4" />
              改善を提案する
            </button>
          )}
        </div>
      )}

      {/* 改善履歴 */}
      {tab === "history" && (
        <div className="pen-fade-in">
          <div className="relative">
            {/* タイムライン線 */}
            <div className="border-border absolute top-0 left-4 h-full w-px border-l-2 border-dashed" />

            {history.map((h, i) => (
              <div key={h.id} className="relative mb-8 pl-10 last:mb-0">
                {/* タイムラインドット */}
                <div className="bg-foreground absolute top-1 left-[11px] h-3 w-3 rounded-full" />

                <p className="text-muted-foreground mb-1.5 text-sm font-bold">
                  {formatDate(h.date)}
                </p>
                <div className="border-border bg-card rounded-xl border p-4">
                  <h3 className="font-bold">{h.title}</h3>
                  {h.description && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {h.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
