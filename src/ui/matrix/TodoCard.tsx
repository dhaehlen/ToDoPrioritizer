import { useDraggable } from '@dnd-kit/core';
import { useId, type KeyboardEventHandler } from 'react';
import type { Quadrant, Todo } from '../../domain/todo';
import { cx } from '../../lib/cx';
import { useOptimisticToggle } from '../components/useOptimisticToggle';
import styles from './MatrixView.module.css';
import { QuadrantPicker } from './QuadrantPicker';

export interface TodoCardProps {
  todo: Todo;
  onToggle: (todo: Todo) => Promise<boolean>;
  onMove: (todo: Todo, quadrant: Quadrant | null) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

/**
 * A todo in the Matrix view. It can be dragged with a mouse or a long press
 * anywhere except its controls, or with the keyboard from its drag handle. It
 * can also be moved with the "Move to" menu.
 */
export function TodoCard({ todo, onToggle, onMove, onEdit, onDelete }: TodoCardProps) {
  const titleId = useId();
  const { checked, toggle } = useOptimisticToggle(todo, onToggle);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: todo.id,
  });
  // The card responds to pointer and touch presses. Only the handle responds
  // to the keyboard, so Space in the checkbox or menu doesn't start a drag.
  const { onKeyDown, ...pressListeners } = listeners ?? {};

  return (
    <li
      ref={setNodeRef}
      className={cx(styles.card, isDragging && styles.dragging)}
      data-completed={checked || undefined}
      {...pressListeners}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={styles.handle}
        data-drag-handle
        {...attributes}
        onKeyDown={onKeyDown as KeyboardEventHandler | undefined}
        aria-label={`Drag “${todo.title}”`}
      >
        <span aria-hidden="true">⠿</span>
      </button>
      <input
        type="checkbox"
        className={styles.cardCheckbox}
        checked={checked}
        onChange={() => void toggle()}
        aria-labelledby={titleId}
      />
      <p id={titleId} className={styles.cardTitle}>
        {todo.title}
      </p>
      <div className={styles.cardActions}>
        <QuadrantPicker todo={todo} onMove={onMove} />
        <button
          type="button"
          className={styles.cardAction}
          onClick={() => {
            onEdit(todo);
          }}
          aria-label={`Edit “${todo.title}”`}
        >
          Edit
        </button>
        <button
          type="button"
          className={styles.cardAction}
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

/** What follows the pointer while dragging (rendered in dnd-kit's DragOverlay). */
export function TodoCardPreview({ todo }: { todo: Todo }) {
  return (
    <div className={cx(styles.card, styles.preview)} data-completed={todo.isCompleted || undefined}>
      <span className={styles.handle} aria-hidden="true">
        ⠿
      </span>
      <p className={styles.cardTitle}>{todo.title}</p>
    </div>
  );
}
