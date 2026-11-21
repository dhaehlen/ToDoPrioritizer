import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod';
import { MatrixView } from '../ui/matrix/MatrixView';

/**
 * The Matrix view's URL search params (FR-15). `?completed=true` also shows
 * completed todos. Hiding them is the default, so that value is left out of
 * the URL.
 */
const matrixSearchSchema = z.object({
  completed: z.boolean().default(false).catch(false),
});

export const Route = createFileRoute('/matrix')({
  validateSearch: matrixSearchSchema,
  search: { middlewares: [stripSearchParams({ completed: false })] },
  component: MatrixView,
});
