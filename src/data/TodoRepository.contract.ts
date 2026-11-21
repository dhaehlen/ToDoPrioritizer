/**
 * The shared contract suite (ARCHITECTURE §4.3). Every `TodoRepository`
 * implementation runs these tests, so they are known to behave the same.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../domain/todo';
import { activeTodo, completedTodo } from '../test/fixtures';
import type { TodoRepository } from './TodoRepository';
import { InvalidTodoError } from './todoSchema';

export interface ContractFixture {
  repo: TodoRepository;
  cleanup?: () => void | Promise<void>;
}

/** Waits long enough for any pending async notification to be delivered. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

const byId = (a: Todo, b: Todo) => a.id.localeCompare(b.id);

export function runTodoRepositoryContract(name: string, setup: () => Promise<ContractFixture>) {
  describe(`${name} — TodoRepository contract`, () => {
    let fixture: ContractFixture;
    let repo: TodoRepository;

    beforeEach(async () => {
      fixture = await setup();
      repo = fixture.repo;
    });

    afterEach(async () => {
      await fixture.cleanup?.();
    });

    describe('reads and writes', () => {
      it('starts empty', async () => {
        expect(await repo.getAll()).toEqual([]);
      });

      it('stores an active todo and reads it back', async () => {
        const todo = activeTodo({ quadrant: 'Q2', description: 'notes' });
        await repo.put(todo);
        expect(await repo.get(todo.id)).toEqual(todo);
        expect(await repo.getAll()).toEqual([todo]);
      });

      it('stores a completed todo and keeps its completion date', async () => {
        const todo = completedTodo();
        await repo.put(todo);
        expect(await repo.get(todo.id)).toEqual(todo);
      });

      it('returns every stored todo', async () => {
        const todos = [activeTodo(), completedTodo(), activeTodo({ quadrant: 'Q4' })];
        for (const t of todos) await repo.put(t);
        expect((await repo.getAll()).sort(byId)).toEqual([...todos].sort(byId));
      });

      it('replaces a todo with the same id', async () => {
        const todo = activeTodo({ title: 'Before' });
        await repo.put(todo);
        await repo.put({ ...todo, title: 'After' });
        expect(await repo.getAll()).toEqual([{ ...todo, title: 'After' }]);
      });

      it('returns undefined for an unknown id', async () => {
        expect(await repo.get('missing')).toBeUndefined();
      });

      it('deletes a todo by id', async () => {
        const keep = activeTodo();
        const remove = activeTodo();
        await repo.put(keep);
        await repo.put(remove);
        await repo.delete(remove.id);
        expect(await repo.getAll()).toEqual([keep]);
        expect(await repo.get(remove.id)).toBeUndefined();
      });

      it('treats deleting an unknown id as a no-op', async () => {
        await repo.put(activeTodo());
        await expect(repo.delete('missing')).resolves.toBeUndefined();
        expect(await repo.getAll()).toHaveLength(1);
      });
    });

    describe('validation (NFR-5)', () => {
      it('rejects a malformed todo and writes nothing', async () => {
        const bad = { ...activeTodo(), completedAt: '2026-11-20T10:00:00.000Z' } as unknown as Todo;
        await expect(repo.put(bad)).rejects.toBeInstanceOf(InvalidTodoError);
        expect(await repo.getAll()).toEqual([]);
      });

      it('rejects a malformed replacement and keeps the original', async () => {
        const todo = activeTodo({ title: 'Original' });
        await repo.put(todo);
        await expect(repo.put({ ...todo, title: '   ' })).rejects.toBeInstanceOf(InvalidTodoError);
        expect(await repo.get(todo.id)).toEqual(todo);
      });
    });

    describe('isolation', () => {
      it('is not affected by changing a todo after putting it', async () => {
        const todo = activeTodo({ title: 'Stored' });
        await repo.put(todo);
        (todo as { title: string }).title = 'Changed outside';
        expect((await repo.get(todo.id))?.title).toBe('Stored');
      });

      it('is not affected by changing a todo it returned', async () => {
        const todo = activeTodo({ title: 'Stored' });
        await repo.put(todo);
        const [read] = await repo.getAll();
        (read as { title: string }).title = 'Changed outside';
        expect((await repo.get(todo.id))?.title).toBe('Stored');
      });
    });

    describe('subscribe', () => {
      it('sends the current todos right after subscribing', async () => {
        const todo = activeTodo();
        await repo.put(todo);
        const next = vi.fn();
        const unsubscribe = repo.subscribe({ next });
        await vi.waitFor(() => {
          expect(next).toHaveBeenLastCalledWith([todo]);
        });
        unsubscribe();
      });

      it('sends the updated list after put and delete', async () => {
        const next = vi.fn();
        const unsubscribe = repo.subscribe({ next });
        await vi.waitFor(() => {
          expect(next).toHaveBeenLastCalledWith([]);
        });

        const todo = activeTodo();
        await repo.put(todo);
        await vi.waitFor(() => {
          expect(next).toHaveBeenLastCalledWith([todo]);
        });

        await repo.delete(todo.id);
        await vi.waitFor(() => {
          expect(next).toHaveBeenLastCalledWith([]);
        });
        unsubscribe();
      });

      it('notifies every subscriber', async () => {
        const a = vi.fn();
        const b = vi.fn();
        const unsubA = repo.subscribe({ next: a });
        const unsubB = repo.subscribe({ next: b });
        const todo = activeTodo();
        await repo.put(todo);
        await vi.waitFor(() => {
          expect(a).toHaveBeenLastCalledWith([todo]);
          expect(b).toHaveBeenLastCalledWith([todo]);
        });
        unsubA();
        unsubB();
      });

      it('stops notifying after unsubscribing', async () => {
        const next = vi.fn();
        const unsubscribe = repo.subscribe({ next });
        await vi.waitFor(() => {
          expect(next).toHaveBeenCalled();
        });
        unsubscribe();
        const calls = next.mock.calls.length;

        await repo.put(activeTodo());
        await settle();
        expect(next).toHaveBeenCalledTimes(calls);
      });

      it('sends nothing if unsubscribed before the first notification', async () => {
        const next = vi.fn();
        repo.subscribe({ next })();
        await settle();
        expect(next).not.toHaveBeenCalled();
      });
    });
  });
}
