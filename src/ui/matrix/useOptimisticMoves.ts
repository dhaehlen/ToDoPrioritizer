import { useCallback, useMemo, useState } from 'react';
import type { Quadrant, Todo } from '../../domain/todo';

type Pending = ReadonlyMap<
  string,
  { readonly updatedAt: string; readonly quadrant: Quadrant | null }
>;

/**
 * Shows a dropped todo in its new quadrant right away, before storage confirms
 * the move. Otherwise the card jumps back to where it started for a moment.
 *
 * Like `useOptimisticToggle`, an override only applies while the todo's
 * `updatedAt` is unchanged. It is dropped automatically when the saved todo
 * arrives, and `revert` removes it if the save fails.
 */
export function useOptimisticMoves(todos: readonly Todo[]) {
  const [pending, setPending] = useState<Pending>(new Map());

  const withMoves = useMemo(() => {
    if (pending.size === 0) return todos;
    return todos.map((todo) => {
      const move = pending.get(todo.id);
      return move?.updatedAt === todo.updatedAt ? { ...todo, quadrant: move.quadrant } : todo;
    });
  }, [todos, pending]);

  const move = useCallback((todo: Todo, quadrant: Quadrant | null) => {
    setPending((prev) => new Map(prev).set(todo.id, { updatedAt: todo.updatedAt, quadrant }));
  }, []);

  const revert = useCallback((todo: Todo) => {
    setPending((prev) => {
      const next = new Map(prev);
      next.delete(todo.id);
      return next;
    });
  }, []);

  return { todos: withMoves, move, revert };
}
