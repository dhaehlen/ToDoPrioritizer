import { vi } from 'vitest';
import { InMemoryTodoRepository } from '../data/InMemoryTodoRepository';
import type { TodoObserver, TodoRepository } from '../data/TodoRepository';
import type { Todo } from '../domain/todo';

/**
 * A repository whose subscription is driven by hand: the test decides when
 * the list arrives (`emit`) and when storage fails (`fail`). Reads and writes
 * go to an in-memory repository, and every method is a spy.
 */
export function createControllableRepository(initial: readonly Todo[] = []) {
  const backing = new InMemoryTodoRepository(initial);
  const observers = new Set<TodoObserver>();

  const repo = {
    getAll: vi.fn(() => backing.getAll()),
    get: vi.fn((id: string) => backing.get(id)),
    put: vi.fn((todo: Todo) => backing.put(todo)),
    delete: vi.fn((id: string) => backing.delete(id)),
    subscribe: vi.fn((observer: TodoObserver) => {
      observers.add(observer);
      return () => {
        observers.delete(observer);
      };
    }),
  } satisfies TodoRepository;

  return {
    repo,
    /** How many storage subscriptions are currently open. */
    get subscriberCount() {
      return observers.size;
    },
    emit(todos: readonly Todo[]) {
      for (const o of [...observers]) o.next(todos);
    },
    fail(error: unknown) {
      for (const o of [...observers]) o.error?.(error);
    },
  };
}
