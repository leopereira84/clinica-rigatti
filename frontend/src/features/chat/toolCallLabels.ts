import { formatCents } from '../../lib/money';
import type { ToolCallSummary } from './types';

export interface ToolCallLabel {
  title: string;
  /** Filters used in the query, e.g. "“banco” · até R$ 600,00". */
  detail: string;
  result: string;
}

function readString(input: Record<string, unknown> | null, key: string): string | null {
  const value = input?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function readNumber(input: Record<string, unknown> | null, key: string): number | null {
  const value = input?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Tool price filters are in reais. */
function formatReais(value: number): string {
  return formatCents(Math.round(value * 100));
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function describePriceRange(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${formatReais(min)} a ${formatReais(max)}`;
  if (min !== null) return `a partir de ${formatReais(min)}`;
  if (max !== null) return `até ${formatReais(max)}`;
  return null;
}

function describeSearch(call: ToolCallSummary): ToolCallLabel {
  const query = readString(call.input, 'query');
  const category = readString(call.input, 'category');
  const details = [
    query && `“${query}”`,
    category && `categoria ${category}`,
    describePriceRange(readNumber(call.input, 'min_price'), readNumber(call.input, 'max_price')),
    call.input?.in_stock_only === true && 'somente em estoque',
  ].filter((part): part is string => typeof part === 'string');

  const count = call.resultCount ?? 0;
  return {
    title: 'Busca no catálogo',
    detail: details.join(' · ') || 'todos os produtos',
    result: count === 0 ? 'nenhum produto' : plural(count, 'produto', 'produtos'),
  };
}

/**
 * Human-readable description of a catalog query executed by the backend,
 * built only from the data the API returned.
 */
export function describeToolCall(call: ToolCallSummary): ToolCallLabel {
  if (!call.ok) {
    return { title: 'Consulta ao catálogo', detail: 'não concluída', result: 'erro' };
  }

  switch (call.name) {
    case 'search_products':
      return describeSearch(call);
    case 'get_product_details': {
      const sku = readString(call.input, 'sku');
      return {
        title: 'Detalhes do produto',
        detail: sku ? `SKU ${sku.toUpperCase()}` : 'por identificador',
        result: call.resultCount ? 'encontrado' : 'não encontrado',
      };
    }
    case 'list_categories':
      return {
        title: 'Categorias do catálogo',
        detail: 'lista completa',
        result: plural(call.resultCount ?? 0, 'categoria', 'categorias'),
      };
    default:
      return { title: 'Consulta ao catálogo', detail: call.name, result: plural(call.resultCount ?? 0, 'item', 'itens') };
  }
}
