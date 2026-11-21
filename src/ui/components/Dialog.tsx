import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  /** Called when the user closes the dialog, e.g. with Escape. */
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * A modal dialog built on the native `<dialog>` element. The browser provides
 * focus trapping, Escape to close, and returning focus to the element that
 * opened it. Put `data-autofocus` on the element that should get focus first.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs before the dialog is open, so it has no effect
      // here. Mark the element to focus with `data-autofocus` instead.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={() => {
        if (open) onClose();
      }}
    >
      {open && (
        <>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {children}
        </>
      )}
    </dialog>
  );
}
