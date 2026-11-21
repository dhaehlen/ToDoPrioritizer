import { liveQuery } from 'dexie';
import type { Todo } from '../domain/todo';
import type { TodoDatabase } from './db';
import type { TodoObserver, TodoRepository } from './TodoRepository';
import { assertValidTodo, parseStoredTodos, type InvalidRecord } from './todoSchema';

export interface DexieTodoRepositoryOptions {
  /** Called for each stored record that fails the schema check. Defaults to `console.warn`. */
  onInvalidRecord?: (invalid: InvalidRecord) => void;
}

const warnInvalid = (invalid: InvalidRecord) => {
  console.warn('Skipping an invalid todo record from storage', invalid);
};

/**
 * The production `TodoRepository`, backed by IndexedDB through Dexie.
 * Each `put` and `delete` is a single IndexedDB transaction (NFR-5).
 */
export class DexieTodoRepository implements TodoRepository {
  readonly #db: TodoDatabase;
  readonly #onInvalidRecord: (invalid: InvalidRecord) => void;

  constructor(db: TodoDatabase, options: DexieTodoRepositoryOptions = {}) {
    this.#db = db;
    this.#onInvalidRecord = options.onInvalidRecord ?? warnInvalid;
  }

  async getAll(): Promise<Todo[]> {
    return this.#parse(await this.#db.todos.toArray());
  }

  async get(id: string): Promise<Todo | undefined> {
    const record = await this.#db.todos.get(id);
    if (record === undefined) return undefined;
    return this.#parse([record])[0];
  }

  async put(todo: Todo): Promise<void> {
    await this.#db.todos.put(assertValidTodo(todo));
  }

  async delete(id: string): Promise<void> {
    await this.#db.todos.delete(id);
  }

  subscribe(observer: TodoObserver): () => void {
    // liveQuery re-runs the query after any write to `todos`, including
    // writes from other tabs (Dexie broadcasts changes between them).
    const subscription = liveQuery(() => this.getAll()).subscribe({
      next: (todos) => {
        observer.next(todos);
      },
      error: (error: unknown) => observer.error?.(error),
    });
    return () => {
      subscription.unsubscribe();
    };
  }

  #parse(records: readonly unknown[]): Todo[] {
    const { todos, invalid } = parseStoredTodos(records);
    for (const record of invalid) this.#onInvalidRecord(record);
    return todos;
  }
}
