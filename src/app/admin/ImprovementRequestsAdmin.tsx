"use client";

import type { ImprovementRequest } from "@/lib/actions/improvements";
import { getImprovementRequests } from "@/lib/actions/improvements";
import { MessageSquare, ThumbsUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function ImprovementRequestsAdmin() {
  const [requests, setRequests] = useState<ImprovementRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getImprovementRequests();
    setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="pen-spinner" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="border-border bg-card rounded-xl border px-5 py-8 text-center">
        <MessageSquare className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
        <p className="text-muted-foreground text-sm">
          まだ改善要望は投稿されていません
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-xl border">
      {requests.map((r) => (
        <div key={r.id} className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                {r.is_official && (
                  <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-xs font-bold">
                    公式
                  </span>
                )}
                <h3 className="text-sm font-bold">{r.title}</h3>
              </div>
              {r.description && (
                <p className="text-muted-foreground text-xs">{r.description}</p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">
                {new Date(r.created_at).toLocaleDateString("ja-JP")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-sm">
              <ThumbsUp className="h-3.5 w-3.5" />
              <span className="font-bold">{r.likes_count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
