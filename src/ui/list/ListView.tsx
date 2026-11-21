import { getRouteApi } from '@tanstack/react-router';
import { useMemo, useRef } from 'react';
import { filterByStatus, selectListTodos, type StatusFilter } from '../../domain/selectors';
import { cx } from '../../lib/cx';
import { useTodos } from '../../state/useTodos';
import formStyles from '../components/forms.module.css';
import { TodoItem } from '../components/TodoItem';
import { useTodoInteractions } from '../components/useTodoInteractions';
import { FilterTabs } from './FilterTabs';
import styles from './ListView.module.css';

// Typed access to the "/" route's search params, without importing the route
// file (which imports this component).
const route = getRouteApi('/');

/** The List view (REQUIREMENTS §5.3). */
export function ListView() {
  const { status: filter } = route.useSearch();
  const { status, todos } = useTodos();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { openCreate, openEdit, requestDelete, toggle, ui } = useTodoInteractions({
    focusAfterDelete: headingRef,
  });

  const visible = useMemo(() => selectListTodos(todos, filter), [todos, filter]);
  const counts = useMemo(
    () => ({
      all: todos.length,
      active: filterByStatus(todos, 'active').length,
      completed: filterByStatus(todos, 'completed').length,
    }),
    [todos],
  );

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
            openCreate();
          }}
        >
          Add todo
        </button>
      </div>

      <FilterTabs counts={counts} />

      {status === 'loading' ? (
        <p aria-busy="true" className={styles.empty}>
          Loading your todos…
        </p>
      ) : status === 'error' && todos.length === 0 ? (
        <p className={styles.empty}>
          Your todos can’t be shown until browser storage is available again.
        </p>
      ) : visible.length === 0 ? (
        <p className={styles.empty}>{emptyMessage(filter, counts.all)}</p>
      ) : (
        <ul className={styles.list} aria-label={`${filterLabel(filter)} todos`}>
          {visible.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggle}
              onEdit={openEdit}
              onDelete={requestDelete}
            />
          ))}
        </ul>
      )}

      {ui}
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
