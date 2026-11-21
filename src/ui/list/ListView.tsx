import { getRouteApi } from '@tanstack/react-router';
import { useMemo, useRef, useState } from 'react';
import { filterByStatus, selectListTodos, type StatusFilter } from '../../domain/selectors';
import type { Todo } from '../../domain/todo';
import { cx } from '../../lib/cx';
import { useTodoActions } from '../../state/useTodoActions';
import { useTodos } from '../../state/useTodos';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog } from '../components/Dialog';
import { TodoForm } from '../components/TodoForm';
import { TodoItem } from '../components/TodoItem';
import formStyles from '../components/forms.module.css';
import { FilterTabs } from './FilterTabs';
import styles from './ListView.module.css';

// Typed access to the "/" route's search params, without importing the route
// file (which imports this component).
const route = getRouteApi('/');

type EditorState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; todo: Todo };

/** The List view (REQUIREMENTS §5.3). */
export function ListView() {
  const { status: filter } = route.useSearch();
  const { status, todos } = useTodos();
  const { complete, reopen, remove, pending } = useTodoActions();

  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [toDelete, setToDelete] = useState<Todo | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  const visible = useMemo(() => selectListTodos(todos, filter), [todos, filter]);
  const counts = useMemo(
    () => ({
      all: todos.length,
      active: filterByStatus(todos, 'active').length,
      completed: filterByStatus(todos, 'completed').length,
    }),
    [todos],
  );

  async function handleToggle(todo: Todo): Promise<boolean> {
    const result = todo.isCompleted ? await reopen(todo.id) : await complete(todo.id);
    if (result.ok) {
      setAnnouncement(
        `“${todo.title}” marked as ${result.value.isCompleted ? 'done' : 'not done'}.`,
      );
    }
    return result.ok;
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    const result = await remove(toDelete.id);
    if (result.ok) {
      setAnnouncement(`“${toDelete.title}” deleted.`);
      setToDelete(null);
      // The row and its Delete button are gone, so move focus somewhere sensible.
      headingRef.current?.focus();
    }
  }

  return (
    <section aria-labelledby="list-heading">
      <div className={styles.header}>
        <h1 id="list-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
          Todos
        </h1>
        <button
          type="button"
          className={cx(formStyles.button, formStyles.primary)}
          onClick={() => {
            setEditor({ mode: 'create' });
          }}
        >
          Add todo
        </button>
      </div>

      <FilterTabs current={filter} counts={counts} />

      {status === 'loading' ? (
        <p aria-busy="true" className={styles.empty}>
          Loading your todos…
        </p>
      ) : visible.length === 0 ? (
        <p className={styles.empty}>{emptyMessage(filter, counts.all)}</p>
      ) : (
        <ul className={styles.list} aria-label={`${filterLabel(filter)} todos`}>
          {visible.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onEdit={(t) => {
                setEditor({ mode: 'edit', todo: t });
              }}
              onDelete={setToDelete}
            />
          ))}
        </ul>
      )}

      <p role="status" className="visually-hidden">
        {announcement}
      </p>

      <Dialog
        open={editor.mode !== 'closed'}
        title={editor.mode === 'edit' ? 'Edit todo' : 'Add todo'}
        onClose={() => {
          setEditor({ mode: 'closed' });
        }}
      >
        <TodoForm
          // A new key per todo resets the form fields when switching todos.
          key={editor.mode === 'edit' ? editor.todo.id : 'new'}
          todo={editor.mode === 'edit' ? editor.todo : undefined}
          onSaved={(saved) => {
            setAnnouncement(
              editor.mode === 'edit' ? `“${saved.title}” saved.` : `“${saved.title}” added.`,
            );
            setEditor({ mode: 'closed' });
          }}
          onCancel={() => {
            setEditor({ mode: 'closed' });
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete todo?"
        message={`“${toDelete?.title ?? ''}” will be deleted permanently. This can’t be undone.`}
        confirmLabel="Delete"
        busy={pending}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          setToDelete(null);
        }}
      />
    </section>
  );
}

function filterLabel(filter: StatusFilter): string {
  return { all: 'All', active: 'Active', completed: 'Completed' }[filter];
}

/** FR-11: a helpful message for each empty filter. */
function emptyMessage(filter: StatusFilter, total: number): string {
  if (total === 0) return 'No todos yet. Select “Add todo” to create your first one.';
  switch (filter) {
    case 'active':
      return 'Nothing left to do. Every todo is done!';
    case 'completed':
      return 'No completed todos yet. Check one off and it will show up here.';
    case 'all':
      return 'No todos yet.';
  }
}
