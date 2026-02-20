"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  createStyleReference,
  deleteStyleReference,
  getStyleReferences,
  updateStyleReference,
} from "@/lib/actions/style-references";
import type { StyleReference } from "@/types";
import {
  ArrowLeft,
  Check,
  Edit3,
  Loader2,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function StylesContent() {
  const [styles, setStyles] = useState<StyleReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formText, setFormText] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  const load = useCallback(async () => {
    const result = await getStyleReferences();
    if (result.success) {
      setStyles(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setFormLabel("");
    setFormText("");
    setFormIsDefault(false);
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const handleCreate = async () => {
    if (!formLabel.trim() || !formText.trim()) {
      setError("ラベルと参考記事の本文を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createStyleReference(
      formLabel.trim(),
      formText.trim(),
      formIsDefault
    );
    if (result.success) {
      resetForm();
      await load();
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !formLabel.trim() || !formText.trim()) {
      setError("ラベルと参考記事の本文を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateStyleReference(
      editingId,
      formLabel.trim(),
      formText.trim(),
      formIsDefault
    );
    if (result.success) {
      resetForm();
      await load();
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この文体を削除しますか？")) return;
    const result = await deleteStyleReference(id);
    if (result.success) {
      if (editingId === id) resetForm();
      await load();
    }
  };

  const startEdit = (style: StyleReference) => {
    setEditingId(style.id);
    setFormLabel(style.label);
    setFormText(style.source_text);
    setFormIsDefault(style.is_default);
    setIsAdding(false);
    setError(null);
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="pen-spinner" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-14 pb-8">
          <Link
            href="/"
            className="text-muted-foreground hover:bg-muted hover:text-foreground mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            ホームに戻る
          </Link>

          <div className="mb-8">
            <h1 className="mb-2 text-2xl font-bold">文体設定</h1>
            <p className="text-muted-foreground text-sm">
              参考にしたいnote記事の文体を登録できます。記事生成時に選択すると、そのトーンで記事が書かれます。
            </p>
          </div>

          {/* 登録済み一覧 */}
          <div className="mb-6 space-y-3">
            {styles.length === 0 && !isAdding && (
              <div className="border-border rounded-xl border border-dashed py-12 text-center">
                <p className="text-muted-foreground mb-4 text-sm">
                  文体がまだ登録されていません
                </p>
                <button onClick={startAdd} className="pen-btn pen-btn-accent">
                  <Plus className="h-4 w-4" />
                  最初の文体を登録する
                </button>
              </div>
            )}

            {styles.map((style) =>
              editingId === style.id ? (
                // 編集フォーム（インライン）
                <div
                  key={style.id}
                  className="border-accent bg-card rounded-xl border-2 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold">文体を編集</h3>
                    <button
                      onClick={resetForm}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {renderForm()}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="pen-btn pen-btn-accent"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      保存
                    </button>
                    <button
                      onClick={resetForm}
                      className="pen-btn pen-btn-secondary"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                // 表示カード
                <div
                  key={style.id}
                  className="border-border bg-card group rounded-xl border p-4 transition-colors"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{style.label}</h3>
                      {style.is_default && (
                        <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                          <Star className="h-3 w-3" />
                          デフォルト
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => startEdit(style)}
                        className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors"
                        title="編集"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(style.id)}
                        className="text-muted-foreground hover:text-danger rounded-lg p-1.5 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                    {style.source_text}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {style.source_text.length.toLocaleString()}文字
                  </p>
                </div>
              )
            )}
          </div>

          {/* 新規追加フォーム */}
          {isAdding ? (
            <div className="border-accent bg-card rounded-xl border-2 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">新しい文体を登録</h3>
                <button
                  onClick={resetForm}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {renderForm()}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="pen-btn pen-btn-accent"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  登録する
                </button>
                <button
                  onClick={resetForm}
                  className="pen-btn pen-btn-secondary"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            styles.length > 0 && (
              <button
                onClick={startAdd}
                className="pen-btn pen-btn-secondary w-full"
              >
                <Plus className="h-4 w-4" />
                新しい文体を追加
              </button>
            )
          )}
        </div>
      </main>
      <Footer />
    </div>
  );

  function renderForm() {
    return (
      <>
        {error && <p className="text-danger mb-3 text-sm">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-sm">
              ラベル
            </label>
            <input
              type="text"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              placeholder="例: ○○さん風、カジュアルトーン..."
              className="border-border bg-background focus:border-accent w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-sm">
              参考記事の本文
            </label>
            <textarea
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="参考にしたいnote記事の本文をここに貼り付けてください..."
              rows={8}
              className="border-border bg-background focus:border-accent w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none"
            />
            {formText.length > 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                {formText.length.toLocaleString()}文字
              </p>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={formIsDefault}
              onChange={(e) => setFormIsDefault(e.target.checked)}
              className="accent-accent h-4 w-4 rounded"
            />
            <span className="text-sm">
              デフォルトとして使用（記事生成時に自動選択）
            </span>
          </label>
        </div>
      </>
    );
  }
}

export default function StylesPage() {
  return (
    <AuthGuard>
      <StylesContent />
    </AuthGuard>
  );
}
