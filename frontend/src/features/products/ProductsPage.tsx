import { PackageOpen, Plus, RefreshCw, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { useDebouncedValue, useQuery } from '../../lib/hooks';
import { useSession } from '../auth/AuthContext';
import { productsApi } from './api';
import { ProductCard, ProductCardSkeleton } from './components/ProductCard';
import { ProductToolbar } from './components/ProductToolbar';
import styles from './ProductsPage.module.css';
import { type Product, type ProductListParams, type ProductSort, SORT_OPTIONS } from './types';

const DEFAULT_SORT: ProductSort = '-createdAt';

/** Filters live in the URL, so they survive reloads and work with the back button. */
function readParams(searchParams: URLSearchParams): ProductListParams {
  const sort = searchParams.get('sort');
  const page = Number(searchParams.get('page'));
  return {
    search: searchParams.get('search') ?? '',
    category: searchParams.get('category') ?? '',
    sort: SORT_OPTIONS.find((option) => option.value === sort)?.value ?? DEFAULT_SORT,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function ProductsPage() {
  const { company, can } = useSession();
  const toast = useToast();
  const canManage = can('products:write');

  const [searchParams, setSearchParams] = useSearchParams();
  const params = readParams(searchParams);

  const [searchText, setSearchText] = useState(params.search);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300);

  const products = useQuery(JSON.stringify(params), (signal) => productsApi.list(params, signal));
  const categories = useQuery('categories', (signal) => productsApi.categories(signal));

  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  function updateParams(patch: Partial<ProductListParams>) {
    const next = { ...params, page: 1, ...patch };
    const query = new URLSearchParams();
    if (next.search) query.set('search', next.search);
    if (next.category) query.set('category', next.category);
    if (next.sort !== DEFAULT_SORT) query.set('sort', next.sort);
    if (next.page > 1) query.set('page', String(next.page));
    setSearchParams(query, { replace: patch.page === undefined });
  }

  // Typing updates the URL after a short pause.
  useEffect(() => {
    if (debouncedSearch !== params.search) updateParams({ search: debouncedSearch });
    // Intentional deps: only react to the debounced text
  }, [debouncedSearch]);

  // Keep the input in sync when the URL changes elsewhere (back button, "clear filters").
  useEffect(() => {
    if (params.search !== debouncedSearch) setSearchText(params.search);
    // Intentional deps: only react to URL changes
  }, [params.search]);

  // A page beyond the last one (e.g. after deleting its only item) moves back to the last page.
  const data = products.data;
  useEffect(() => {
    if (data && data.items.length === 0 && data.total > 0 && params.page > 1) {
      updateParams({ page: data.totalPages });
    }
  }, [data]);

  const hasActiveFilters = Boolean(params.search || params.category);

  function clearFilters() {
    setSearchText('');
    updateParams({ search: '', category: '' });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await productsApi.remove(toDelete.id);
      toast.success(`"${toDelete.name}" foi excluído.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      if (!(error instanceof ApiError && error.code === 'PRODUCT_NOT_FOUND')) {
        setDeleting(false);
        return;
      }
    }
    setDeleting(false);
    setToDelete(null);
    products.reload();
    categories.reload();
  }

  function renderContent() {
    if (!data) {
      if (products.error) {
        return (
          <Alert
            tone="error"
            title="Não foi possível carregar os produtos"
            action={
              <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={products.reload}>
                Tentar novamente
              </Button>
            }
          >
            {getErrorMessage(products.error)}
          </Alert>
        );
      }
      return (
        <div className={styles.grid} aria-busy="true" aria-label="Carregando produtos">
          {Array.from({ length: 8 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (data.items.length === 0) {
      if (hasActiveFilters) {
        return (
          <EmptyState
            icon={SearchX}
            title="Nenhum produto encontrado"
            description="Tente outros termos de busca ou remova os filtros aplicados."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        );
      }
      return (
        <EmptyState
          icon={PackageOpen}
          title="Nenhum produto cadastrado"
          description={
            canManage
              ? 'Comece cadastrando o primeiro produto do catálogo da sua empresa.'
              : 'Quando o administrador cadastrar produtos, eles aparecerão aqui.'
          }
          action={
            canManage && (
              <ButtonLink to="/produtos/novo" icon={<Plus />}>
                Cadastrar produto
              </ButtonLink>
            )
          }
        />
      );
    }

    return (
      <>
        {products.error && (
          <Alert tone="error" className={styles.inlineError}>
            {getErrorMessage(products.error)}
          </Alert>
        )}
        <div className={styles.grid} aria-busy={products.isLoading} data-loading={products.isLoading || undefined}>
          {data.items.map((product) => (
            <ProductCard key={product.id} product={product} canManage={canManage} onDelete={setToDelete} />
          ))}
        </div>
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          limit={data.limit}
          onPageChange={(page) => updateParams({ page })}
        />
      </>
    );
  }

  const total = data?.total;

  return (
    <>
      <PageHeader
        title="Produtos"
        description={
          total === undefined || hasActiveFilters
            ? `Catálogo de ${company.name}`
            : `${total} ${total === 1 ? 'produto' : 'produtos'} no catálogo de ${company.name}`
        }
        actions={
          canManage && (
            <ButtonLink to="/produtos/novo" icon={<Plus />}>
              Novo produto
            </ButtonLink>
          )
        }
      />

      <ProductToolbar
        search={searchText}
        category={params.category}
        sort={params.sort}
        categories={categories.data?.items ?? []}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearchText}
        onCategoryChange={(category) => updateParams({ category })}
        onSortChange={(sort) => updateParams({ sort })}
        onClear={clearFilters}
      />

      {renderContent()}

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir produto?"
        description={
          <>
            <strong>{toDelete?.name}</strong> será removido do catálogo. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir produto"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
