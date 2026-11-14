import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { ApiError } from '../../lib/api';
import { getErrorMessage, getFieldErrors } from '../../lib/errors';
import { useFormState } from '../../lib/useFormState';
import { type FieldErrors, hasErrors, validateEmail, validateLength, validateNewPassword } from '../../lib/validation';
import { useAuth } from './AuthContext';
import styles from './AuthForm.module.css';
import { AuthLayout } from './AuthLayout';

type RegisterFields = {
  companyName: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

function validate(values: RegisterFields): FieldErrors<keyof RegisterFields> {
  return {
    companyName: validateLength(values.companyName, 'o nome da empresa', 2, 100),
    name: validateLength(values.name, 'seu nome', 2, 100),
    email: validateEmail(values.email),
    password: validateNewPassword(values.password),
    confirmPassword: values.confirmPassword === values.password ? undefined : 'As senhas não conferem.',
  };
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { values, errors, setErrors, bind } = useFormState<RegisterFields>({
    companyName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await register({
        companyName: values.companyName.trim(),
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      navigate('/produtos', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_IN_USE') {
        setErrors({ email: getErrorMessage(error) });
      } else {
        setErrors(getFieldErrors(error));
        setFormError(getErrorMessage(error));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Criar conta da empresa"
      subtitle="Você será o administrador e poderá convidar sua equipe depois."
      footer={
        <>
          Já tem uma conta? <Link to="/login">Entrar</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}

        <Field label="Nome da empresa" error={errors.companyName} required>
          {(control) => (
            <Input {...control} {...bind('companyName')} autoComplete="organization" placeholder="Ex.: Aurora Móveis" autoFocus />
          )}
        </Field>

        <Field label="Seu nome" error={errors.name} required>
          {(control) => <Input {...control} {...bind('name')} autoComplete="name" />}
        </Field>

        <Field label="E-mail" error={errors.email} required>
          {(control) => (
            <Input {...control} {...bind('email')} type="email" autoComplete="email" placeholder="voce@empresa.com" />
          )}
        </Field>

        <Field label="Senha" error={errors.password} hint="Mínimo de 8 caracteres." required>
          {(control) => <PasswordInput {...control} {...bind('password')} autoComplete="new-password" />}
        </Field>

        <Field label="Confirmar senha" error={errors.confirmPassword} required>
          {(control) => <PasswordInput {...control} {...bind('confirmPassword')} autoComplete="new-password" />}
        </Field>

        <Button type="submit" className={styles.submit} loading={submitting}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
