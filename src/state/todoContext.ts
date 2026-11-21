import { createContext, useContext } from 'react';
import type { TodoService } from './TodoService';
import type { TodoStore } from './TodoStore';

export interface TodoContextValue {
  readonly store: TodoStore;
  readonly service: TodoService;
}

export const TodoContext = createContext<TodoContextValue | null>(null);

export function useTodoContext(): TodoContextValue {
  const value = useContext(TodoContext);
  if (!value) throw new Error('useTodos/useTodoActions must be used inside <TodoProvider>.');
  return value;
}
