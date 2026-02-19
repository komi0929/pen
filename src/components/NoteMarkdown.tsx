"use client";

/**
 * NoteMarkdown - noteのマークダウン記法に対応したレンダラー
 *
 * 対応記法:
 * - # h1, ## h2, ### h3
 * - **太字**
 * - 改行・空行
 * - --- 水平線
 * - 番号付きリスト (1. 2. 3.)
 * - 箇条書きリスト (- )
 */

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // **太字** をパース
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <strong key={`b-${match.index}`} className="font-bold">
        {match[1]}
      </strong>
    );
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function NoteMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行 → スペーサー
    if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-4" />);
      i++;
      continue;
    }

    // 水平線
    if (/^---+$/.test(trimmed)) {
      elements.push(
        <hr key={`hr-${i}`} className="border-border my-4 border-t" />
      );
      i++;
      continue;
    }

    // 見出し
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="mt-6 mb-2 text-base font-bold">
          {parseInline(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="mt-8 mb-3 text-lg font-bold">
          {parseInline(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="mt-8 mb-4 text-xl font-bold">
          {parseInline(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // 番号付きリスト (連続する行をまとめる)
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const items: { key: number; content: string }[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        items.push({
          key: i,
          content: lines[i].trim().replace(/^\d+[\.\)]\s/, ""),
        });
        i++;
      }
      elements.push(
        <ol
          key={`ol-${items[0].key}`}
          className="my-2 list-decimal space-y-1 pl-6"
        >
          {items.map((item) => (
            <li key={item.key} className="text-sm leading-relaxed">
              {parseInline(item.content)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 箇条書きリスト (連続する行をまとめる)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: { key: number; content: string }[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))
      ) {
        items.push({
          key: i,
          content: lines[i].trim().replace(/^[-*]\s/, ""),
        });
        i++;
      }
      elements.push(
        <ul
          key={`ul-${items[0].key}`}
          className="my-2 list-disc space-y-1 pl-6"
        >
          {items.map((item) => (
            <li key={item.key} className="text-sm leading-relaxed">
              {parseInline(item.content)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 通常の段落
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="note-markdown space-y-1">{elements}</div>;
}
