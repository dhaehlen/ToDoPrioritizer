import { describe, expect, it } from 'vitest';
import { activeTodo, completedTodo, T0, T1, T2 } from '../test/fixtures';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, type Todo } from './todo';
import {
  assignQuadrant,
  charCount,
  completeTodo,
  createTodo,
  editTodo,
  reopenTodo,
  validateTodoInput,
} from './todo.rules';

/** Unwraps a Result in tests, failing loudly if it is an error. */
function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`Expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

describe('validateTodoInput (FR-4)', () => {
  it('trims the title and description', () => {
    const result = unwrap(validateTodoInput({ title: '  Pay rent  ', description: '\n note \t' }));
    expect(result).toEqual({ title: 'Pay rent', description: 'note', quadrant: null });
  });

  it('defaults a missing description to an empty string and quadrant to null', () => {
    expect(unwrap(validateTodoInput({ title: 'x' }))).toEqual({
      title: 'x',
      description: '',
      quadrant: null,
    });
  });

  it('keeps the given quadrant', () => {
    expect(unwrap(validateTodoInput({ title: 'x', quadrant: 'Q3' })).quadrant).toBe('Q3');
  });

  it.each(['', '   ', '\t\n '])('rejects a blank title (%j)', (title) => {
    expect(validateTodoInput({ title })).toEqual({
      ok: false,
      error: [{ field: 'title', code: 'required' }],
    });
  });

  it('accepts a title of exactly the maximum length', () => {
    expect(validateTodoInput({ title: 'a'.repeat(TITLE_MAX_LENGTH) }).ok).toBe(true);
  });

  it('rejects a title one character over the maximum', () => {
    expect(validateTodoInput({ title: 'a'.repeat(TITLE_MAX_LENGTH + 1) })).toEqual({
      ok: false,
      error: [{ field: 'title', code: 'tooLong', max: TITLE_MAX_LENGTH }],
    });
  });

  it('measures length after trimming', () => {
    expect(validateTodoInput({ title: `  ${'a'.repeat(TITLE_MAX_LENGTH)}  ` }).ok).toBe(true);
  });

  it('counts what the user sees as one character as one', () => {
    expect(charCount('abc')).toBe(3);
    expect(charCount('👍')).toBe(1);
    expect(charCount('👨‍👩‍👧')).toBe(1); // family emoji: 5 code points joined
    expect(charCount('é')).toBe(1); // "é" as e + combining accent
    expect(validateTodoInput({ title: '👨‍👩‍👧'.repeat(TITLE_MAX_LENGTH) }).ok).toBe(true);
    expect(validateTodoInput({ title: '👍'.repeat(TITLE_MAX_LENGTH + 1) }).ok).toBe(false);
  });

  it('accepts a description of exactly the maximum length and rejects one over it', () => {
    expect(
      validateTodoInput({ title: 'x', description: 'd'.repeat(DESCRIPTION_MAX_LENGTH) }).ok,
    ).toBe(true);
    expect(
      validateTodoInput({ title: 'x', description: 'd'.repeat(DESCRIPTION_MAX_LENGTH + 1) }),
    ).toEqual({
      ok: false,
      error: [{ field: 'description', code: 'tooLong', max: DESCRIPTION_MAX_LENGTH }],
    });
  });

  it('reports every problem at once', () => {
    const result = validateTodoInput({
      title: ' ',
      description: 'd'.repeat(DESCRIPTION_MAX_LENGTH + 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.map((e) => e.field)).toEqual(['title', 'description']);
  });
});

describe('createTodo (FR-1)', () => {
  it('creates an active todo with system-set fields', () => {
    const todo = unwrap(createTodo({ title: ' Pay rent ', quadrant: 'Q1' }, T0, 'id-1'));
    expect(todo).toEqual({
      id: 'id-1',
      title: 'Pay rent',
      description: '',
      quadrant: 'Q1',
      isCompleted: false,
      completedAt: null,
      createdAt: T0.toISOString(),
      updatedAt: T0.toISOString(),
    });
  });

  it('puts a todo in Unsorted when no quadrant is given (Q5)', () => {
    expect(unwrap(createTodo({ title: 'x' }, T0, 'id')).quadrant).toBeNull();
  });

  it('returns validation errors and no todo for invalid input', () => {
    expect(createTodo({ title: '   ' }, T0, 'id')).toEqual({
      ok: false,
      error: [{ field: 'title', code: 'required' }],
    });
  });
});

describe('editTodo (FR-2)', () => {
  it('changes the given fields and refreshes updatedAt', () => {
    const todo = activeTodo({ title: 'Old', description: 'old', quadrant: 'Q2' });
    const edited = unwrap(editTodo(todo, { title: ' New ', description: 'new' }, T1));
    expect(edited).toEqual({
      ...todo,
      title: 'New',
      description: 'new',
      updatedAt: T1.toISOString(),
    });
  });

  it('keeps fields that are left out of the patch', () => {
    const todo = activeTodo({ title: 'Keep', description: 'keep me', quadrant: 'Q4' });
    const edited = unwrap(editTodo(todo, { title: 'Changed' }, T1));
    expect(edited.description).toBe('keep me');
    expect(edited.quadrant).toBe('Q4');
  });

  it('can move a todo to Unsorted with quadrant: null', () => {
    const todo = activeTodo({ quadrant: 'Q1' });
    expect(unwrap(editTodo(todo, { quadrant: null }, T1)).quadrant).toBeNull();
  });

  it('never changes createdAt, completedAt, or completion state (AC-2)', () => {
    const todo = completedTodo({ completedAt: T1.toISOString() });
    const edited = unwrap(editTodo(todo, { title: 'Renamed' }, T2));
    expect(edited.createdAt).toBe(todo.createdAt);
    expect(edited.isCompleted).toBe(true);
    expect(edited.completedAt).toBe(T1.toISOString());
  });

  it('returns the same object when nothing actually changes', () => {
    const todo = activeTodo({ title: 'Same', description: 'same', quadrant: 'Q2' });
    const result = unwrap(editTodo(todo, { title: '  Same  ', quadrant: 'Q2' }, T1));
    expect(result).toBe(todo);
  });

  it('rejects an invalid edit and leaves the todo untouched', () => {
    const todo = activeTodo({ title: 'Valid' });
    expect(editTodo(todo, { title: '' }, T1)).toEqual({
      ok: false,
      error: [{ field: 'title', code: 'required' }],
    });
    expect(todo.title).toBe('Valid');
  });
});

describe('completeTodo (FR-5)', () => {
  it('marks an active todo done with the current time and keeps it', () => {
    const todo = activeTodo({ quadrant: 'Q1' });
    const done = completeTodo(todo, T1);
    expect(done).toEqual({
      ...todo,
      isCompleted: true,
      completedAt: T1.toISOString(),
      updatedAt: T1.toISOString(),
    });
  });

  it('keeps the original completion date when completed twice', () => {
    const done = completedTodo({ completedAt: T1.toISOString() });
    expect(completeTodo(done, T2)).toBe(done);
  });

  it('does not mutate the input', () => {
    const todo = activeTodo();
    const snapshot = { ...todo };
    completeTodo(todo, T1);
    expect(todo).toEqual(snapshot);
  });
});

describe('reopenTodo (FR-6)', () => {
  it('marks a completed todo not done and clears completedAt', () => {
    const done = completedTodo();
    const reopened = reopenTodo(done, T2);
    expect(reopened).toEqual({
      ...done,
      isCompleted: false,
      completedAt: null,
      updatedAt: T2.toISOString(),
    });
  });

  it('returns an active todo unchanged', () => {
    const todo = activeTodo();
    expect(reopenTodo(todo, T1)).toBe(todo);
  });

  it('round-trips: complete then reopen restores the active state', () => {
    const todo = activeTodo({ title: 'Round trip', quadrant: 'Q3' });
    const back = reopenTodo(completeTodo(todo, T1), T2);
    expect(back).toEqual({ ...todo, updatedAt: T2.toISOString() });
  });
});

describe('assignQuadrant (FR-14)', () => {
  it('moves a todo into a quadrant and refreshes updatedAt', () => {
    const todo = activeTodo({ quadrant: null });
    expect(assignQuadrant(todo, 'Q2', T1)).toEqual({
      ...todo,
      quadrant: 'Q2',
      updatedAt: T1.toISOString(),
    });
  });

  it('moves a todo back to Unsorted', () => {
    expect(assignQuadrant(activeTodo({ quadrant: 'Q1' }), null, T1).quadrant).toBeNull();
  });

  it('returns the same object when the quadrant does not change', () => {
    const todo = activeTodo({ quadrant: 'Q3' });
    expect(assignQuadrant(todo, 'Q3', T1)).toBe(todo);
  });

  it('keeps the completion state of a completed todo', () => {
    const done = completedTodo();
    const moved = assignQuadrant(done, 'Q4', T2);
    expect(moved.isCompleted).toBe(true);
    expect(moved.completedAt).toBe(done.completedAt);
  });
});

describe('Todo type invariant (NFR-5)', () => {
  it('is enforced by the compiler', () => {
    const base = activeTodo();
    // @ts-expect-error — an active todo cannot have a completion date
    const activeWithDate: Todo = { ...base, isCompleted: false, completedAt: T1.toISOString() };
    // @ts-expect-error — a completed todo must have a completion date
    const completedWithoutDate: Todo = { ...base, isCompleted: true, completedAt: null };
    expect([activeWithDate, completedWithoutDate]).toHaveLength(2);
  });
});
