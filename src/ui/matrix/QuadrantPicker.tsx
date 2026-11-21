import { useId } from 'react';
import { QUADRANT_LIST } from '../../domain/quadrants';
import { isQuadrant, type Quadrant, type Todo } from '../../domain/todo';
import styles from './MatrixView.module.css';

const UNSORTED = '';

export interface QuadrantPickerProps {
  todo: Todo;
  onMove: (todo: Todo, quadrant: Quadrant | null) => void;
}

/**
 * The way to move a todo without dragging (FR-14, NFR-2). It's a native
 * `<select>`, so it works with the keyboard, screen readers, and touch
 * screens without extra code.
 */
export function QuadrantPicker({ todo, onMove }: QuadrantPickerProps) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="visually-hidden">
        Move “{todo.title}” to
      </label>
      <select
        id={id}
        className={styles.picker}
        value={todo.quadrant ?? UNSORTED}
        onChange={(e) => {
          onMove(todo, isQuadrant(e.target.value) ? e.target.value : null);
        }}
      >
        <option value={UNSORTED}>Unsorted</option>
        {QUADRANT_LIST.map((q) => (
          <option key={q.id} value={q.id}>
            {q.label}
          </option>
        ))}
      </select>
    </>
  );
}
