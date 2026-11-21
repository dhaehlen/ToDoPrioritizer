/**
 * Business rules for todos (REQUIREMENTS §5.1–5.2).
 *
 * Every function here is pure: it never mutates its input, and the current
 * time and new ids are passed in. When an operation would change nothing, the
 * original object is returned unchanged (same reference), so callers can skip
 * the write and `updatedAt` is not bumped.
 */
import { err, ok, type Result } from './result';
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type ActiveTodo,
  type CompletedTodo,
  type Quadrant,
  type Todo,
} from './todo';

export interface TodoInput {
  title: string;
  description?: string;
  quadrant?: Quadrant | null;
}

/** Input after trimming and validation. */
export interface ValidTodoInput {
  readonly title: string;
  readonly description: string;
  readonly quadrant: Quadrant | null;
}

export type TodoField = 'title' | 'description';

export type ValidationError =
  | { readonly field: TodoField; readonly code: 'required' }
  | { readonly field: TodoField; readonly code: 'tooLong'; readonly max: number };

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Counts user-perceived characters (grapheme clusters), so "é", "👍", and
 * "👨‍👩‍👧" each count as one.
 */
export const charCount = (s: string): number => Array.from(graphemes.segment(s)).length;

/** FR-4: trims the input and checks it. Returns every problem found, not just the first. */
export function validateTodoInput(
  input: TodoInput,
): Result<ValidTodoInput, readonly ValidationError[]> {
  const title = input.title.trim();
  const description = (input.description ?? '').trim();
  const errors: ValidationError[] = [];

  if (title === '') {
    errors.push({ field: 'title', code: 'required' });
  } else if (charCount(title) > TITLE_MAX_LENGTH) {
    errors.push({ field: 'title', code: 'tooLong', max: TITLE_MAX_LENGTH });
  }
  if (charCount(description) > DESCRIPTION_MAX_LENGTH) {
    errors.push({ field: 'description', code: 'tooLong', max: DESCRIPTION_MAX_LENGTH });
  }

  if (errors.length > 0) return err(errors);
  return ok({ title, description, quadrant: input.quadrant ?? null });
}

/** FR-1: creates a new, active todo. */
export function createTodo(
  input: TodoInput,
  now: Date,
  id: string,
): Result<ActiveTodo, readonly ValidationError[]> {
  const validated = validateTodoInput(input);
  if (!validated.ok) return validated;

  const timestamp = now.toISOString();
  return ok({
    id,
    ...validated.value,
    isCompleted: false,
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * FR-2: changes the title, description, and/or quadrant. Fields left out of
 * `patch` are kept. `createdAt`, `completedAt`, and the completion state are
 * never changed by an edit.
 */
export function editTodo<T extends Todo>(
  todo: T,
  patch: Partial<TodoInput>,
  now: Date,
): Result<T, readonly ValidationError[]> {
  const validated = validateTodoInput({
    title: patch.title ?? todo.title,
    description: patch.description ?? todo.description,
    quadrant: patch.quadrant === undefined ? todo.quadrant : patch.quadrant,
  });
  if (!validated.ok) return validated;

  const { title, description, quadrant } = validated.value;
  if (title === todo.title && description === todo.description && quadrant === todo.quadrant) {
    return ok(todo);
  }
  return ok({ ...todo, title, description, quadrant, updatedAt: now.toISOString() });
}

/** FR-5: marks a todo done. Completing an already-completed todo keeps its original date. */
export function completeTodo(todo: Todo, now: Date): CompletedTodo {
  if (todo.isCompleted) return todo;
  const timestamp = now.toISOString();
  return { ...todo, isCompleted: true, completedAt: timestamp, updatedAt: timestamp };
}

/** FR-6: marks a completed todo as not done and clears its completion date. */
export function reopenTodo(todo: Todo, now: Date): ActiveTodo {
  if (!todo.isCompleted) return todo;
  return { ...todo, isCompleted: false, completedAt: null, updatedAt: now.toISOString() };
}

/** FR-14: moves a todo to a quadrant, or to Unsorted when `quadrant` is null. */
export function assignQuadrant<T extends Todo>(todo: T, quadrant: Quadrant | null, now: Date): T {
  if (todo.quadrant === quadrant) return todo;
  return { ...todo, quadrant, updatedAt: now.toISOString() };
}
