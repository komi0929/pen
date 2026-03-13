"use client";

import { Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

let addToastFn: ((message: string, type?: "success" | "error") => void) | null = null;

/**
 * グローバルトースト呼び出し
 * コンポーネント外からでも使える
 */
export function showToast(message: string, type: "success" | "error" = "success") {
  addToastFn?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-100 flex -translate-x-1/2 flex-col gap-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in ${
            toast.type === "success"
              ? "bg-gray-900/90 text-white"
              : "bg-red-600/90 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <X className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
          <button
            onClick={() => dismiss(toast.id)}
            className="ml-2 shrink-0 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
