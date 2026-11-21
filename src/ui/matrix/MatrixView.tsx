import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { getRouteApi } from '@tanstack/react-router';
import { useId, useMemo, useRef, useState } from 'react';
import { groupByQuadrant } from '../../domain/selectors';
import { QUADRANTS, type Quadrant, type Todo } from '../../domain/todo';
import { cx } from '../../lib/cx';
import { useTodos } from '../../state/useTodos';
import formStyles from '../components/forms.module.css';
import { useTodoInteractions } from '../components/useTodoInteractions';
import {
  CardPointerSensor,
  CardTouchSensor,
  collisionDetection,
  createAnnouncements,
  jumpBetweenTargets,
  quadrantForTarget,
  screenReaderInstructions,
} from './dnd';
import styles from './MatrixView.module.css';
import { QuadrantCell } from './QuadrantCell';
import { TodoCard, TodoCardPreview } from './TodoCard';
import { useOptimisticMoves } from './useOptimisticMoves';

// Typed access to the "/matrix" route's search params (see routes/matrix.tsx).
const route = getRouteApi('/matrix');

/** The Eisenhower Matrix view (REQUIREMENTS §5.4). */
export function MatrixView() {
  const { completed: showCompleted } = route.useSearch();
  const navigate = route.useNavigate();
  const { status, todos: storedTodos } = useTodos();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const toggleId = useId();
  const { openCreate, openEdit, requestDelete, toggle, moveTo, ui } = useTodoInteractions({
    focusAfterDelete: headingRef,
  });

  const optimistic = useOptimisticMoves(storedTodos);
  const todos = optimistic.todos;
  const groups = useMemo(
    () => groupByQuadrant(todos, { includeCompleted: showCompleted }),
    [todos, showCompleted],
  );

  const [dragging, setDragging] = useState<Todo | null>(null);
  const sensors = useSensors(
    // A small movement threshold, so a click on a card is still a click.
    useSensor(CardPointerSensor, { activationConstraint: { distance: 6 } }),
    // A long press, so swiping still scrolls the page on touch screens.
    useSensor(CardTouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: jumpBetweenTargets }),
  );

  const findTodo = (id: string | number) => todos.find((t) => t.id === id);
  const announcements = useMemo(
    () => createAnnouncements((id) => todos.find((t) => t.id === id)),
    [todos],
  );

  async function move(todo: Todo, quadrant: Quadrant | null, announce: boolean) {
    if (todo.quadrant === quadrant) return;
    optimistic.move(todo, quadrant);
    const saved = await moveTo(todo, quadrant, { announce });
    if (!saved) optimistic.revert(todo);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDragging(findTodo(active.id) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const todo = findTodo(active.id);
    const quadrant = quadrantForTarget(over?.id);
    // dnd-kit announces the drop itself, so don't announce it twice.
    if (todo && quadrant !== undefined) void move(todo, quadrant, false);
  }

  const renderTodo = (todo: Todo) => (
    <TodoCard
      key={todo.id}
      todo={todo}
      onToggle={toggle}
      onMove={(t, q) => void move(t, q, true)}
      onEdit={openEdit}
      onDelete={requestDelete}
    />
  );
  const cell = (quadrant: Quadrant | null) => (
    <QuadrantCell
      quadrant={quadrant}
      todos={groups[quadrant ?? 'unsorted']}
      onAdd={openCreate}
      renderTodo={renderTodo}
    />
  );

  return (
    <section aria-labelledby="matrix-heading">
      <div className={styles.header}>
        <h1 id="matrix-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
          Eisenhower Matrix
        </h1>
        <div className={styles.headerActions}>
          <label htmlFor={toggleId} className={styles.toggle}>
            <input
              id={toggleId}
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => {
                void navigate({ search: { completed: e.target.checked } });
              }}
            />
            Show completed
          </label>
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
      </div>

      {status === 'loading' ? (
        <p aria-busy="true" className={styles.loading}>
          Loading your todos…
        </p>
      ) : status === 'error' && storedTodos.length === 0 ? (
        <p className={styles.loading}>
          Your todos can’t be shown until browser storage is available again.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          accessibility={{ announcements, screenReaderInstructions }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setDragging(null);
          }}
        >
          <div className={styles.layout}>
            <div className={styles.tray}>{cell(null)}</div>

            <div className={styles.matrix}>
              {/* Axis labels. Each quadrant also states them in its own text, so these are hidden from screen readers. */}
              <div className={styles.corner} aria-hidden="true" />
              <div className={cx(styles.axis, styles.axisTop)} aria-hidden="true">
                Urgent
              </div>
              <div className={cx(styles.axis, styles.axisTop)} aria-hidden="true">
                Not urgent
              </div>
              <div className={cx(styles.axis, styles.axisSide)} aria-hidden="true">
                Important
              </div>
              {cell(QUADRANTS[0])}
              {cell(QUADRANTS[1])}
              <div className={cx(styles.axis, styles.axisSide)} aria-hidden="true">
                Not important
              </div>
              {cell(QUADRANTS[2])}
              {cell(QUADRANTS[3])}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {dragging ? <TodoCardPreview todo={dragging} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {ui}
    </section>
  );
}
