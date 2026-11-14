import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCents } from '../../../lib/money';
import type { Product } from '../types';
import styles from './ProductCard.module.css';
import { ProductImage } from './ProductImage';

const LOW_STOCK = 5;

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge tone="danger">Sem estoque</Badge>;
  if (stock <= LOW_STOCK) return <Badge tone="warning">Restam {stock}</Badge>;
  return <Badge tone="success">{stock} em estoque</Badge>;
}

interface ProductCardProps {
  product: Product;
  /** Edit/delete actions are rendered only for roles with `products:write`. */
  canManage: boolean;
  onDelete: (product: Product) => void;
}

export function ProductCard({ product, canManage, onDelete }: ProductCardProps) {
  return (
    <article className={styles.card}>
      <ProductImage src={product.imageUrl} alt={product.name} />

      <div className={styles.body}>
        <div className={styles.meta}>
          <Badge tone="primary">{product.category}</Badge>
          <StockBadge stock={product.stock} />
        </div>

        <h3 className={styles.name} title={product.name}>
          {product.name}
        </h3>
        {product.description && <p className={styles.description}>{product.description}</p>}

        <div className={styles.footer}>
          <div>
            <p className={styles.price}>{formatCents(product.price)}</p>
            {product.sku && <p className={styles.sku}>SKU {product.sku}</p>}
          </div>

          {canManage && (
            <div className={styles.actions}>
              <ButtonLink
                to={`/produtos/${product.id}/editar`}
                variant="secondary"
                size="sm"
                iconOnly
                icon={<Pencil />}
                title="Editar"
              >
                Editar {product.name}
              </ButtonLink>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={<Trash2 />}
                className={styles.delete}
                onClick={() => onDelete(product)}
                title="Excluir"
              >
                Excluir {product.name}
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton height="auto" className={styles.skeletonImage} />
      <div className={styles.body}>
        <Skeleton width="45%" height={18} />
        <Skeleton width="85%" height={20} />
        <Skeleton width="60%" />
        <Skeleton width="35%" height={24} />
      </div>
    </div>
  );
}
