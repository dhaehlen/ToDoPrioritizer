import { useEffect, useState, type ReactNode } from 'react';
import type { TodoRepository } from '../data/TodoRepository';
import { TodoContext, type TodoContextValue } from './todoContext';
import { TodoService, type TodoServiceOptions } from './TodoService';
import { TodoStore, type TodoStoreOptions } from './TodoStore';

export interface TodoProviderProps {
  /** The storage to use: Dexie in the app, in-memory in tests. Read once, on first render. */
  repository: TodoRepository;
  /** Overrides for tests, such as a fixed clock and predictable ids. Read once. */
  serviceOptions?: Omit<TodoServiceOptions, 'onStorageError'>;
  /** Read once. */
  storeOptions?: TodoStoreOptions;
  children: ReactNode;
}

/**
 * Creates the app's single `TodoStore` and `TodoService` and gives them to
 * every component below it (ARCHITECTURE §5). Storage is chosen by whoever
 * renders the provider, so nothing in the UI knows which storage is used.
 *
 * The props are read only on the first render. To switch storage, give the
 * provider a new `key`.
 */
export function TodoProvider({
  repository,
  serviceOptions,
  storeOptions,
  children,
}: TodoProviderProps) {
  const [value] = useState<TodoContextValue>(() => {
    const store = new TodoStore(repository, storeOptions);
    const service = new TodoService(repository, {
      ...serviceOptions,
      onStorageError: store.reportSaveError,
    });
    return { store, service };
  });

  const { store } = value;
  useEffect(
    () => () => {
      store.stop();
    },
    [store],
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}
