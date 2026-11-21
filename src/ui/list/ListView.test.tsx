import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryTodoRepository } from '../../data/InMemoryTodoRepository';
import { TITLE_MAX_LENGTH, type Todo } from '../../domain/todo';
import { formatDate } from '../../lib/formatDate';
import { createControllableRepository } from '../../test/ControllableRepository';
import { activeTodo, completedTodo, T2 } from '../../test/fixtures';
import { renderWithRouter } from '../../test/renderWithRouter';

const at = (hour: number) => `2026-11-20T${String(hour).padStart(2, '0')}:00:00.000Z`;

/** Renders the List view at `path` with these todos stored and the clock fixed at T2. */
async function renderList(path: string, todos: readonly Todo[] = []) {
  const repository = new InMemoryTodoRepository(todos);
  let n = 0;
  const view = await renderWithRouter(path, {
    repository,
    serviceOptions: { clock: () => T2, newId: () => `new-${String(++n)}` },
  });
  // Wait for the first list from storage.
  await waitFor(() => {
    expect(screen.queryByText(/loading your todos/i)).not.toBeInTheDocument();
  });
  return { ...view, repository, user: userEvent.setup() };
}

const titlesInList = () =>
  within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('p')?.textContent);

const filterLink = (name: RegExp) =>
  within(screen.getByRole('navigation', { name: 'Filter todos' })).getByRole('link', { name });

describe('ListView', () => {
  describe('status filter in the URL (FR-9, FR-10)', () => {
    const todos = [
      activeTodo({ title: 'Older active', createdAt: at(8) }),
      activeTodo({ title: 'Newer active', createdAt: at(9) }),
      completedTodo({ title: 'Done first', createdAt: at(10), completedAt: at(11) }),
      completedTodo({ title: 'Done last', createdAt: at(7), completedAt: at(12) }),
    ];

    it('shows only active todos at "/", newest first', async () => {
      await renderList('/', todos);
      expect(titlesInList()).toEqual(['Newer active', 'Older active']);
      expect(filterLink(/^Active/)).toHaveAttribute('aria-current', 'page');
    });

    it('shows completed todos at "?status=completed", most recently completed first', async () => {
      await renderList('/?status=completed', todos);
      expect(titlesInList()).toEqual(['Done last', 'Done first']);
      expect(filterLink(/^Completed/)).toHaveAttribute('aria-current', 'page');
    });

    it('shows every todo at "?status=all", newest created first', async () => {
      await renderList('/?status=all', todos);
      expect(titlesInList()).toEqual(['Done first', 'Newer active', 'Older active', 'Done last']);
    });

    it.each(['/', '/?status=completed', '/?status=all'])(
      'marks exactly one filter as current at %s',
      async (path) => {
        await renderList(path, todos);
        const current = within(screen.getByRole('navigation', { name: 'Filter todos' }))
          .getAllByRole('link')
          .filter((link) => link.getAttribute('aria-current') === 'page');
        expect(current).toHaveLength(1);
      },
    );

    it('treats an invalid status as Active and cleans up the URL', async () => {
      const { router } = await renderList('/?status=bogus', todos);
      expect(titlesInList()).toEqual(['Newer active', 'Older active']);
      // The invalid value falls back to Active, which is the default, so the URL is cleaned up.
      expect(router.state.location.href).toBe('/');
    });

    it('updates the URL when a filter is chosen, leaving the default out', async () => {
      const { router, user } = await renderList('/', todos);

      await user.click(filterLink(/^Completed/));
      await waitFor(() => {
        expect(router.state.location.href).toBe('/?status=completed');
      });
      expect(titlesInList()).toEqual(['Done last', 'Done first']);

      await user.click(filterLink(/^Active/));
      await waitFor(() => {
        expect(router.state.location.href).toBe('/');
      });
    });

    it('shows how many todos each filter has', async () => {
      await renderList('/', todos);
      expect(filterLink(/^Active/)).toHaveTextContent('Active 2');
      expect(filterLink(/^Completed/)).toHaveTextContent('Completed 2');
      expect(filterLink(/^All/)).toHaveTextContent('All 4');
    });
  });

  describe('loading and empty states (FR-11)', () => {
    it('shows a loading message until storage answers', async () => {
      const ctl = createControllableRepository();
      await renderWithRouter('/', { repository: ctl.repo });
      expect(screen.getByText(/loading your todos/i)).toBeInTheDocument();
      act(() => {
        ctl.emit([]);
      });
      expect(screen.queryByText(/loading your todos/i)).not.toBeInTheDocument();
    });

    it('says todos can’t be shown (not "no todos yet") when storage fails before loading', async () => {
      const ctl = createControllableRepository();
      await renderWithRouter('/', { repository: ctl.repo });
      act(() => {
        ctl.fail(new Error('IndexedDB unavailable'));
      });
      expect(screen.getByText(/can’t be shown until browser storage/i)).toBeInTheDocument();
      expect(screen.queryByText(/no todos yet/i)).not.toBeInTheDocument();
    });

    it('keeps showing the last loaded todos if storage fails later', async () => {
      const ctl = createControllableRepository();
      await renderWithRouter('/', { repository: ctl.repo });
      act(() => {
        ctl.emit([activeTodo({ title: 'Still here' })]);
      });
      act(() => {
        ctl.fail(new Error('IndexedDB unavailable'));
      });
      expect(screen.getByRole('checkbox', { name: 'Still here' })).toBeInTheDocument();
    });

    it('invites the user to add a first todo when there are none', async () => {
      await renderList('/');
      expect(screen.getByText(/no todos yet/i)).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('says everything is done when only completed todos exist', async () => {
      await renderList('/', [completedTodo()]);
      expect(screen.getByText(/nothing left to do/i)).toBeInTheDocument();
    });

    it('explains the Completed filter when nothing is completed', async () => {
      await renderList('/?status=completed', [activeTodo()]);
      expect(screen.getByText(/no completed todos yet/i)).toBeInTheDocument();
    });
  });

  describe('each row (FR-7, FR-8)', () => {
    it('shows the title, description, quadrant, and created date', async () => {
      await renderList('/', [
        activeTodo({ title: 'Pay rent', description: 'By the 1st', quadrant: 'Q1' }),
      ]);
      const row = screen.getByRole('listitem');
      expect(row).toHaveTextContent('Pay rent');
      expect(row).toHaveTextContent('By the 1st');
      expect(row).toHaveTextContent('Do Now');
      expect(row).toHaveTextContent(`Created ${formatDate(at(9))}`);
      expect(within(row).getByRole('checkbox', { name: 'Pay rent' })).not.toBeChecked();
    });

    it('labels todos without a quadrant as Unsorted', async () => {
      await renderList('/', [activeTodo({ quadrant: null })]);
      expect(screen.getByRole('listitem')).toHaveTextContent('Unsorted');
    });

    it('shows the completion date of a completed todo', async () => {
      await renderList('/?status=completed', [completedTodo({ completedAt: at(12) })]);
      const row = screen.getByRole('listitem');
      expect(row).toHaveTextContent(`Completed ${formatDate(at(12))}`);
      expect(within(row).getByRole('checkbox')).toBeChecked();
    });
  });

  describe('adding a todo (FR-1, FR-4)', () => {
    it('adds a todo from the dialog and closes it', async () => {
      const { user, repository } = await renderList('/');

      await user.click(screen.getByRole('button', { name: 'Add todo' }));
      const dialog = screen.getByRole('dialog', { name: 'Add todo' });
      const title = within(dialog).getByLabelText('Title');
      expect(title).toHaveFocus();

      await user.type(title, 'Book dentist');
      await user.type(within(dialog).getByLabelText(/description/i), 'Before March');
      await user.selectOptions(within(dialog).getByLabelText('Quadrant'), 'Q2');
      await user.click(within(dialog).getByRole('button', { name: 'Add todo' }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(await screen.findByRole('checkbox', { name: 'Book dentist' })).toBeInTheDocument();
      expect(await repository.get('new-1')).toMatchObject({
        title: 'Book dentist',
        description: 'Before March',
        quadrant: 'Q2',
        createdAt: T2.toISOString(),
      });
      expect(screen.getByRole('status')).toHaveTextContent('“Book dentist” added.');
    });

    it('submits with Enter from the title field', async () => {
      const { user } = await renderList('/');
      await user.click(screen.getByRole('button', { name: 'Add todo' }));
      await user.type(screen.getByLabelText('Title'), 'Quick one{Enter}');
      expect(await screen.findByRole('checkbox', { name: 'Quick one' })).toBeInTheDocument();
    });

    it('shows an error next to a blank title and saves nothing (AC-4)', async () => {
      const { user, repository } = await renderList('/');
      await user.click(screen.getByRole('button', { name: 'Add todo' }));
      const title = screen.getByLabelText('Title');
      await user.type(title, '   ');
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Add todo' }),
      );

      expect(await screen.findByText('Enter a title.')).toBeInTheDocument();
      expect(title).toHaveAttribute('aria-invalid', 'true');
      expect(title).toHaveAccessibleDescription('Enter a title.');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(await repository.getAll()).toEqual([]);
    });

    it('rejects a title that is too long', async () => {
      const { user } = await renderList('/');
      await user.click(screen.getByRole('button', { name: 'Add todo' }));
      await user.click(screen.getByLabelText('Title'));
      await user.paste('a'.repeat(TITLE_MAX_LENGTH + 1));
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Add todo' }),
      );
      expect(
        await screen.findByText(`Use at most ${String(TITLE_MAX_LENGTH)} characters.`),
      ).toBeInTheDocument();
    });

    it('adds nothing when cancelled', async () => {
      const { user, repository } = await renderList('/');
      await user.click(screen.getByRole('button', { name: 'Add todo' }));
      await user.type(screen.getByLabelText('Title'), 'Never mind');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(await repository.getAll()).toEqual([]);
    });

    it('keeps the dialog open with the typed text when saving fails', async () => {
      const { user, repository } = await renderList('/');
      vi.spyOn(repository, 'put').mockRejectedValue(new Error('quota exceeded'));
      await user.click(screen.getByRole('button', { name: 'Add todo' }));
      await user.type(screen.getByLabelText('Title'), 'Important thought{Enter}');

      const dialog = screen.getByRole('dialog');
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/couldn’t be saved/i);
      expect(within(dialog).getByLabelText('Title')).toHaveValue('Important thought');
    });
  });

  describe('editing a todo (FR-2)', () => {
    it('pre-fills the form and saves changes without touching createdAt (AC-2)', async () => {
      const todo = completedTodo({ title: 'Old title', quadrant: 'Q3', completedAt: at(10) });
      const { user, repository } = await renderList('/?status=completed', [todo]);

      await user.click(screen.getByRole('button', { name: 'Edit “Old title”' }));
      const dialog = screen.getByRole('dialog', { name: 'Edit todo' });
      expect(within(dialog).getByLabelText('Title')).toHaveValue('Old title');
      expect(within(dialog).getByLabelText('Quadrant')).toHaveValue('Q3');

      const title = within(dialog).getByLabelText('Title');
      await user.clear(title);
      await user.type(title, 'New title');
      await user.click(within(dialog).getByRole('button', { name: 'Save' }));

      expect(await screen.findByRole('checkbox', { name: 'New title' })).toBeInTheDocument();
      expect(await repository.get(todo.id)).toMatchObject({
        title: 'New title',
        createdAt: todo.createdAt,
        completedAt: at(10),
        isCompleted: true,
      });
    });

    it('tells the user when the todo was deleted elsewhere', async () => {
      const todo = activeTodo({ title: 'Vanishing' });
      const { user, repository } = await renderList('/', [todo]);
      await user.click(screen.getByRole('button', { name: 'Edit “Vanishing”' }));
      await repository.delete(todo.id); // e.g. deleted in another tab
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
        /no longer exists/i,
      );
    });
  });

  describe('completing and reopening (FR-5, FR-6)', () => {
    it('marks a todo done: it leaves Active and shows under Completed with today’s date (AC-1)', async () => {
      const todo = activeTodo({ title: 'Water plants' });
      const { user, repository, router } = await renderList('/', [todo]);

      await user.click(screen.getByRole('checkbox', { name: 'Water plants' }));
      await waitFor(() => {
        expect(screen.queryByRole('checkbox', { name: 'Water plants' })).not.toBeInTheDocument();
      });
      expect(screen.getByRole('status')).toHaveTextContent('“Water plants” marked as done.');
      expect(await repository.get(todo.id)).toMatchObject({
        isCompleted: true,
        completedAt: T2.toISOString(),
      });

      await act(() => router.navigate({ to: '/', search: { status: 'completed' } }));
      const row = await screen.findByRole('listitem');
      expect(row).toHaveTextContent(`Completed ${formatDate(T2.toISOString())}`);
    });

    it('undoes the checkbox and shows the error banner when saving fails', async () => {
      const todo = activeTodo({ title: 'Flaky disk' });
      const { user, repository } = await renderList('/', [todo]);
      vi.spyOn(repository, 'put').mockRejectedValue(new Error('quota exceeded'));

      const checkbox = screen.getByRole('checkbox', { name: 'Flaky disk' });
      await user.click(checkbox);

      expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't be saved/i);
      expect(checkbox).not.toBeChecked();
      expect(await repository.get(todo.id)).toEqual(todo);
    });

    it('marks a completed todo as not done again', async () => {
      const todo = completedTodo({ title: 'Oops' });
      const { user, repository } = await renderList('/?status=all', [todo]);
      await user.click(screen.getByRole('checkbox', { name: 'Oops' }));
      await waitFor(async () => {
        expect(await repository.get(todo.id)).toMatchObject({
          isCompleted: false,
          completedAt: null,
        });
      });
      expect(screen.getByRole('checkbox', { name: 'Oops' })).not.toBeChecked();
    });
  });

  describe('deleting (FR-3)', () => {
    it('asks first, with Cancel focused, and keeps the todo when cancelled', async () => {
      const todo = activeTodo({ title: 'Keep me' });
      const { user, repository } = await renderList('/', [todo]);

      await user.click(screen.getByRole('button', { name: 'Delete “Keep me”' }));
      const dialog = screen.getByRole('dialog', { name: 'Delete todo?' });
      expect(dialog).toHaveTextContent('“Keep me” will be deleted permanently.');
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();

      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(await repository.get(todo.id)).toEqual(todo);
    });

    it('deletes after confirming and moves focus to the heading (AC-5)', async () => {
      const todo = activeTodo({ title: 'Remove me' });
      const { user, repository } = await renderList('/', [todo]);

      await user.click(screen.getByRole('button', { name: 'Delete “Remove me”' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByText('Remove me')).not.toBeInTheDocument();
      });
      expect(await repository.get(todo.id)).toBeUndefined();
      expect(screen.getByRole('heading', { level: 1, name: 'Todos' })).toHaveFocus();
      expect(screen.getByRole('status')).toHaveTextContent('“Remove me” deleted.');
    });
  });
});
