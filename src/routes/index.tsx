import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod';
import { DEFAULT_STATUS_FILTER, STATUS_FILTERS } from '../domain/selectors';
import { ListView } from '../ui/list/ListView';

/**
 * The List view's URL search params (ARCHITECTURE §6.1).
 * - A missing `status` means the default filter, Active (FR-9).
 * - An invalid value, such as `?status=bogus`, also falls back to Active
 *   instead of showing an error.
 */
const listSearchSchema = z.object({
  status: z.enum(STATUS_FILTERS).default(DEFAULT_STATUS_FILTER).catch(DEFAULT_STATUS_FILTER),
});

export const Route = createFileRoute('/')({
  validateSearch: listSearchSchema,
  // Leave the default out of the URL: Active is just "/", not "/?status=active".
  search: { middlewares: [stripSearchParams({ status: DEFAULT_STATUS_FILTER })] },
  head: () => ({ meta: [{ title: 'Todos · ToDoPrioritizer' }] }),
  component: ListView,
});
