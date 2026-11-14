import { ArrowLeft, PackageX, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { useQuery } from '../../lib/hooks';
import { productsApi } from './api';
import { ProductForm } from './components/ProductForm';
import { EMPTY_PRODUCT_FORM, productToFormValues } from './productForm';
import type { ProductPayload } from './types';

/** Create (`/produtos/novo`) and edit (`/produtos/:id/editar`) share this page. */
export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const product = useQuery(`product:${id ?? 'new'}`, (signal) =>
    id ? productsApi.get(id, signal) : Promise.resolve(null),
  );
  const categories = useQuery('categories', (signal) => productsApi.categories(signal));

  const isEdit = Boolean(id);
  const backLink = (
    <Link to="/produtos">
      <ArrowLeft size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Produtos
    </Link>
  );

  async function save(payload: ProductPayload) {
    if (id) {
      await productsApi.update(id, payload);
      toast.success(`"${payload.name}" foi atualizado.`);
    } else {
      await productsApi.create(payload);
      toast.success(`"${payload.name}" foi cadastrado.`);
    }
    navigate('/produtos');
  }

  if (product.isLoading && !product.data) {
    return <FullPageSpinner label="Carregando produto…" />;
  }

  if (product.error) {
    if (product.error instanceof ApiError && product.error.code === 'PRODUCT_NOT_FOUND') {
      return (
        <EmptyState
          icon={PackageX}
          title="Produto não encontrado"
          description="Ele pode ter sido excluído ou não pertence ao catálogo da sua empresa."
          action={<ButtonLink to="/produtos">Voltar para produtos</ButtonLink>}
        />
      );
    }
    return (
      <Alert
        tone="error"
        title="Não foi possível carregar o produto"
        action={
          <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={product.reload}>
            Tentar novamente
          </Button>
        }
      >
        {getErrorMessage(product.error)}
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={backLink}
        title={isEdit ? 'Editar produto' : 'Novo produto'}
        description={isEdit ? 'Atualize as informações exibidas no catálogo.' : 'Preencha os dados para adicionar ao catálogo.'}
      />
      <ProductForm
        key={product.data?.id ?? 'new'}
        initialValues={product.data ? productToFormValues(product.data) : EMPTY_PRODUCT_FORM}
        categories={categories.data?.items ?? []}
        submitLabel={isEdit ? 'Salvar alterações' : 'Cadastrar produto'}
        onSubmit={save}
        onCancel={() => navigate('/produtos')}
      />
    </>
  );
}
