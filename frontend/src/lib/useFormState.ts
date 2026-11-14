import { type ChangeEvent, useCallback, useState } from 'react';

type Errors<T> = Partial<Record<keyof T & string, string>>;

/**
 * Values and field errors for a simple form. Editing a field clears its
 * error, so messages disappear as soon as the user starts fixing them.
 */
export function useFormState<T extends Record<string, string>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Errors<T>>({});

  const setField = useCallback((field: keyof T & string, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }, []);

  /** Props for an input bound to `field`. */
  const bind = (field: keyof T & string) => ({
    name: field,
    value: values[field],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setField(field, event.target.value),
  });

  return { values, setValues, errors, setErrors, setField, bind };
}
