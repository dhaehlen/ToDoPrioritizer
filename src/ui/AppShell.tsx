import { Link, Outlet } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import styles from './AppShell.module.css';

// Loaded only in development; the import is dropped from production builds.
const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null;

const activeProps = { className: styles.active, 'aria-current': 'page' } as const;

export function AppShell() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>ToDoPrioritizer</span>
        <nav aria-label="Views" className={styles.nav}>
          <Link
            to="/"
            className={styles.tab}
            activeProps={activeProps}
            activeOptions={{ exact: true, includeSearch: false }}
          >
            List
          </Link>
          <Link to="/matrix" className={styles.tab} activeProps={activeProps}>
            Matrix
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <Suspense fallback={null}>
        <RouterDevtools />
      </Suspense>
    </div>
  );
}
