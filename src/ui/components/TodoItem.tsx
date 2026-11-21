import { useId } from 'react';
import { QUADRANT_INFO } from '../../domain/quadrants';
import type { Todo } from '../../domain/todo';
import { cx } from '../../lib/cx';
import { formatDate, formatDateTime } from '../../lib/formatDate';
import styles from './TodoItem.module.css';
import { useOptimisticToggle } from './useOptimisticToggle';

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

  const { checked, toggle } = useOptimisticToggle(todo, onToggle);

  return (
    <li className={styles.item} data-completed={checked || undefined}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        onChange={() => void toggle()}
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
