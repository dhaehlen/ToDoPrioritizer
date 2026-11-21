import type { Todo } from '../domain/todo';
import type { TodoObserver, TodoRepository } from './TodoRepository';
import { assertValidTodo, InvalidTodoError, todoSchema } from './todoSchema';

/**
 * A `TodoRepository` backed by a `Map`. Used in component tests, and it passes
 * the same contract suite as the Dexie implementation. Stored and returned
 * todos are copies, like real storage.
 */
export class InMemoryTodoRepository implements TodoRepository {
  readonly #todos = new Map<string, Todo>();
  readonly #observers = new Set<TodoObserver>();

  constructor(initial: readonly Todo[] = []) {
    for (const todo of initial) this.#todos.set(todo.id, structuredClone(assertValidTodo(todo)));
  }

  getAll(): Promise<Todo[]> {
    return Promise.resolve(this.#snapshot());
  }

  get(id: string): Promise<Todo | undefined> {
    const todo = this.#todos.get(id);
    return Promise.resolve(todo && structuredClone(todo));
  }

  put(todo: Todo): Promise<void> {
    const result = todoSchema.safeParse(todo);
    if (!result.success) return Promise.reject(new InvalidTodoError(result.error));
    this.#todos.set(todo.id, structuredClone(result.data));
    this.#notify();
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    if (this.#todos.delete(id)) this.#notify();
    return Promise.resolve();
  }

  subscribe(observer: TodoObserver): () => void {
    this.#observers.add(observer);
    queueMicrotask(() => {
      if (this.#observers.has(observer)) observer.next(this.#snapshot());
    });
    return () => {
      this.#observers.delete(observer);
    };
  }

  #snapshot(): Todo[] {
    return [...this.#todos.values()].map((t) => structuredClone(t));
  }

  #notify(): void {
    queueMicrotask(() => {
      for (const observer of this.#observers) observer.next(this.#snapshot());
    });
  }
}
