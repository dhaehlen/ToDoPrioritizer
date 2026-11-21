import type { ActiveTodo, CompletedTodo } from '../domain/todo';

export const T0 = new Date('2026-11-20T09:00:00.000Z');
export const T1 = new Date('2026-11-20T10:00:00.000Z');
export const T2 = new Date('2026-11-20T11:00:00.000Z');

let seq = 0;

/** Builds a valid active todo. Override any field. */
export function activeTodo(overrides: Partial<ActiveTodo> = {}): ActiveTodo {
  seq += 1;
  return {
    id: `todo-${String(seq).padStart(4, '0')}`,
    title: `Todo ${String(seq)}`,
    description: '',
    quadrant: null,
    createdAt: T0.toISOString(),
    updatedAt: T0.toISOString(),
    isCompleted: false,
    completedAt: null,
    ...overrides,
  };
}

/** Builds a valid completed todo. Override any field. */
export function completedTodo(overrides: Partial<CompletedTodo> = {}): CompletedTodo {
  const base = activeTodo();
  return {
    ...base,
    isCompleted: true,
    completedAt: T1.toISOString(),
    updatedAt: T1.toISOString(),
    ...overrides,
  };
}
