import type { TodoRepository } from '../data/TodoRepository';
import type { Todo } from '../domain/todo';

export interface TodoStoreState {
  /**
   * - `loading`: waiting for the first list from storage.
   * - `ready`: `todos` is up to date.
   * - `error`: storage is failing. `todos` is the last list that loaded (empty
   *   if none ever did), and the store keeps retrying in the background.
   */
  readonly status: 'loading' | 'ready' | 'error';
  readonly todos: readonly Todo[];
  /** Why loading is failing, while `status` is `error`. */
  readonly loadError: unknown;
  /** The most recent failed save, until dismissed. */
  readonly saveError: unknown;
}

export interface TodoStoreOptions {
  /** How long to wait before re-subscribing after a storage error. */
  retryDelayMs?: number;
}

const INITIAL_STATE: TodoStoreState = {
  status: 'loading',
  todos: [],
  loadError: null,
  saveError: null,
};

/**
 * Holds the app's todo list in memory (ARCHITECTURE §5).
 *
 * There is one store per app, and it is the only thing that subscribes to the
 * repository. Components read it through `useTodos()`. Its
 * `subscribe`/`getSnapshot` pair is shaped for React's `useSyncExternalStore`.
 *
 * The storage subscription starts with the first listener and stays open
 * until `stop()`, even when the listener count drops to zero. Switching views
 * therefore never restarts it or shows "loading" again. After `stop()`, a new
 * listener starts it again. This is what React StrictMode's
 * mount → cleanup → mount cycle needs in development.
 */
export class TodoStore {
  readonly #repo: TodoRepository;
  readonly #retryDelayMs: number;
  readonly #listeners = new Set<() => void>();
  #state: TodoStoreState = INITIAL_STATE;
  #unsubscribeRepo: (() => void) | null = null;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(repo: TodoRepository, options: TodoStoreOptions = {}) {
    this.#repo = repo;
    this.#retryDelayMs = options.retryDelayMs ?? 2000;
  }

  /** For `useSyncExternalStore`. Returns the same object until something changes. */
  getSnapshot = (): TodoStoreState => this.#state;

  /** For `useSyncExternalStore`. Starts the storage subscription on first use. */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    this.#start();
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Records a failed save so the UI can show it (called by `TodoService`). */
  reportSaveError = (error: unknown): void => {
    this.#setState({ saveError: error });
  };

  dismissSaveError = (): void => {
    if (this.#state.saveError !== null) this.#setState({ saveError: null });
  };

  /** Stops watching storage and cancels any pending retry. The last state is kept. */
  stop(): void {
    this.#stop();
  }

  #start(): void {
    if (this.#unsubscribeRepo || this.#retryTimer) return;
    this.#unsubscribeRepo = this.#repo.subscribe({
      next: (todos) => {
        this.#setState({ status: 'ready', todos, loadError: null });
      },
      error: (error) => {
        this.#stop();
        this.#setState({ status: 'error', loadError: error });
        this.#retryTimer = setTimeout(() => {
          this.#retryTimer = null;
          this.#start();
        }, this.#retryDelayMs);
      },
    });
  }

  #stop(): void {
    this.#unsubscribeRepo?.();
    this.#unsubscribeRepo = null;
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    this.#retryTimer = null;
  }

  #setState(patch: Partial<TodoStoreState>): void {
    this.#state = { ...this.#state, ...patch };
    for (const listener of this.#listeners) listener();
  }
}
