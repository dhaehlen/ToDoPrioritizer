import { useId, useState, type SubmitEvent } from 'react';
import { QUADRANT_LIST } from '../../domain/quadrants';
import { isQuadrant, type Quadrant, type Todo } from '../../domain/todo';
import type { TodoField } from '../../domain/todo.rules';
import { cx } from '../../lib/cx';
import { useTodoActions } from '../../state/useTodoActions';
import styles from './forms.module.css';
import { validationMessage } from './validationMessage';

export interface TodoFormProps {
  /** The todo to edit. Leave out to create a new one. */
  todo?: Todo;
  /** The quadrant preselected when creating a todo (e.g. "Add to Schedule"). */
  initialQuadrant?: Quadrant | null;
  /** Called after a successful save. */
  onSaved: (todo: Todo) => void;
  onCancel: () => void;
}

const UNSORTED = '';

/**
 * The add/edit form (FR-1, FR-2, FR-4). Validation runs in the domain layer.
 * This form only shows the result, next to the field it applies to.
 */
export function TodoForm({ todo, initialQuadrant = null, onSaved, onCancel }: TodoFormProps) {
  const { create, update, pending } = useTodoActions();
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [quadrant, setQuadrant] = useState<Quadrant | null>(todo ? todo.quadrant : initialQuadrant);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<TodoField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const ids = { title: useId(), description: useId(), quadrant: useId() };
  const errorId = (field: TodoField) => `${ids[field]}-error`;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { title, description, quadrant };
    const result = todo ? await update(todo.id, input) : await create(input);
    if (result.ok) {
      onSaved(result.value);
      return;
    }
    const { error } = result;
    if (error.kind === 'validation') {
      const next: Partial<Record<TodoField, string>> = {};
      for (const e of error.errors) next[e.field] ??= validationMessage(e);
      setFieldErrors(next);
      setFormError(null);
    } else if (error.kind === 'notFound') {
      setFormError('This todo no longer exists. It may have been deleted in another tab.');
    } else {
      // Storage failures are shown by the app-wide ErrorBanner. Keep the form
      // open so the user's typing isn't lost.
      setFormError('Your changes couldn’t be saved. Please try again.');
    }
  }

  return (
    <form noValidate onSubmit={(e) => void handleSubmit(e)}>
      {formError && (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor={ids.title} className={styles.label}>
          Title
        </label>
        <input
          id={ids.title}
          className={styles.input}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={fieldErrors.title ? errorId('title') : undefined}
          autoComplete="off"
          data-autofocus
        />
        {fieldErrors.title && (
          <p id={errorId('title')} className={styles.error}>
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.description} className={styles.label}>
          Description <span className={styles.optional}>(optional)</span>
        </label>
        <textarea
          id={ids.description}
          className={styles.input}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={fieldErrors.description ? errorId('description') : undefined}
        />
        {fieldErrors.description && (
          <p id={errorId('description')} className={styles.error}>
            {fieldErrors.description}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.quadrant} className={styles.label}>
          Quadrant
        </label>
        <select
          id={ids.quadrant}
          className={styles.input}
          value={quadrant ?? UNSORTED}
          onChange={(e) => {
            setQuadrant(isQuadrant(e.target.value) ? e.target.value : null);
          }}
        >
          <option value={UNSORTED}>Unsorted</option>
          {QUADRANT_LIST.map((q) => (
            <option key={q.id} value={q.id}>
              {q.label} — {q.urgent ? 'Urgent' : 'Not urgent'},{' '}
              {q.important ? 'Important' : 'Not important'}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className={cx(styles.button, styles.primary)} disabled={pending}>
          {todo ? 'Save' : 'Add todo'}
        </button>
      </div>
    </form>
  );
}
