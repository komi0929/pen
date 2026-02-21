import type { ArticleBlock, BlockType } from "@/types";

// ============================================================
// ブロック ↔ マークダウン変換ユーティリティ
// ============================================================

let blockIdCounter = 0;
function generateBlockId(): string {
  blockIdCounter++;
  return `block-${Date.now()}-${blockIdCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

/** マークダウン文字列 → ブロック配列 */
export function contentToBlocks(content: string): ArticleBlock[] {
  const lines = content.split("\n");
  const blocks: ArticleBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行をスキップ（段落の区切りとして扱う）
    if (!trimmed) {
      i++;
      continue;
    }

    // 水平線
    if (/^---+$/.test(trimmed)) {
      blocks.push({ id: generateBlockId(), type: "divider", content: "" });
      i++;
      continue;
    }

    // 見出し
    if (trimmed.startsWith("### ")) {
      blocks.push({
        id: generateBlockId(),
        type: "heading3",
        content: trimmed.slice(4),
      });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({
        id: generateBlockId(),
        type: "heading2",
        content: trimmed.slice(3),
      });
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({
        id: generateBlockId(),
        type: "heading1",
        content: trimmed.slice(2),
      });
      i++;
      continue;
    }

    // 番号付きリスト（連続する行をまとめる）
    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s/, ""));
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: "ordered-list",
        content: items.join("\n"),
      });
      continue;
    }

    // 箇条書きリスト（連続する行をまとめる）
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))
      ) {
        items.push(lines[i].trim().replace(/^[-*]\s/, ""));
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: "list",
        content: items.join("\n"),
      });
      continue;
    }

    // 通常の段落（連続するテキスト行をまとめる）
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^---+$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("# ") &&
      !lines[i].trim().startsWith("## ") &&
      !lines[i].trim().startsWith("### ") &&
      !/^\d+[.)]\s/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("- ") &&
      !lines[i].trim().startsWith("* ")
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }
    if (paragraphLines.length > 0) {
      blocks.push({
        id: generateBlockId(),
        type: "paragraph",
        content: paragraphLines.join("\n"),
      });
    }
  }

  return blocks;
}

/** ブロック配列 → マークダウン文字列 */
export function blocksToContent(blocks: ArticleBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading1":
        parts.push(`# ${block.content}`);
        break;
      case "heading2":
        parts.push(`## ${block.content}`);
        break;
      case "heading3":
        parts.push(`### ${block.content}`);
        break;
      case "paragraph":
        parts.push(block.content);
        break;
      case "list":
        parts.push(
          block.content
            .split("\n")
            .map((item) => `- ${item}`)
            .join("\n")
        );
        break;
      case "ordered-list":
        parts.push(
          block.content
            .split("\n")
            .map((item, idx) => `${idx + 1}. ${item}`)
            .join("\n")
        );
        break;
      case "divider":
        parts.push("---");
        break;
    }
  }

  return parts.join("\n\n");
}

/** ブロックタイプの表示名マッピング */
export function getBlockTypeLabel(type: BlockType): string {
  const labels: Record<BlockType, string> = {
    heading1: "大見出し",
    heading2: "中見出し",
    heading3: "小見出し",
    paragraph: "段落",
    list: "箇条書き",
    "ordered-list": "番号リスト",
    divider: "区切り線",
  };
  return labels[type];
}
