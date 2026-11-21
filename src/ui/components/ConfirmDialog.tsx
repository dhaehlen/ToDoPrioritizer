import { cx } from '../../lib/cx';
import { Dialog } from './Dialog';
import styles from './forms.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Disables the buttons while the confirmed action runs. */
  busy?: boolean;
}

/** Asks the user to confirm a destructive action (FR-3). Cancel has focus first, as the safe choice. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <p>{message}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          onClick={onCancel}
          disabled={busy}
          data-autofocus
        >
          Cancel
        </button>
        <button
          type="button"
          className={cx(styles.button, styles.danger)}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
