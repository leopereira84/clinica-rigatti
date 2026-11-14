import { RefreshCw, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';
import { getErrorMessage, getFieldErrors } from '../../lib/errors';
import { useQuery } from '../../lib/hooks';
import { ROLE_LABELS } from '../../lib/permissions';
import { useFormState } from '../../lib/useFormState';
import { type FieldErrors, hasErrors, validateEmail, validateLength, validateNewPassword } from '../../lib/validation';
import { useSession } from '../auth/AuthContext';
import { usersApi } from './api';
import styles from './UsersPage.module.css';

type NewUserFields = { name: string; email: string; password: string };

const EMPTY_FORM: NewUserFields = { name: '', email: '', password: '' };

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });

function validate(values: NewUserFields): FieldErrors<keyof NewUserFields> {
  return {
    name: validateLength(values.name, 'o nome', 2, 100),
    email: validateEmail(values.email),
    password: validateNewPassword(values.password),
  };
}

export function UsersPage() {
  const { user: currentUser, company } = useSession();
  const toast = useToast();
  const users = useQuery('users', (signal) => usersApi.list(signal));

  const { values, setValues, errors, setErrors, bind } = useFormState<NewUserFields>(EMPTY_FORM);
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
      const created = await usersApi.create({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      toast.success(`${created.name} agora tem acesso ao catálogo.`);
      setValues(EMPTY_FORM);
      users.reload();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_IN_USE') {
        setErrors({ email: getErrorMessage(error) });
      } else {
        setErrors(getFieldErrors(error));
        setFormError(getErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function renderList() {
    if (users.error && !users.data) {
      return (
        <Alert
          tone="error"
          title="Não foi possível carregar os usuários"
          action={
            <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={users.reload}>
              Tentar novamente
            </Button>
          }
        >
          {getErrorMessage(users.error)}
        </Alert>
      );
    }

    if (!users.data) {
      return (
        <div className={styles.skeletonList} aria-busy="true" aria-label="Carregando usuários">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} height={44} />
          ))}
        </div>
      );
    }

    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">E-mail</th>
              <th scope="col">Perfil</th>
              <th scope="col">Desde</th>
            </tr>
          </thead>
          <tbody>
            {users.data.items.map((member) => (
              <tr key={member.id}>
                <td>
                  <span className={styles.name}>{member.name}</span>
                  {member.id === currentUser.id && <span className={styles.you}>você</span>}
                </td>
                <td className={styles.email}>{member.email}</td>
                <td>
                  <Badge tone={member.role === 'admin' ? 'primary' : 'neutral'}>{ROLE_LABELS[member.role]}</Badge>
                </td>
                <td className={styles.date}>{dateFormatter.format(new Date(member.createdAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Usuários" description={`Pessoas com acesso ao catálogo de ${company.name}.`} />

      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="members-title">
          <h2 id="members-title" className={styles.cardTitle}>
            Equipe
            {users.data && <span className={styles.count}>{users.data.items.length}</span>}
          </h2>
          {renderList()}
        </section>

        <section className={styles.card} aria-labelledby="new-member-title">
          <h2 id="new-member-title" className={styles.cardTitle}>
            Adicionar usuário
          </h2>
          <p className={styles.help}>
            Novos usuários entram com o perfil <strong>Usuário</strong>: podem consultar os produtos e usar o
            assistente, mas não alteram o catálogo.
          </p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {formError && <Alert tone="error">{formError}</Alert>}

            <Field label="Nome" error={errors.name} required>
              {(control) => <Input {...control} {...bind('name')} autoComplete="off" />}
            </Field>
            <Field label="E-mail" error={errors.email} required>
              {(control) => <Input {...control} {...bind('email')} type="email" autoComplete="off" />}
            </Field>
            <Field
              label="Senha inicial"
              error={errors.password}
              hint="Mínimo de 8 caracteres. Compartilhe com a pessoa por um canal seguro."
              required
            >
              {(control) => <PasswordInput {...control} {...bind('password')} autoComplete="new-password" />}
            </Field>

            <Button type="submit" icon={<UserPlus />} loading={submitting}>
              Adicionar usuário
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
