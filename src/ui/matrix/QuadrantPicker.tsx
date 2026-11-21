import { useEffect, useId, useRef, useState } from 'react';
import { QUADRANT_LIST } from '../../domain/quadrants';
import type { Quadrant, Todo } from '../../domain/todo';
import styles from './MatrixView.module.css';

export interface QuadrantPickerProps {
  todo: Todo;
  onMove: (todo: Todo, quadrant: Quadrant | null) => void;
}

const TARGETS: readonly { id: Quadrant | null; label: string }[] = [
  ...QUADRANT_LIST.map((q) => ({ id: q.id, label: q.label })),
  { id: null, label: 'Unsorted' },
];

/**
 * The way to move a todo without dragging (FR-14, NFR-2): a "Move" button
 * that shows the other quadrants as buttons (the disclosure pattern).
 *
 * The choices are only rendered while open. An always-present `<select>` on
 * every card was the single biggest rendering cost with hundreds of todos
 * (see the NFR-4 perf test).
 *
 * Keyboard: Enter/Space opens and focuses the first choice; Tab moves through
 * the choices; Escape closes and returns focus to "Move".
 */
export function QuadrantPicker({ todo, onMove }: QuadrantPickerProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  };

  // While open: focus the first choice, close on a press outside, and close
  // on Escape (returning focus to "Move").
  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLButtonElement>('[data-choice]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.move}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.cardAction}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Move “${todo.title}”`}
        onClick={() => {
          setOpen((o) => !o);
        }}
      >
        Move
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={`Move “${todo.title}” to`}
          className={styles.movePanel}
        >
          {TARGETS.filter((t) => t.id !== todo.quadrant).map((target) => (
            <button
              key={target.id ?? 'unsorted'}
              type="button"
              data-choice
              className={styles.moveChoice}
              onClick={() => {
                close(true);
                onMove(todo, target.id);
              }}
            >
              {target.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
