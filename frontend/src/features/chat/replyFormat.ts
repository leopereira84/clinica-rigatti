/**
 * Turns the assistant text into a small, safe structure (paragraphs, lists,
 * bold and highlighted prices) rendered as React elements. No HTML from the
 * model is ever injected, and no content is added or changed: only presented.
 */

export type Inline = { type: 'text'; text: string } | { type: 'strong'; children: Inline[] } | { type: 'price'; text: string };

export type Block =
  | { type: 'paragraph'; lines: Inline[][] }
  | { type: 'heading'; content: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] };

// "R$ 1.299,90" (with a regular or non-breaking space, or none).
const PRICE_PATTERN = /R\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/g;
const BOLD_PATTERN = /\*\*(.+?)\*\*/g;
const UNORDERED_ITEM = /^\s*[-*•]\s+(.*)$/;
const ORDERED_ITEM = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,4}\s+(.*)$/;

function splitPrices(text: string): Inline[] {
  const result: Inline[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(PRICE_PATTERN)) {
    if (match.index > lastIndex) result.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    result.push({ type: 'price', text: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) result.push({ type: 'text', text: text.slice(lastIndex) });
  return result;
}

export function parseInline(text: string): Inline[] {
  const result: Inline[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(BOLD_PATTERN)) {
    if (match.index > lastIndex) result.push(...splitPrices(text.slice(lastIndex, match.index)));
    result.push({ type: 'strong', children: splitPrices(match[1] ?? '') });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) result.push(...splitPrices(text.slice(lastIndex)));
  return result;
}

export function parseReply(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: Inline[][] = [];
  let list: { ordered: boolean; items: Inline[][] } | null = null;

  const flush = () => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', lines: paragraph });
    if (list) blocks.push({ type: 'list', ...list });
    paragraph = [];
    list = null;
  };

  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const unordered = UNORDERED_ITEM.exec(line);
    const ordered = unordered ? null : ORDERED_ITEM.exec(line);
    const item = unordered ?? ordered;

    if (item) {
      const isOrdered = Boolean(ordered);
      if (paragraph.length > 0 || (list && list.ordered !== isOrdered)) flush();
      list ??= { ordered: isOrdered, items: [] };
      list.items.push(parseInline(item[1] ?? ''));
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', content: parseInline(heading[1] ?? '') });
      continue;
    }

    if (list) flush();
    paragraph.push(parseInline(line.trim()));
  }

  flush();
  return blocks;
}
