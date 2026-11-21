import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryTodoRepository } from '../data/InMemoryTodoRepository';
import type { TodoRepository } from '../data/TodoRepository';
import { activeTodo, completedTodo, T0, T1 } from '../test/fixtures';
import { TodoService, type ServiceResult } from './TodoService';

function unwrap<T>(result: ServiceResult<T>): T {
  if (!result.ok) throw new Error(`Expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

describe('TodoService', () => {
  let repo: InMemoryTodoRepository;
  let now: Date;
  let onStorageError: ReturnType<typeof vi.fn<(error: unknown) => void>>;
  let service: TodoService;

  beforeEach(() => {
    repo = new InMemoryTodoRepository();
    now = T0;
    let n = 0;
    onStorageError = vi.fn<(error: unknown) => void>();
    service = new TodoService(repo, {
      clock: () => now,
      newId: () => `id-${String(++n)}`,
      onStorageError,
    });
  });

  describe('create (FR-1)', () => {
    it('stores a new todo with a new id and the current time', async () => {
      const todo = unwrap(await service.create({ title: ' Pay rent ', quadrant: 'Q1' }));
      expect(todo).toMatchObject({
        id: 'id-1',
        title: 'Pay rent',
        quadrant: 'Q1',
        isCompleted: false,
        createdAt: T0.toISOString(),
      });
      expect(await repo.get('id-1')).toEqual(todo);
    });

    it('returns validation errors and stores nothing (AC-4)', async () => {
      const result = await service.create({ title: '   ' });
      expect(result).toEqual({
        ok: false,
        error: { kind: 'validation', errors: [{ field: 'title', code: 'required' }] },
      });
      expect(await repo.getAll()).toEqual([]);
      expect(onStorageError).not.toHaveBeenCalled();
    });
  });

  describe('update (FR-2)', () => {
    it('saves the edit', async () => {
      const todo = activeTodo({ title: 'Old' });
      await repo.put(todo);
      now = T1;
      const edited = unwrap(await service.update(todo.id, { title: 'New' }));
      expect(edited).toMatchObject({ title: 'New', updatedAt: T1.toISOString() });
      expect(await repo.get(todo.id)).toEqual(edited);
    });

    it('returns validation errors and keeps the stored todo', async () => {
      const todo = activeTodo({ title: 'Keep' });
      await repo.put(todo);
      const result = await service.update(todo.id, { title: '' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe('validation');
      expect(await repo.get(todo.id)).toEqual(todo);
    });

    it('returns notFound for an unknown id', async () => {
      expect(await service.update('missing', { title: 'x' })).toEqual({
        ok: false,
        error: { kind: 'notFound', id: 'missing' },
      });
    });
  });

  describe('complete and reopen (FR-5, FR-6)', () => {
    it('completes a todo with the current time and keeps it (AC-1)', async () => {
      const todo = activeTodo();
      await repo.put(todo);
      now = T1;
      const done = unwrap(await service.complete(todo.id));
      expect(done).toMatchObject({ isCompleted: true, completedAt: T1.toISOString() });
      expect(await repo.get(todo.id)).toEqual(done);
    });

    it('reopens a completed todo', async () => {
      const done = completedTodo();
      await repo.put(done);
      const reopened = unwrap(await service.reopen(done.id));
      expect(reopened).toMatchObject({ isCompleted: false, completedAt: null });
      expect(await repo.get(done.id)).toEqual(reopened);
    });

    it('skips the write when nothing changes', async () => {
      const done = completedTodo();
      await repo.put(done);
      const put = vi.spyOn(repo, 'put');
      expect(unwrap(await service.complete(done.id))).toEqual(done);
      expect(put).not.toHaveBeenCalled();
    });

    it('returns notFound for an unknown id', async () => {
      expect((await service.complete('missing')).ok).toBe(false);
      expect((await service.reopen('missing')).ok).toBe(false);
    });
  });

  describe('assignQuadrant (FR-14)', () => {
    it('moves a todo into a quadrant and back to Unsorted (AC-3)', async () => {
      const todo = activeTodo({ quadrant: null });
      await repo.put(todo);
      expect(unwrap(await service.assignQuadrant(todo.id, 'Q2')).quadrant).toBe('Q2');
      expect((await repo.get(todo.id))?.quadrant).toBe('Q2');
      expect(unwrap(await service.assignQuadrant(todo.id, null)).quadrant).toBeNull();
    });

    it('skips the write when dropped on its current quadrant', async () => {
      const todo = activeTodo({ quadrant: 'Q3' });
      await repo.put(todo);
      const put = vi.spyOn(repo, 'put');
      await service.assignQuadrant(todo.id, 'Q3');
      expect(put).not.toHaveBeenCalled();
    });
  });

  describe('remove (FR-3)', () => {
    it('deletes the todo (AC-5)', async () => {
      const todo = activeTodo();
      await repo.put(todo);
      expect(await service.remove(todo.id)).toEqual({ ok: true, value: undefined });
      expect(await repo.get(todo.id)).toBeUndefined();
    });

    it('treats removing a missing todo as success', async () => {
      expect((await service.remove('missing')).ok).toBe(true);
    });
  });

  describe('storage failures', () => {
    const failure = new Error('disk full');
    const failing = (method: keyof TodoRepository) => {
      vi.spyOn(repo, method).mockRejectedValue(failure);
    };

    it('reports a failed write and returns a storage error', async () => {
      failing('put');
      expect(await service.create({ title: 'x' })).toEqual({
        ok: false,
        error: { kind: 'storage', cause: failure },
      });
      expect(onStorageError).toHaveBeenCalledWith(failure);
    });

    it('reports a failed read', async () => {
      failing('get');
      const result = await service.complete('any');
      expect(result).toEqual({ ok: false, error: { kind: 'storage', cause: failure } });
      expect(onStorageError).toHaveBeenCalledOnce();
    });

    it('reports a failed delete', async () => {
      failing('delete');
      expect((await service.remove('any')).ok).toBe(false);
      expect(onStorageError).toHaveBeenCalledOnce();
    });

    it('works without an onStorageError callback, and uses the real clock and ids', async () => {
      const plain = new TodoService(repo);
      const todo = unwrap(await plain.create({ title: 'Real clock' }));
      expect(todo.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(Date.parse(todo.createdAt)).not.toBeNaN();

      failing('put');
      expect((await plain.create({ title: 'x' })).ok).toBe(false);
    });
  });
});
