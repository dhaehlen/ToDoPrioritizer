import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { InMemoryTodoRepository } from '../data/InMemoryTodoRepository';
import type { TodoRepository } from '../data/TodoRepository';
import { createAppRouter } from '../router';
import { TodoProvider, type TodoProviderProps } from '../state/TodoProvider';

export interface RenderAppOptions {
  /** Defaults to an empty in-memory repository. */
  repository?: TodoRepository;
  serviceOptions?: TodoProviderProps['serviceOptions'];
  storeOptions?: TodoProviderProps['storeOptions'];
}

/**
 * Renders the full app at `path`, using in-memory history (no real URL bar)
 * and in-memory storage unless another repository is given.
 */
export async function renderWithRouter(path = '/', options: RenderAppOptions = {}) {
  const repository = options.repository ?? new InMemoryTodoRepository();
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  const result = render(
    <TodoProvider
      repository={repository}
      serviceOptions={options.serviceOptions}
      storeOptions={options.storeOptions}
    >
      <RouterProvider router={router} />
    </TodoProvider>,
  );
  return { router, repository, ...result };
}
