import { useMemo, useState } from 'react';
import { useTodoContext } from './todoContext';
import type { TodoService } from './TodoService';

type ActionName = 'create' | 'update' | 'complete' | 'reopen' | 'assignQuadrant' | 'remove';
export type TodoActions = Pick<TodoService, ActionName> & {
  /** True while any action started from this hook is still running. */
  readonly pending: boolean;
};

/**
 * The todo actions for a component. They return a `ServiceResult` and never
 * throw. Validation errors are for the component to show (for example, next to
 * a form field). Storage failures are also reported to the shared store, which
 * the error banner reads, so components don't have to handle them.
 */
export function useTodoActions(): TodoActions {
  const { service } = useTodoContext();
  const [inFlight, setInFlight] = useState(0);

  const actions = useMemo(() => {
    const track =
      <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        setInFlight((n) => n + 1);
        try {
          return await fn(...args);
        } finally {
          setInFlight((n) => n - 1);
        }
      };
    return {
      create: track(service.create.bind(service)),
      update: track(service.update.bind(service)),
      complete: track(service.complete.bind(service)),
      reopen: track(service.reopen.bind(service)),
      assignQuadrant: track(service.assignQuadrant.bind(service)),
      remove: track(service.remove.bind(service)),
    };
  }, [service]);

  return useMemo(() => ({ ...actions, pending: inFlight > 0 }), [actions, inFlight]);
}
