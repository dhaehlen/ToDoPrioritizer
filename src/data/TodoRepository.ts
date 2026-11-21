import type { Todo } from '../domain/todo';

export interface TodoObserver {
  /** Called with every todo after subscribing, and again after each change. */
  next(todos: readonly Todo[]): void;
  /** Called if storage fails while watching for changes. */
  error?(error: unknown): void;
}

/**
 * The only way the app reads or writes todos (ARCHITECTURE §4.1).
 *
 * Contract (checked by `TodoRepository.contract.ts` for every implementation):
 * - `getAll` returns every stored todo, in no particular order. Callers sort
 *   with the domain selectors.
 * - `put` inserts or replaces a todo by `id`, all-or-nothing. A todo that fails
 *   the runtime schema check is rejected with `InvalidTodoError`, and nothing
 *   is written.
 * - `delete` removes a todo by `id`. Deleting an id that does not exist is a
 *   no-op.
 * - `subscribe` sends the full list to the observer, asynchronously, right
 *   after subscribing and again after every change. Changes made close
 *   together may be batched into one notification. The returned function
 *   unsubscribes.
 * - Returned todos are copies. Changing them never changes what is stored.
 */
export interface TodoRepository {
  getAll(): Promise<Todo[]>;
  get(id: string): Promise<Todo | undefined>;
  put(todo: Todo): Promise<void>;
  delete(id: string): Promise<void>;
  subscribe(observer: TodoObserver): () => void;
}
