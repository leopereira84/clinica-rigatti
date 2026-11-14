import { Mail } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { getErrorMessage } from '../../lib/errors';
import { useFormState } from '../../lib/useFormState';
import { type FieldErrors, hasErrors, validateEmail } from '../../lib/validation';
import { useAuth } from './AuthContext';
import styles from './AuthForm.module.css';
import { AuthLayout } from './AuthLayout';
import type { LoginRedirectState } from './routeGuards';

type LoginFields = { email: string; password: string };

function validate(values: LoginFields): FieldErrors<keyof LoginFields> {
  return {
    email: validateEmail(values.email),
    password: values.password ? undefined : 'Informe a senha.',
  };
}

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LoginRedirectState | null)?.from ?? '/produtos';

  const { values, errors, setErrors, bind } = useFormState<LoginFields>({ email: '', password: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sessionExpired = state.status === 'unauthenticated' && state.sessionExpired;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse o catálogo da sua empresa."
      footer={
        <>
          Sua empresa ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {sessionExpired && !formError && <Alert tone="info">Sua sessão expirou. Entre novamente para continuar.</Alert>}
        {formError && <Alert tone="error">{formError}</Alert>}

        <Field label="E-mail" error={errors.email}>
          {(control) => (
            <Input
              {...control}
              {...bind('email')}
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              leading={<Mail />}
              autoFocus
            />
          )}
        </Field>

        <Field label="Senha" error={errors.password}>
          {(control) => <PasswordInput {...control} {...bind('password')} autoComplete="current-password" />}
        </Field>

        <Button type="submit" className={styles.submit} loading={submitting}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
