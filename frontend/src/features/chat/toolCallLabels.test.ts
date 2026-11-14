import { describe, expect, it } from 'vitest';
import { describeToolCall } from './toolCallLabels';

const normalize = (text: string) => text.replace(/ /g, ' ');

describe('describeToolCall', () => {
  it('describes a search with all its filters (prices in reais)', () => {
    const label = describeToolCall({
      name: 'search_products',
      ok: true,
      input: { query: 'banco', category: 'Sala', min_price: 100, max_price: 459.9, in_stock_only: true, sort: null, limit: null },
      resultCount: 2,
    });

    expect(label.title).toBe('Busca no catálogo');
    expect(normalize(label.detail)).toBe('“banco” · categoria Sala · R$ 100,00 a R$ 459,90 · somente em estoque');
    expect(label.result).toBe('2 produtos');
  });

  it.each([
    [{ min_price: 50, max_price: null }, 'a partir de R$ 50,00'],
    [{ min_price: null, max_price: 600 }, 'até R$ 600,00'],
    [{}, 'todos os produtos'],
  ])('describes the price range %o', (input, detail) => {
    const label = describeToolCall({ name: 'search_products', ok: true, input, resultCount: 0 });

    expect(normalize(label.detail)).toBe(detail);
    expect(label.result).toBe('nenhum produto');
  });

  it('describes product details and categories', () => {
    expect(describeToolCall({ name: 'get_product_details', ok: true, input: { sku: 'banco-1', product_id: null }, resultCount: 1 }))
      .toEqual({ title: 'Detalhes do produto', detail: 'SKU BANCO-1', result: 'encontrado' });
    expect(describeToolCall({ name: 'get_product_details', ok: true, input: { product_id: 'x', sku: null }, resultCount: 0 }).result)
      .toBe('não encontrado');
    expect(describeToolCall({ name: 'list_categories', ok: true, input: {}, resultCount: 1 }).result).toBe('1 categoria');
  });

  it('describes failed calls without showing their input', () => {
    expect(describeToolCall({ name: 'search_products', ok: false, input: null, resultCount: null })).toEqual({
      title: 'Consulta ao catálogo',
      detail: 'não concluída',
      result: 'erro',
    });
  });
});
