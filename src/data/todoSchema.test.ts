import { describe, expect, it } from 'vitest';
import { activeTodo, completedTodo } from '../test/fixtures';
import { assertValidTodo, InvalidTodoError, parseStoredTodos, todoSchema } from './todoSchema';

const valid = (value: unknown) => todoSchema.safeParse(value).success;

describe('todoSchema', () => {
  it('accepts valid active and completed todos', () => {
    expect(valid(activeTodo())).toBe(true);
    expect(valid(completedTodo({ quadrant: 'Q3' }))).toBe(true);
  });

  it('enforces the completedAt invariant', () => {
    expect(valid({ ...activeTodo(), completedAt: '2026-11-20T10:00:00.000Z' })).toBe(false);
    expect(valid({ ...completedTodo(), completedAt: null })).toBe(false);
  });

  it.each([
    ['an empty id', { id: '' }],
    ['a blank title', { title: '   ' }],
    ['an unknown quadrant', { quadrant: 'Q5' }],
    ['a non-UTC timestamp', { createdAt: '2026-11-20T10:00:00+02:00' }],
    ['a non-ISO timestamp', { updatedAt: 'yesterday' }],
    ['a missing description', { description: undefined }],
    ['a string isCompleted', { isCompleted: 'false' }],
  ])('rejects %s', (_label, override) => {
    expect(valid({ ...activeTodo(), ...override })).toBe(false);
  });

  it('accepts null quadrant (Unsorted)', () => {
    expect(valid(activeTodo({ quadrant: null }))).toBe(true);
  });

  it('does not enforce the domain length limits', () => {
    expect(valid(activeTodo({ title: 'a'.repeat(500) }))).toBe(true);
  });

  it('strips unknown fields', () => {
    const todo = activeTodo();
    expect(todoSchema.parse({ ...todo, extra: 1 })).toEqual(todo);
  });
});

describe('assertValidTodo', () => {
  it('returns a valid todo', () => {
    const todo = activeTodo();
    expect(assertValidTodo(todo)).toEqual(todo);
  });

  it('throws InvalidTodoError with readable issues', () => {
    try {
      assertValidTodo({ ...activeTodo(), quadrant: 'Q9' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTodoError);
      const e = error as InvalidTodoError;
      expect(e.name).toBe('InvalidTodoError');
      expect(e.message).toContain('quadrant');
      expect(e.issues[0]?.path).toEqual(['quadrant']);
    }
  });
});

describe('parseStoredTodos', () => {
  it('separates valid todos from invalid records', () => {
    const good = activeTodo();
    const bad = { id: 'x' };
    const { todos, invalid } = parseStoredTodos([good, bad, null]);
    expect(todos).toEqual([good]);
    expect(invalid.map((i) => i.record)).toEqual([bad, null]);
    expect(invalid[0]?.issues.length).toBeGreaterThan(0);
  });
});
