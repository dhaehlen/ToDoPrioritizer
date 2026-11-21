import { useSyncExternalStore } from 'react';
import { useTodoContext } from './todoContext';
import type { TodoStoreState } from './TodoStore';

/**
 * The current todo list and its loading/error status. Every component that
 * calls this reads the same shared store, so the List and Matrix views always
 * agree (FR-16). Filter, sort, and group with the selectors in
 * `domain/selectors.ts`.
 */
export function useTodos(): TodoStoreState {
  const { store } = useTodoContext();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** Lets the UI dismiss the "couldn't save" banner. */
export function useDismissSaveError(): () => void {
  return useTodoContext().store.dismissSaveError;
}
