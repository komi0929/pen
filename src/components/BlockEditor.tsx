"use client";

import { saveArticleWithHistory } from "@/lib/actions/article-editor";
import { blocksToContent, contentToBlocks } from "@/lib/block-utils";
import type { Article, ArticleBlock, BlockType } from "@/types";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ============================================================
// Block Type Selector
// ============================================================
const BLOCK_TYPE_OPTIONS: {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "heading1",
    label: "大見出し",
    icon: <Heading1 className="h-4 w-4" />,
  },
  {
    type: "heading2",
    label: "中見出し",
    icon: <Heading2 className="h-4 w-4" />,
  },
  {
    type: "heading3",
    label: "小見出し",
    icon: <Heading3 className="h-4 w-4" />,
  },
  { type: "paragraph", label: "段落", icon: <Type className="h-4 w-4" /> },
  { type: "list", label: "箇条書き", icon: <List className="h-4 w-4" /> },
  {
    type: "ordered-list",
    label: "番号リスト",
    icon: <ListOrdered className="h-4 w-4" />,
  },
  { type: "divider", label: "区切り線", icon: <Minus className="h-4 w-4" /> },
];

function BlockTypeSelector({
  currentType,
  onChange,
  onClose,
}: {
  currentType: BlockType;
  onChange: (type: BlockType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="border-border bg-card absolute top-full left-0 z-50 mt-1 w-44 rounded-xl border shadow-lg"
    >
      {BLOCK_TYPE_OPTIONS.map((opt) => (
        <button
          key={opt.type}
          onClick={() => {
            onChange(opt.type);
            onClose();
          }}
          className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
            currentType === opt.type
              ? "bg-accent/10 text-accent font-bold"
              : "hover:bg-muted text-foreground"
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Single Block Component
// ============================================================
function EditorBlock({
  block,
  index,
  totalBlocks,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onTypeChange,
  isDragTarget,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onTouchStart,
}: {
  block: ArticleBlock;
  index: number;
  totalBlocks: number;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onTypeChange: (id: string, type: BlockType) => void;
  isDragTarget: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onTouchStart: (e: React.TouchEvent, id: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [block.content, autoResize]);

  if (block.type === "divider") {
    return (
      <div
        className={`block-editor-block ${isDragTarget ? "block-editor-drop-target" : ""} ${isDragging ? "block-editor-dragging" : ""}`}
        draggable
        onDragStart={(e) => onDragStart(e, block.id)}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
      >
        <div className="block-editor-handle">
          <div
            className="block-editor-grip"
            onTouchStart={(e) => onTouchStart(e, block.id)}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="block-editor-arrows">
            <button
              onClick={() => onMoveUp(block.id)}
              disabled={index === 0}
              className="block-editor-arrow-btn"
              aria-label="上に移動"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onMoveDown(block.id)}
              disabled={index === totalBlocks - 1}
              className="block-editor-arrow-btn"
              aria-label="下に移動"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center">
          <hr className="border-border w-full border-t-2 border-dashed" />
        </div>
        <button
          onClick={() => onDelete(block.id)}
          className="block-editor-delete-btn"
          aria-label="ブロックを削除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // テキスト系ブロックのスタイル
  const textareaClasses: Record<string, string> = {
    heading1: "text-xl font-bold",
    heading2: "text-lg font-bold",
    heading3: "text-base font-bold",
    paragraph: "text-sm",
    list: "text-sm",
    "ordered-list": "text-sm",
  };

  const placeholder: Record<string, string> = {
    heading1: "大見出しを入力...",
    heading2: "中見出しを入力...",
    heading3: "小見出しを入力...",
    paragraph: "テキストを入力...",
    list: "項目を改行で区切って入力...",
    "ordered-list": "項目を改行で区切って入力...",
  };

  return (
    <div
      className={`block-editor-block ${isDragTarget ? "block-editor-drop-target" : ""} ${isDragging ? "block-editor-dragging" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, block.id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      {/* グリップ＆上下ボタン */}
      <div className="block-editor-handle">
        <div
          className="block-editor-grip"
          onTouchStart={(e) => onTouchStart(e, block.id)}
          onClick={() => setShowTypeSelector(!showTypeSelector)}
        >
          <GripVertical className="h-4 w-4" />
          <ChevronDown className="h-2.5 w-2.5 opacity-40" />
        </div>
        <div className="block-editor-arrows">
          <button
            onClick={() => onMoveUp(block.id)}
            disabled={index === 0}
            className="block-editor-arrow-btn"
            aria-label="上に移動"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(block.id)}
            disabled={index === totalBlocks - 1}
            className="block-editor-arrow-btn"
            aria-label="下に移動"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="min-w-0 flex-1">
        {/* テキスト入力 */}
        <textarea
          ref={textareaRef}
          value={block.content}
          onChange={(e) => {
            onUpdate(block.id, e.target.value);
          }}
          onInput={autoResize}
          placeholder={placeholder[block.type] || "テキストを入力..."}
          className={`block-editor-textarea ${textareaClasses[block.type] || ""}`}
          rows={1}
        />

        {/* ブロックタイプ変更（非表示、ハンドルタップで開く） */}
        {showTypeSelector && (
          <div className="relative">
            <BlockTypeSelector
              currentType={block.type}
              onChange={(type) => onTypeChange(block.id, type)}
              onClose={() => setShowTypeSelector(false)}
            />
          </div>
        )}
      </div>

      {/* 削除ボタン */}
      <button
        onClick={() => onDelete(block.id)}
        className="block-editor-delete-btn"
        aria-label="ブロックを削除"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ============================================================
// Add Block Button
// ============================================================
function AddBlockButton({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div ref={ref} className="block-editor-add-wrapper">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="block-editor-add-btn"
        aria-label="ブロックを追加"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      {showMenu && (
        <div className="border-border bg-card absolute left-1/2 z-50 mt-1 w-44 -translate-x-1/2 rounded-xl border shadow-lg">
          {BLOCK_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => {
                onAdd(opt.type);
                setShowMenu(false);
              }}
              className="hover:bg-muted text-foreground flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Block Editor
// ============================================================
export function BlockEditor({
  article,
  onSaved,
  onCancel,
}: {
  article: Article;
  onSaved: (updated: {
    title: string;
    content: string;
    word_count: number;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(article.title);
  const [blocks, setBlocks] = useState<ArticleBlock[]>(() =>
    contentToBlocks(article.content)
  );
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | "error"
  >("saved");
  const [lastSavedContent, setLastSavedContent] = useState(article.content);
  const [lastSavedTitle, setLastSavedTitle] = useState(article.title);

  // ドラッグ＆ドロップ
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // タッチ ドラッグ
  const touchState = useRef<{
    id: string;
    startY: number;
    element: HTMLElement | null;
    clone: HTMLElement | null;
    moved: boolean;
  } | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // タイトルの初期高さ調整
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, []);

  // ============================================================
  // hasChanges の同期計算
  // ============================================================
  const currentContent = useMemo(() => blocksToContent(blocks), [blocks]);
  const hasChanges =
    currentContent !== lastSavedContent || title !== lastSavedTitle;

  // 未保存変更のステータス更新
  useEffect(() => {
    if (hasChanges && saveStatus === "saved") {
      setSaveStatus("unsaved");
    }
  }, [hasChanges, saveStatus]);

  // ============================================================
  // 自動保存（debounce 2秒）
  // ============================================================
  useEffect(() => {
    if (!hasChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!isMounted.current) return;
      await performSave(title, blocks);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, blocks]);

  // ============================================================
  // 離脱警告
  // ============================================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // ============================================================
  // 保存実行
  // ============================================================
  const performSave = useCallback(
    async (currentTitle: string, currentBlocks: ArticleBlock[]) => {
      setSaveStatus("saving");
      const content = blocksToContent(currentBlocks);
      const result = await saveArticleWithHistory(
        article.id,
        currentTitle,
        content
      );

      if (!isMounted.current) return;

      if (result.success) {
        setSaveStatus("saved");
        setLastSavedContent(content);
        setLastSavedTitle(currentTitle);
        onSaved({ title: currentTitle, content, word_count: content.length });
      } else {
        setSaveStatus("error");
      }
    },
    [article.id, onSaved]
  );

  // 手動保存
  const handleManualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave(title, blocks);
  }, [title, blocks, performSave]);

  // ============================================================
  // ブロック操作
  // ============================================================
  const handleBlockUpdate = useCallback((id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  }, []);

  const handleBlockDelete = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev; // 最後の1つは消さない
      return prev.filter((b) => b.id !== id);
    });
  }, []);

  const handleMoveUp = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleTypeChange = useCallback((id: string, type: BlockType) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        // divider に変更する場合、content を空に
        if (type === "divider") return { ...b, type, content: "" };
        return { ...b, type };
      })
    );
  }, []);

  const handleAddBlock = useCallback((afterIndex: number, type: BlockType) => {
    const newBlock: ArticleBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      content: type === "divider" ? "" : "",
    };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newBlock);
      return next;
    });
  }, []);

  // ============================================================
  // HTML Drag & Drop (insertion-based)
  // ============================================================
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    const target = e.currentTarget as HTMLElement;
    if (target) {
      e.dataTransfer.setDragImage(target, 20, 20);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragId && dropIndex !== null) {
      setBlocks((prev) => {
        const dragIdx = prev.findIndex((b) => b.id === dragId);
        if (dragIdx < 0) return prev;
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        // Adjust insertion index after removal
        const insertAt = dropIndex > dragIdx ? dropIndex - 1 : dropIndex;
        next.splice(insertAt, 0, moved);
        return next;
      });
    }
    setDragId(null);
    setDropIndex(null);
  }, [dragId, dropIndex]);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const dragIdx = blocks.findIndex((b) => b.id === dragId);
      // Determine if drop should be before or after this block
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertIdx = e.clientY < midY ? index : index + 1;
      // Don't show indicator at the block's own position
      if (insertIdx !== dragIdx && insertIdx !== dragIdx + 1) {
        setDropIndex(insertIdx);
      } else {
        setDropIndex(null);
      }
    },
    [dragId, blocks]
  );

  // ============================================================
  // Touch Drag & Drop (モバイル・挙入方式)
  // ============================================================
  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    const touch = e.touches[0];
    const target = (e.currentTarget as HTMLElement).closest(
      ".block-editor-block"
    ) as HTMLElement;
    if (!target) return;

    touchState.current = {
      id,
      startY: touch.clientY,
      element: target,
      clone: null,
      moved: false,
    };

    // ドラッグ中のブロックを薄く
    target.style.opacity = "0.3";
    target.style.transform = "scale(0.97)";

    const clone = target.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.top = `${target.getBoundingClientRect().top}px`;
    clone.style.left = `${target.getBoundingClientRect().left}px`;
    clone.style.width = `${target.offsetWidth}px`;
    clone.style.zIndex = "9999";
    clone.style.opacity = "1";
    clone.style.pointerEvents = "none";
    clone.style.transition = "none";
    clone.style.boxShadow = "0 8px 32px rgba(0,0,0,0.18)";
    clone.style.borderRadius = "12px";
    clone.style.border = "2px solid var(--accent)";
    clone.style.background = "var(--background)";
    clone.style.transform = "scale(1.03)";
    document.body.appendChild(clone);
    touchState.current.clone = clone;
  }, []);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!touchState.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const state = touchState.current;
      state.moved = true;

      if (state.clone) {
        const deltaY = touch.clientY - state.startY;
        const originalTop = state.element?.getBoundingClientRect().top || 0;
        state.clone.style.top = `${originalTop + deltaY}px`;
      }

      // 画面端に近づいたら自動スクロール
      const EDGE_ZONE = 80; // 端からのピクセル数
      const MAX_SPEED = 12; // 最大スクロール速度
      const viewportH = window.innerHeight;
      const touchY = touch.clientY;

      // 既存のスクロールrafをキャンセル
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }

      if (touchY < EDGE_ZONE || touchY > viewportH - EDGE_ZONE) {
        const doAutoScroll = () => {
          let speed = 0;
          if (touchY < EDGE_ZONE) {
            // 上端→上にスクロール
            speed = -MAX_SPEED * (1 - touchY / EDGE_ZONE);
          } else if (touchY > viewportH - EDGE_ZONE) {
            // 下端→下にスクロール
            speed = MAX_SPEED * (1 - (viewportH - touchY) / EDGE_ZONE);
          }
          if (Math.abs(speed) > 0.5) {
            window.scrollBy(0, speed);
            autoScrollRef.current = requestAnimationFrame(doAutoScroll);
          }
        };
        autoScrollRef.current = requestAnimationFrame(doAutoScroll);
      }

      // ドロップ先を特定（ブロック間の挙入位置）
      const blockEls = Array.from(
        document.querySelectorAll(".block-editor-block")
      ) as HTMLElement[];

      // 既存のドロップインジケータをクリア
      document.querySelectorAll(".block-editor-drop-line").forEach((el) => {
        (el as HTMLElement).style.opacity = "0";
      });

      let bestInsertIdx: number | null = null;
      let bestDist = Infinity;

      const dragIdx = blockEls.findIndex(
        (el) =>
          el.closest("[data-block-id]")?.getAttribute("data-block-id") ===
          state.id
      );

      blockEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        // ブロックの上端との距離
        const topDist = Math.abs(touch.clientY - rect.top);
        if (topDist < bestDist && i !== dragIdx && i !== dragIdx + 1) {
          bestDist = topDist;
          bestInsertIdx = i;
        }
        // 最後のブロックの下端
        if (i === blockEls.length - 1) {
          const botDist = Math.abs(touch.clientY - rect.bottom);
          if (
            botDist < bestDist &&
            i + 1 !== dragIdx &&
            i + 1 !== dragIdx + 1
          ) {
            bestDist = botDist;
            bestInsertIdx = i + 1;
          }
        }
      });

      if (bestInsertIdx !== null) {
        setDropIndex(bestInsertIdx);
        // 対応するドロップラインを表示
        const dropLine = document.querySelector(
          `[data-drop-index="${bestInsertIdx}"]`
        ) as HTMLElement;
        if (dropLine) {
          dropLine.style.opacity = "1";
        }
      }
    };

    const handleTouchEnd = () => {
      if (!touchState.current) return;
      const state = touchState.current;

      // 自動スクロール停止
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }

      if (state.element) {
        state.element.style.opacity = "1";
        state.element.style.transform = "";
      }
      if (state.clone) {
        document.body.removeChild(state.clone);
      }

      // ドロップラインをクリア
      document.querySelectorAll(".block-editor-drop-line").forEach((el) => {
        (el as HTMLElement).style.opacity = "0";
      });

      if (state.moved && dropIndex !== null) {
        setBlocks((prev) => {
          const dragIdx = prev.findIndex((b) => b.id === state.id);
          if (dragIdx < 0) return prev;
          const next = [...prev];
          const [moved] = next.splice(dragIdx, 1);
          const insertAt = dropIndex > dragIdx ? dropIndex - 1 : dropIndex;
          next.splice(insertAt, 0, moved);
          return next;
        });
      }

      touchState.current = null;
      setDropIndex(null);
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [dropIndex]);

  // ============================================================
  // 保存ステータス表示
  // ============================================================
  const statusDisplay = useMemo(() => {
    switch (saveStatus) {
      case "saved":
        return (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3.5 w-3.5" />
            保存済み
          </span>
        );
      case "saving":
        return (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            保存中...
          </span>
        );
      case "unsaved":
        return (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <Type className="h-3.5 w-3.5" />
            未保存の変更あり
          </span>
        );
      case "error":
        return (
          <span className="text-danger flex items-center gap-1 text-xs">
            保存エラー
          </span>
        );
    }
  }, [saveStatus]);

  return (
    <div className="block-editor pen-fade-in">
      {/* ヘッダーバー */}
      <div className="block-editor-header">
        <div className="flex items-center gap-3">{statusDisplay}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSave}
            disabled={!hasChanges || saveStatus === "saving"}
            className="pen-btn pen-btn-accent px-4! py-2! text-xs"
          >
            保存
          </button>
          <button
            onClick={() => {
              if (hasChanges) {
                if (
                  !window.confirm(
                    "未保存の変更があります。編集を終了しますか？"
                  )
                )
                  return;
              }
              onCancel();
            }}
            className="pen-btn pen-btn-secondary px-4! py-2! text-xs"
          >
            閉じる
          </button>
        </div>
      </div>

      {/* タイトル入力 */}
      <div className="mb-4">
        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            // 自動リサイズ
            if (titleRef.current) {
              titleRef.current.style.height = "auto";
              titleRef.current.style.height =
                titleRef.current.scrollHeight + "px";
            }
          }}
          placeholder="タイトルを入力..."
          className="pen-input w-full resize-none overflow-hidden text-lg font-bold"
          rows={1}
        />
      </div>

      {/* ブロック一覧 */}
      <div className="block-editor-blocks">
        {/* 先頭へのドロップライン + 追加ボタン */}
        <div
          className="block-editor-drop-line"
          data-drop-index={0}
          style={{ opacity: dropIndex === 0 ? 1 : 0 }}
        />
        <AddBlockButton onAdd={(type) => handleAddBlock(-1, type)} />

        {blocks.map((block, index) => (
          <div key={block.id}>
            <div data-block-id={block.id}>
              <EditorBlock
                block={block}
                index={index}
                totalBlocks={blocks.length}
                onUpdate={handleBlockUpdate}
                onDelete={handleBlockDelete}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onTypeChange={handleTypeChange}
                isDragTarget={false}
                isDragging={dragId === block.id}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
                onTouchStart={handleTouchStart}
              />
            </div>
            {/* ドロップライン（ブロックの下） */}
            <div
              className="block-editor-drop-line"
              data-drop-index={index + 1}
              style={{ opacity: dropIndex === index + 1 ? 1 : 0 }}
            />
            <AddBlockButton onAdd={(type) => handleAddBlock(index, type)} />
          </div>
        ))}
      </div>

      {/* フッター情報 */}
      <div className="text-muted-foreground mt-4 text-center text-xs">
        {blocks.length} ブロック · {currentContent.length.toLocaleString()} 文字
      </div>
    </div>
  );
}
