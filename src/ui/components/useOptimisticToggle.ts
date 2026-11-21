import { useState } from 'react';
import type { Todo } from '../../domain/todo';

/**
 * Optimistic state for a todo's "done" checkbox.
 *
 * It shows the new state right away instead of waiting for storage to confirm
 * it. Otherwise the controlled checkbox snaps back for a moment. The
 * optimistic value only applies while `updatedAt` is unchanged, so it is
 * dropped automatically once the saved todo arrives. If the save fails, it is
 * undone. (Keyed on `updatedAt`, not the object, because storage sends fresh
 * copies of every todo whenever any todo changes.)
 */
export function useOptimisticToggle(todo: Todo, onToggle: (todo: Todo) => Promise<boolean>) {
  const [optimistic, setOptimistic] = useState<{ updatedAt: string; checked: boolean } | null>(
    null,
  );
  const checked = optimistic?.updatedAt === todo.updatedAt ? optimistic.checked : todo.isCompleted;

  async function toggle() {
    setOptimistic({ updatedAt: todo.updatedAt, checked: !checked });
    const saved = await onToggle(todo);
    if (!saved) setOptimistic(null);
  }

  return { checked, toggle };
}
