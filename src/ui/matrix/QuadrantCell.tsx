import { useDroppable } from '@dnd-kit/core';
import { useId, type ReactNode } from 'react';
import { QUADRANT_INFO } from '../../domain/quadrants';
import type { Quadrant, Todo } from '../../domain/todo';
import { cx } from '../../lib/cx';
import { targetId } from './dnd';
import styles from './MatrixView.module.css';

export interface QuadrantCellProps {
  /** `null` is the Unsorted tray. */
  quadrant: Quadrant | null;
  todos: readonly Todo[];
  onAdd: (quadrant: Quadrant | null) => void;
  renderTodo: (todo: Todo) => ReactNode;
}

/** One drop target: a quadrant (FR-12, FR-17) or the Unsorted tray (FR-13). */
export function QuadrantCell({ quadrant, todos, onAdd, renderTodo }: QuadrantCellProps) {
  const headingId = useId();
  const { setNodeRef, isOver } = useDroppable({ id: targetId(quadrant) });
  const info = quadrant ? QUADRANT_INFO[quadrant] : null;
  const label = info?.label ?? 'Unsorted';

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cx(styles.cell, isOver && styles.over)}
      data-quadrant={quadrant ?? 'unsorted'}
    >
      <header className={styles.cellHeader}>
        <h2 id={headingId} className={styles.cellTitle}>
          {label} <span className={styles.cellCount}>{todos.length}</span>
        </h2>
        <p className={styles.cellHint}>
          {info
            ? `${info.urgent ? 'Urgent' : 'Not urgent'} · ${info.important ? 'Important' : 'Not important'} — ${info.action}`
            : 'Not sorted yet. Drag each todo into a quadrant.'}
        </p>
        <button
          type="button"
          className={styles.cellAdd}
          onClick={() => {
            onAdd(quadrant);
          }}
          aria-label={`Add todo to ${label}`}
        >
          + Add
        </button>
      </header>
      {todos.length > 0 ? (
        <ul className={styles.cards} aria-labelledby={headingId}>
          {todos.map(renderTodo)}
        </ul>
      ) : (
        <p className={styles.cellEmpty}>{info ? 'Drop todos here.' : 'Nothing to sort.'}</p>
      )}
    </section>
  );
}
