import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { createAppRouter } from '../router';

/** Renders the full app at `path` using in-memory history (no real URL bar). */
export async function renderWithRouter(path = '/') {
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  const result = render(<RouterProvider router={router} />);
  return { router, ...result };
}
