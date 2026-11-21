import { useId, useState } from 'react';
import { QUADRANT_INFO } from '../../domain/quadrants';
import type { Todo } from '../../domain/todo';
import { cx } from '../../lib/cx';
import { formatDate, formatDateTime } from '../../lib/formatDate';
import styles from './TodoItem.module.css';

export interface TodoItemProps {
  todo: Todo;
  /** Resolves to whether the change was saved. */
  onToggle: (todo: Todo) => Promise<boolean>;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

function Timestamp({ label, iso }: { label: string; iso: string }) {
  return (
    <span>
      {label}{' '}
      <time dateTime={iso} title={formatDateTime(iso)}>
        {formatDate(iso)}
      </time>
    </span>
  );
}

/** One row in the List view (FR-7, FR-8). */
export function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const titleId = useId();
  const quadrant = todo.quadrant ? QUADRANT_INFO[todo.quadrant] : null;

  // Show the new checkbox state right away instead of waiting for storage to
  // confirm it. Otherwise the controlled checkbox snaps back for a moment. The
  // optimistic value only applies while `updatedAt` is unchanged, so it is
  // dropped automatically once the saved todo arrives. On failure it's undone.
  // (Keyed on `updatedAt`, not the object, because storage sends fresh copies
  // of every todo whenever any todo changes.)
  const [optimistic, setOptimistic] = useState<{ updatedAt: string; checked: boolean } | null>(
    null,
  );
  const checked = optimistic?.updatedAt === todo.updatedAt ? optimistic.checked : todo.isCompleted;

  async function handleChange() {
    setOptimistic({ updatedAt: todo.updatedAt, checked: !checked });
    const saved = await onToggle(todo);
    if (!saved) setOptimistic(null);
  }

  return (
    <li className={styles.item} data-completed={checked || undefined}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        onChange={() => void handleChange()}
        aria-labelledby={titleId}
      />
      <div className={styles.body}>
        <p id={titleId} className={styles.title}>
          {todo.title}
        </p>
        {todo.description && <p className={styles.description}>{todo.description}</p>}
        <p className={styles.meta}>
          <span className={styles.badge} data-quadrant={todo.quadrant ?? 'unsorted'}>
            {quadrant ? quadrant.label : 'Unsorted'}
          </span>
          <Timestamp label="Created" iso={todo.createdAt} />
          {todo.isCompleted && <Timestamp label="Completed" iso={todo.completedAt} />}
        </p>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            onEdit(todo);
          }}
          aria-label={`Edit “${todo.title}”`}
        >
          Edit
        </button>
        <button
          type="button"
          className={cx(styles.action, styles.delete)}
          onClick={() => {
            onDelete(todo);
          }}
          aria-label={`Delete “${todo.title}”`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
