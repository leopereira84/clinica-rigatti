import { LogOut, type LucideIcon, Menu, Package, Sparkles, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth, useSession } from '../../features/auth/AuthContext';
import { cx } from '../../lib/cx';
import { type Permission, ROLE_LABELS } from '../../lib/permissions';
import { Brand } from '../Brand';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Badge } from '../ui/Badge';
import styles from './AppLayout.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/produtos', label: 'Produtos', icon: Package, permission: 'products:read' },
  { to: '/assistente', label: 'Assistente IA', icon: Sparkles, permission: 'chat:use' },
  { to: '/usuarios', label: 'Usuários', icon: Users, permission: 'users:manage' },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppLayout() {
  const { logout } = useAuth();
  const { user, company, can } = useSession();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className={styles.shell}>
      <aside id="app-sidebar" className={cx(styles.sidebar, menuOpen && styles.sidebarOpen)}>
        <div className={styles.sidebarHeader}>
          <Brand />
          <div className={styles.headerActions}>
            <ThemeToggle />
            <button type="button" className={styles.closeMenu} onClick={() => setMenuOpen(false)}>
              <X aria-hidden="true" />
              <span className="visually-hidden">Fechar menu</span>
            </button>
          </div>
        </div>

        <p className={styles.company} title={company.name}>
          {company.name}
        </p>

        <nav className={styles.nav} aria-label="Navegação principal">
          {NAV_ITEMS.filter((item) => can(item.permission)).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cx(styles.navLink, isActive && styles.navLinkActive)}>
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(user.name)}
          </span>
          <div className={styles.accountText}>
            <p className={styles.userName} title={user.name}>
              {user.name}
            </p>
            <Badge tone={user.role === 'admin' ? 'primary' : 'neutral'}>{ROLE_LABELS[user.role]}</Badge>
          </div>
          <button type="button" className={styles.logout} onClick={logout}>
            <LogOut aria-hidden="true" />
            <span className="visually-hidden">Sair</span>
          </button>
        </div>
      </aside>

      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.openMenu}
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="app-sidebar"
          >
            <Menu aria-hidden="true" />
            <span className="visually-hidden">Abrir menu</span>
          </button>
          <Brand />
          <ThemeToggle className={styles.topbarToggle} />
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
