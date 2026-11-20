import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

type RouterOptions = Parameters<typeof createRouter<typeof routeTree>>[0];

/** Creates the app router. Tests pass `history` to use in-memory history. */
export function createAppRouter(options: Partial<RouterOptions> = {}) {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    ...options,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
