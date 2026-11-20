import { createFileRoute } from '@tanstack/react-router';
import { ListView } from '../ui/list/ListView';

export const Route = createFileRoute('/')({
  component: ListView,
});
