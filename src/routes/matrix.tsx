import { createFileRoute } from '@tanstack/react-router';
import { MatrixView } from '../ui/matrix/MatrixView';

export const Route = createFileRoute('/matrix')({
  component: MatrixView,
});
