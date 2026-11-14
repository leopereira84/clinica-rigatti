import { describe, expect, it } from 'vitest';
import { parseInline, parseReply } from './replyFormat';

describe('parseInline', () => {
  it('highlights prices with regular or non-breaking spaces', () => {
    expect(parseInline('Custa R$ 1.299,90 ou R$ 89,90.')).toEqual([
      { type: 'text', text: 'Custa ' },
      { type: 'price', text: 'R$ 1.299,90' },
      { type: 'text', text: ' ou ' },
      { type: 'price', text: 'R$ 89,90' },
      { type: 'text', text: '.' },
    ]);
  });

  it('renders bold text, including prices inside it', () => {
    expect(parseInline('**Banco Estofado** — **R$ 459,90**')).toEqual([
      { type: 'strong', children: [{ type: 'text', text: 'Banco Estofado' }] },
      { type: 'text', text: ' — ' },
      { type: 'strong', children: [{ type: 'price', text: 'R$ 459,90' }] },
    ]);
  });

  it('keeps any other text untouched, including HTML-like content', () => {
    expect(parseInline('<img src=x onerror=alert(1)> 100 reais')).toEqual([
      { type: 'text', text: '<img src=x onerror=alert(1)> 100 reais' },
    ]);
  });
});

describe('parseReply', () => {
  it('splits paragraphs, line breaks and lists', () => {
    const blocks = parseReply('Encontrei 2 produtos:\n\n- Banco — R$ 459,90\n- Sofá — R$ 1.299,90\n\nQuer mais detalhes?');

    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'list', 'paragraph']);
    expect(blocks[1]).toMatchObject({ type: 'list', ordered: false });
    expect(blocks[1]?.type === 'list' && blocks[1].items).toHaveLength(2);
  });

  it('detects ordered lists and headings', () => {
    const blocks = parseReply('### Mais caros\n1. Sofá\n2) Mesa');

    expect(blocks[0]).toEqual({ type: 'heading', content: [{ type: 'text', text: 'Mais caros' }] });
    expect(blocks[1]).toMatchObject({ type: 'list', ordered: true });
  });

  it('keeps consecutive lines of a paragraph together', () => {
    const [block] = parseReply('Linha 1\nLinha 2');
    expect(block?.type === 'paragraph' && block.lines).toHaveLength(2);
  });

  it('does not lose text: every character of plain answers is preserved', () => {
    const text = 'Não encontrei esse produto no catálogo.';
    expect(parseReply(text)).toEqual([{ type: 'paragraph', lines: [[{ type: 'text', text }]] }]);
  });
});
