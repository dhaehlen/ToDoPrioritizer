/**
 * Read-side helpers for the List and Matrix views (REQUIREMENTS §5.3–5.4).
 * All functions are pure and return new arrays; inputs are never mutated.
 */
import type { Quadrant, Todo } from './todo';

export const STATUS_FILTERS = ['all', 'active', 'completed'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export const DEFAULT_STATUS_FILTER: StatusFilter = 'active';

/** FR-9 */
export function filterByStatus(todos: readonly Todo[], filter: StatusFilter): Todo[] {
  switch (filter) {
    case 'all':
      return [...todos];
    case 'active':
      return todos.filter((t) => !t.isCompleted);
    case 'completed':
      return todos.filter((t) => t.isCompleted);
  }
}

// ISO-8601 UTC strings from toISOString() sort correctly as plain text.
const desc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

/** Newest first, with `id` as a tie-breaker so the order is always the same. */
const byCreatedDesc = (a: Todo, b: Todo) => desc(a.createdAt, b.createdAt) || desc(a.id, b.id);

/** Most recently completed first; active todos (no `completedAt`) go last. */
const byCompletedDesc = (a: Todo, b: Todo) =>
  desc(a.completedAt ?? '', b.completedAt ?? '') || byCreatedDesc(a, b);

/**
 * FR-10: the order used by the List view. The Completed filter sorts by
 * completion date; the others sort by creation date. Newest first.
 */
export function sortForList(todos: readonly Todo[], filter: StatusFilter): Todo[] {
  return [...todos].sort(filter === 'completed' ? byCompletedDesc : byCreatedDesc);
}

/** FR-8–10: filters and sorts in one step. */
export function selectListTodos(todos: readonly Todo[], filter: StatusFilter): Todo[] {
  return sortForList(filterByStatus(todos, filter), filter);
}

export type QuadrantGroups = Readonly<Record<Quadrant | 'unsorted', Todo[]>>;

/**
 * FR-13, FR-15, FR-17: groups todos for the Matrix view. Completed todos are
 * left out unless `includeCompleted` is true. In each group, active todos come
 * first, then newest first. Counts are the array lengths.
 */
export function groupByQuadrant(
  todos: readonly Todo[],
  options: { includeCompleted: boolean },
): QuadrantGroups {
  const groups: Record<Quadrant | 'unsorted', Todo[]> = {
    Q1: [],
    Q2: [],
    Q3: [],
    Q4: [],
    unsorted: [],
  };
  for (const todo of todos) {
    if (todo.isCompleted && !options.includeCompleted) continue;
    groups[todo.quadrant ?? 'unsorted'].push(todo);
  }
  const activeFirst = (a: Todo, b: Todo) =>
    Number(a.isCompleted) - Number(b.isCompleted) || byCreatedDesc(a, b);
  for (const list of Object.values(groups)) list.sort(activeFirst);
  return groups;
}
