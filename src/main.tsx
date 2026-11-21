import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTodoDatabase } from './data/db';
import { DexieTodoRepository } from './data/DexieTodoRepository';
import { createAppRouter } from './router';
import { TodoProvider } from './state/TodoProvider';
import './ui/global.css';

// Composition root: the only place that picks the real storage.
const repository = new DexieTodoRepository(createTodoDatabase());
const router = createAppRouter();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <TodoProvider repository={repository}>
      <RouterProvider router={router} />
    </TodoProvider>
  </StrictMode>,
);
