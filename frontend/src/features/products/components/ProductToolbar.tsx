import { Search, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Field';
import { SORT_OPTIONS, type ProductSort } from '../types';
import styles from './ProductToolbar.module.css';

interface ProductToolbarProps {
  search: string;
  category: string;
  sort: ProductSort;
  categories: string[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSortChange: (value: ProductSort) => void;
  onClear: () => void;
}

function isSort(value: string): value is ProductSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export function ProductToolbar({
  search,
  category,
  sort,
  categories,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onClear,
}: ProductToolbarProps) {
  return (
    <div className={styles.toolbar} role="search">
      <Input
        className={styles.search}
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar por nome, SKU ou descrição"
        aria-label="Buscar produtos"
        leading={<Search />}
        maxLength={100}
      />

      <Select
        className={styles.select}
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
        aria-label="Filtrar por categoria"
      >
        <option value="">Todas as categorias</option>
        {categories.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>

      <Select
        className={styles.select}
        value={sort}
        onChange={(event) => {
          if (isSort(event.target.value)) onSortChange(event.target.value);
        }}
        aria-label="Ordenar produtos"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" icon={<X />} onClick={onClear}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
