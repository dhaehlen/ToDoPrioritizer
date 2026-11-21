import type { TodoRepository } from '../data/TodoRepository';
import { err, ok, type Result } from '../domain/result';
import type { Quadrant, Todo } from '../domain/todo';
import {
  assignQuadrant,
  completeTodo,
  createTodo,
  editTodo,
  reopenTodo,
  type TodoInput,
  type ValidationError,
} from '../domain/todo.rules';
import { randomId, systemClock, type Clock, type IdGenerator } from '../lib/clock';

export type TodoServiceError =
  /** The input broke a business rule (FR-4). Show these next to the fields. */
  | { readonly kind: 'validation'; readonly errors: readonly ValidationError[] }
  /** The todo no longer exists (for example, it was deleted in another tab). */
  | { readonly kind: 'notFound'; readonly id: string }
  /** Storage failed. Also reported through `onStorageError`. */
  | { readonly kind: 'storage'; readonly cause: unknown };

export type ServiceResult<T> = Result<T, TodoServiceError>;

export interface TodoServiceOptions {
  clock?: Clock;
  newId?: IdGenerator;
  /** Called whenever a storage operation fails, e.g. to show an error banner. */
  onStorageError?: (error: unknown) => void;
}

/**
 * The app's use cases (ARCHITECTURE §5). Each one reads the todo, applies a
 * domain rule, and saves the result. If the rule changes nothing, the save is
 * skipped.
 *
 * Methods never throw: every failure is returned as a `TodoServiceError`.
 */
export class TodoService {
  readonly #repo: TodoRepository;
  readonly #clock: Clock;
  readonly #newId: IdGenerator;
  readonly #onStorageError: (error: unknown) => void;

  constructor(repo: TodoRepository, options: TodoServiceOptions = {}) {
    this.#repo = repo;
    this.#clock = options.clock ?? systemClock;
    this.#newId = options.newId ?? randomId;
    this.#onStorageError = options.onStorageError ?? (() => undefined);
  }

  /** FR-1 */
  async create(input: TodoInput): Promise<ServiceResult<Todo>> {
    const result = createTodo(input, this.#clock(), this.#newId());
    if (!result.ok) return err({ kind: 'validation', errors: result.error });
    return this.#save(result.value);
  }

  /** FR-2 */
  update(id: string, patch: Partial<TodoInput>): Promise<ServiceResult<Todo>> {
    return this.#modify(id, (todo) => {
      const result = editTodo(todo, patch, this.#clock());
      return result.ok ? ok(result.value) : err({ kind: 'validation', errors: result.error });
    });
  }

  /** FR-5 */
  complete(id: string): Promise<ServiceResult<Todo>> {
    return this.#modify(id, (todo) => ok(completeTodo(todo, this.#clock())));
  }

  /** FR-6 */
  reopen(id: string): Promise<ServiceResult<Todo>> {
    return this.#modify(id, (todo) => ok(reopenTodo(todo, this.#clock())));
  }

  /** FR-14: `null` moves the todo to Unsorted. */
  assignQuadrant(id: string, quadrant: Quadrant | null): Promise<ServiceResult<Todo>> {
    return this.#modify(id, (todo) => ok(assignQuadrant(todo, quadrant, this.#clock())));
  }

  /** FR-3. Removing a todo that is already gone counts as success. */
  async remove(id: string): Promise<ServiceResult<void>> {
    try {
      await this.#repo.delete(id);
      return ok(undefined);
    } catch (cause) {
      return this.#storageFailure(cause);
    }
  }

  async #modify(
    id: string,
    change: (todo: Todo) => ServiceResult<Todo>,
  ): Promise<ServiceResult<Todo>> {
    let current: Todo | undefined;
    try {
      current = await this.#repo.get(id);
    } catch (cause) {
      return this.#storageFailure(cause);
    }
    if (!current) return err({ kind: 'notFound', id });

    const result = change(current);
    if (!result.ok) return result;
    if (result.value === current) return result; // nothing changed: skip the write
    return this.#save(result.value);
  }

  async #save(todo: Todo): Promise<ServiceResult<Todo>> {
    try {
      await this.#repo.put(todo);
      return ok(todo);
    } catch (cause) {
      return this.#storageFailure(cause);
    }
  }

  #storageFailure(cause: unknown): ServiceResult<never> {
    this.#onStorageError(cause);
    return err({ kind: 'storage', cause });
  }
}
