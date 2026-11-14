import { type FormEvent, useId, useRef, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, Input, TextArea } from '../../../components/ui/Field';
import { ApiError } from '../../../lib/api';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import { centsToInputValue, parseCurrencyToCents } from '../../../lib/money';
import { isHttpUrl } from '../../../lib/url';
import { useFormState } from '../../../lib/useFormState';
import { buildProductPayload, LIMITS, type ProductFormValues } from '../productForm';
import type { ProductPayload } from '../types';
import styles from './ProductForm.module.css';
import { ProductImage } from './ProductImage';

interface ProductFormProps {
  initialValues: ProductFormValues;
  categories: string[];
  submitLabel: string;
  /** Persists the product; errors thrown here are shown in the form. */
  onSubmit: (payload: ProductPayload) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ initialValues, categories, submitLabel, onSubmit, onCancel }: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const categoryListId = useId();
  const { values, errors, setErrors, setField, bind } = useFormState<ProductFormValues>(initialValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const imageUrl = values.imageUrl.trim();
  const previewUrl = isHttpUrl(imageUrl) ? imageUrl : null;

  function focusFirstError() {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = buildProductPayload(values);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstError();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(result.payload);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SKU_ALREADY_EXISTS') {
        setErrors({ sku: getErrorMessage(error) });
      } else {
        setErrors(getFieldErrors(error));
        setFormError(getErrorMessage(error));
      }
      focusFirstError();
      setSubmitting(false);
    }
  }

  /** Normalizes "1234,5" to "1.234,50" when the field loses focus. */
  function formatPriceOnBlur() {
    const cents = parseCurrencyToCents(values.price);
    if (cents !== null) setField('price', centsToInputValue(cents));
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
      {formError && <Alert tone="error">{formError}</Alert>}

      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="product-info-title">
          <h2 id="product-info-title" className={styles.cardTitle}>
            Informações do produto
          </h2>

          <Field label="Nome" error={errors.name} required>
            {(control) => <Input {...control} {...bind('name')} maxLength={120} autoFocus />}
          </Field>

          <div className={styles.row}>
            <Field label="Categoria" error={errors.category} hint="Escolha uma existente ou digite uma nova." required>
              {(control) => (
                <>
                  <Input {...control} {...bind('category')} list={categoryListId} maxLength={60} autoComplete="off" />
                  <datalist id={categoryListId}>
                    {categories.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>

            <Field label="Preço" error={errors.price} required>
              {(control) => (
                <Input
                  {...control}
                  {...bind('price')}
                  onBlur={formatPriceOnBlur}
                  inputMode="decimal"
                  placeholder="0,00"
                  leading="R$"
                />
              )}
            </Field>
          </div>

          <div className={styles.row}>
            <Field label="Estoque" error={errors.stock} required>
              {(control) => <Input {...control} {...bind('stock')} inputMode="numeric" />}
            </Field>

            <Field label="SKU" error={errors.sku} hint="Código interno opcional e único na empresa.">
              {(control) => (
                <Input {...control} {...bind('sku')} maxLength={64} autoComplete="off" className={styles.sku} />
              )}
            </Field>
          </div>

          <Field
            label="Descrição"
            error={errors.description}
            aside={`${values.description.length}/${LIMITS.maxDescription}`}
          >
            {(control) => <TextArea {...control} {...bind('description')} maxLength={LIMITS.maxDescription} rows={5} />}
          </Field>
        </section>

        <section className={styles.card} aria-labelledby="product-image-title">
          <h2 id="product-image-title" className={styles.cardTitle}>
            Imagem
          </h2>

          <Field label="URL da imagem" error={errors.imageUrl} hint="Endereço público começando com https://.">
            {(control) => (
              <Input
                {...control}
                {...bind('imageUrl')}
                type="url"
                inputMode="url"
                placeholder="https://"
                maxLength={LIMITS.maxImageUrl}
                autoComplete="off"
              />
            )}
          </Field>

          <div className={styles.preview}>
            <p className={styles.previewLabel}>Pré-visualização</p>
            <ProductImage
              key={previewUrl ?? 'empty'}
              src={previewUrl}
              alt={values.name.trim() || 'Produto'}
              className={styles.previewImage}
            />
          </div>
        </section>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
