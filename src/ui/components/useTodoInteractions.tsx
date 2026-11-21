import { useState, type RefObject } from 'react';
import { quadrantLabel } from '../../domain/quadrants';
import type { Quadrant, Todo } from '../../domain/todo';
import { useTodoActions } from '../../state/useTodoActions';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from './Dialog';
import { TodoForm } from './TodoForm';

type EditorState =
  { mode: 'closed' } | { mode: 'create'; quadrant: Quadrant | null } | { mode: 'edit'; todo: Todo };

export interface TodoInteractionsOptions {
  /** Where focus goes after a delete, since the deleted row and its button are gone. */
  focusAfterDelete?: RefObject<HTMLElement | null>;
}

/**
 * The add/edit dialog, the delete confirmation, and screen-reader
 * announcements, shared by the List and Matrix views (FR-16). Render `ui`
 * once in the view.
 */
export function useTodoInteractions({ focusAfterDelete }: TodoInteractionsOptions = {}) {
  const { complete, reopen, remove, assignQuadrant, pending } = useTodoActions();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [toDelete, setToDelete] = useState<Todo | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const closeEditor = () => {
    setEditor({ mode: 'closed' });
  };

  /** FR-5/FR-6. Resolves to whether the change was saved. */
  async function toggle(todo: Todo): Promise<boolean> {
    const result = todo.isCompleted ? await reopen(todo.id) : await complete(todo.id);
    if (result.ok) {
      setAnnouncement(
        `“${todo.title}” marked as ${result.value.isCompleted ? 'done' : 'not done'}.`,
      );
    }
    return result.ok;
  }

  /**
   * FR-14. Resolves to whether the change was saved. Pass `announce: false`
   * when something else already announces the move (e.g. drag-and-drop).
   */
  async function moveTo(
    todo: Todo,
    quadrant: Quadrant | null,
    { announce = true } = {},
  ): Promise<boolean> {
    const result = await assignQuadrant(todo.id, quadrant);
    if (result.ok && announce) {
      setAnnouncement(`“${todo.title}” moved to ${quadrantLabel(quadrant)}.`);
    }
    return result.ok;
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await remove(toDelete.id);
    if (result.ok) {
      setAnnouncement(`“${toDelete.title}” deleted.`);
      setToDelete(null);
      focusAfterDelete?.current?.focus();
    }
  }

  const ui = (
    <>
      <p role="status" className="visually-hidden">
        {announcement}
      </p>

      <Dialog
        open={editor.mode !== 'closed'}
        title={editor.mode === 'edit' ? 'Edit todo' : 'Add todo'}
        onClose={closeEditor}
      >
        <TodoForm
          // A new key per todo resets the form fields when switching todos.
          key={editor.mode === 'edit' ? editor.todo.id : `new-${editor.mode}`}
          todo={editor.mode === 'edit' ? editor.todo : undefined}
          initialQuadrant={editor.mode === 'create' ? editor.quadrant : undefined}
          onSaved={(saved) => {
            setAnnouncement(
              editor.mode === 'edit' ? `“${saved.title}” saved.` : `“${saved.title}” added.`,
            );
            closeEditor();
          }}
          onCancel={closeEditor}
        />
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete todo?"
        message={`“${toDelete?.title ?? ''}” will be deleted permanently. This can’t be undone.`}
        confirmLabel="Delete"
        busy={pending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          setToDelete(null);
        }}
      />
    </>
  );

  return {
    /** Opens the add dialog, optionally with a quadrant already chosen. */
    openCreate: (quadrant: Quadrant | null = null) => {
      setEditor({ mode: 'create', quadrant });
    },
    openEdit: (todo: Todo) => {
      setEditor({ mode: 'edit', todo });
    },
    requestDelete: setToDelete,
    toggle,
    moveTo,
    ui,
  };
}
