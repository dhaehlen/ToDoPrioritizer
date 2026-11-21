import { HeadContent, Link, Outlet } from '@tanstack/react-router';
import { lazy, Suspense, useRef } from 'react';
import styles from './AppShell.module.css';
import { ErrorBanner } from './components/ErrorBanner';

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
  const mainRef = useRef<HTMLElement>(null);
  return (
    <div className={styles.shell}>
      {/* Sets the page <title> from each route's `head` option. React hoists it into <head>. */}
      <HeadContent />
      {/* WCAG 2.4.1: lets keyboard users skip the header. It moves focus directly instead
          of using a #hash link, so the router's URL stays clean. */}
      <a
        href="#main"
        className={styles.skipLink}
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to main content
      </a>
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
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <ErrorBanner />
        <Outlet />
      </main>
      <Suspense fallback={null}>
        <RouterDevtools />
      </Suspense>
    </div>
  );
}
