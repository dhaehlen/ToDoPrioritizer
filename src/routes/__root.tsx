import { createRootRoute } from '@tanstack/react-router';
import { AppShell } from '../ui/AppShell';

export const Route = createRootRoute({
  head: () => ({ meta: [{ title: 'ToDoPrioritizer' }] }),
  component: AppShell,
});
