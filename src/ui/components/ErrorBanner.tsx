import { useDismissSaveError, useTodos } from '../../state/useTodos';
import styles from './ErrorBanner.module.css';

/**
 * Shows storage problems (ARCHITECTURE §5). Messages stay until the problem
 * is fixed (load errors) or the user dismisses them (save errors).
 */
export function ErrorBanner() {
  const { status, saveError } = useTodos();
  const dismissSaveError = useDismissSaveError();

  return (
    <div className={styles.region}>
      {status === 'error' && (
        <div role="alert" className={styles.banner}>
          <p className={styles.message}>
            Your todos can&apos;t be loaded from this browser&apos;s storage right now. Trying
            again&hellip; If this keeps happening, private browsing or blocked site data may be
            preventing the app from saving.
          </p>
        </div>
      )}
      {saveError !== null && (
        <div role="alert" className={styles.banner}>
          <p className={styles.message}>Your last change couldn&apos;t be saved.</p>
          <button type="button" className={styles.dismiss} onClick={dismissSaveError}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
