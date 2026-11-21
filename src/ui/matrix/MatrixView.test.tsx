import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryTodoRepository } from '../../data/InMemoryTodoRepository';
import type { Todo } from '../../domain/todo';
import { createControllableRepository } from '../../test/ControllableRepository';
import { activeTodo, completedTodo, T2 } from '../../test/fixtures';
import { renderWithRouter } from '../../test/renderWithRouter';
import { CARD_LIMIT } from './limits';

async function renderMatrix(path: string, todos: readonly Todo[] = []) {
  const repository = new InMemoryTodoRepository(todos);
  let n = 0;
  const view = await renderWithRouter(path, {
    repository,
    serviceOptions: { clock: () => T2, newId: () => `new-${String(++n)}` },
  });
  await waitFor(() => {
    expect(screen.queryByText(/loading your todos/i)).not.toBeInTheDocument();
  });
  return { ...view, repository, user: userEvent.setup() };
}

/** The drop target section with this heading, e.g. "Do Now" or "Unsorted". */
const cell = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) });

/** Moves a todo with its card's "Move" button and the choice named `target`. */
async function moveWithMenu(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  target: string,
) {
  await user.click(screen.getByRole('button', { name: `Move “${title}”` }));
  const choices = screen.getByRole('group', { name: `Move “${title}” to` });
  await user.click(within(choices).getByRole('button', { name: target }));
}

const titlesIn = (name: string) =>
  within(cell(name))
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('p')?.textContent);

describe('MatrixView', () => {
  describe('layout (FR-12, FR-13, FR-17)', () => {
    it('shows the four quadrants and the Unsorted tray, each with a count', async () => {
      await renderMatrix('/matrix', [
        activeTodo({ title: 'Fire', quadrant: 'Q1' }),
        activeTodo({ title: 'Plan', quadrant: 'Q2' }),
        activeTodo({ title: 'Plan more', quadrant: 'Q2' }),
        activeTodo({ title: 'Inbox', quadrant: null }),
      ]);

      for (const [name, count] of [
        ['Do Now', 1],
        ['Schedule', 2],
        ['Delegate', 0],
        ['Delete', 0],
        ['Unsorted', 1],
      ] as const) {
        expect(within(cell(name)).getByRole('heading', { level: 2 })).toHaveTextContent(
          `${name} ${String(count)}`,
        );
      }
      expect(titlesIn('Schedule')).toEqual(expect.arrayContaining(['Plan', 'Plan more']));
      expect(titlesIn('Unsorted')).toEqual(['Inbox']);
    });

    it(`shows the first ${String(CARD_LIMIT)} cards per quadrant, with "Show N more" (NFR-4)`, async () => {
      const many = Array.from({ length: CARD_LIMIT + 7 }, (_, i) =>
        activeTodo({ title: `Busy ${String(i)}`, quadrant: 'Q1' }),
      );
      const { user } = await renderMatrix('/matrix', many);

      expect(within(cell('Do Now')).getByRole('heading', { level: 2 })).toHaveTextContent(
        `Do Now ${String(CARD_LIMIT + 7)}`,
      );
      expect(titlesIn('Do Now')).toHaveLength(CARD_LIMIT);

      const more = within(cell('Do Now')).getByRole('button', { name: 'Show 7 more in Do Now' });
      expect(more).toHaveAttribute('aria-expanded', 'false');
      await user.click(more);
      expect(titlesIn('Do Now')).toHaveLength(CARD_LIMIT + 7);

      await user.click(
        within(cell('Do Now')).getByRole('button', { name: 'Show fewer in Do Now' }),
      );
      expect(titlesIn('Do Now')).toHaveLength(CARD_LIMIT);
    });

    it('has no "Show more" button when everything fits', async () => {
      await renderMatrix('/matrix', [activeTodo({ quadrant: 'Q1' })]);
      expect(
        within(cell('Do Now')).queryByRole('button', { name: /show/i }),
      ).not.toBeInTheDocument();
    });

    it('says in each quadrant whether it is urgent and important', async () => {
      await renderMatrix('/matrix');
      expect(cell('Do Now')).toHaveTextContent('Urgent · Important');
      expect(cell('Schedule')).toHaveTextContent('Not urgent · Important');
      expect(cell('Delegate')).toHaveTextContent('Urgent · Not important');
      expect(cell('Delete')).toHaveTextContent('Not urgent · Not important');
    });

    it('shows a hint in empty quadrants', async () => {
      await renderMatrix('/matrix');
      expect(cell('Do Now')).toHaveTextContent('Drop todos here.');
      expect(cell('Unsorted')).toHaveTextContent('Nothing to sort.');
    });

    it('says todos can’t be shown when storage fails before loading', async () => {
      const ctl = createControllableRepository();
      await renderWithRouter('/matrix', { repository: ctl.repo });
      act(() => {
        ctl.fail(new Error('IndexedDB unavailable'));
      });
      expect(screen.getByText(/can’t be shown until browser storage/i)).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: /^Do Now/ })).not.toBeInTheDocument();
    });

    it('shows a loading message until storage answers', async () => {
      const ctl = createControllableRepository();
      await renderWithRouter('/matrix', { repository: ctl.repo });
      expect(screen.getByText(/loading your todos/i)).toBeInTheDocument();
      act(() => {
        ctl.emit([]);
      });
      expect(cell('Do Now')).toBeInTheDocument();
    });
  });

  describe('show completed (FR-15)', () => {
    const todos = [
      activeTodo({ title: 'Open', quadrant: 'Q1' }),
      completedTodo({ title: 'Finished', quadrant: 'Q1' }),
    ];

    it('hides completed todos by default', async () => {
      await renderMatrix('/matrix', todos);
      expect(titlesIn('Do Now')).toEqual(['Open']);
      expect(screen.getByLabelText('Show completed')).not.toBeChecked();
    });

    it('shows them, after active ones, with ?completed=true', async () => {
      await renderMatrix('/matrix?completed=true', todos);
      expect(titlesIn('Do Now')).toEqual(['Open', 'Finished']);
      expect(screen.getByLabelText('Show completed')).toBeChecked();
    });

    it('the toggle updates the URL, leaving the default out', async () => {
      const { user, router } = await renderMatrix('/matrix', todos);
      await user.click(screen.getByLabelText('Show completed'));
      await waitFor(() => {
        expect(router.state.location.href).toBe('/matrix?completed=true');
      });
      expect(titlesIn('Do Now')).toEqual(['Open', 'Finished']);

      await user.click(screen.getByLabelText('Show completed'));
      await waitFor(() => {
        expect(router.state.location.href).toBe('/matrix');
      });
    });

    it('treats an invalid value as hidden', async () => {
      await renderMatrix('/matrix?completed=maybe', todos);
      expect(titlesIn('Do Now')).toEqual(['Open']);
    });
  });

  describe('moving without dragging (FR-14, NFR-2)', () => {
    it('moves a todo with the "Move to" menu and saves it (AC-3)', async () => {
      const todo = activeTodo({ title: 'Taxes', quadrant: null });
      const { user, repository } = await renderMatrix('/matrix', [todo]);

      await moveWithMenu(user, 'Taxes', 'Schedule');

      expect(titlesIn('Schedule')).toEqual(['Taxes']);
      expect(titlesIn('Unsorted')).toEqual([]);
      await waitFor(async () => {
        expect((await repository.get(todo.id))?.quadrant).toBe('Q2');
      });
      // (dnd-kit adds its own role="status" region, so find ours by its text.)
      expect(screen.getByText('“Taxes” moved to Schedule.')).toHaveAttribute('role', 'status');
    });

    it('moves a todo back to Unsorted', async () => {
      const todo = activeTodo({ title: 'Undecided', quadrant: 'Q4' });
      const { user, repository } = await renderMatrix('/matrix', [todo]);
      await moveWithMenu(user, 'Undecided', 'Unsorted');
      await waitFor(async () => {
        expect((await repository.get(todo.id))?.quadrant).toBeNull();
      });
      expect(titlesIn('Unsorted')).toEqual(['Undecided']);
    });

    it('puts the todo back where it was if saving fails', async () => {
      const todo = activeTodo({ title: 'Stuck', quadrant: 'Q3' });
      const { user, repository } = await renderMatrix('/matrix', [todo]);
      vi.spyOn(repository, 'put').mockRejectedValue(new Error('quota exceeded'));

      await moveWithMenu(user, 'Stuck', 'Do Now');

      expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't be saved/i);
      expect(titlesIn('Delegate')).toEqual(['Stuck']);
      expect(titlesIn('Do Now')).toEqual([]);
    });

    it('the Move menu opens on demand, offers the other quadrants, and focuses the first', async () => {
      await renderMatrix('/matrix', [activeTodo({ title: 'Pick', quadrant: 'Q2' })]);
      const user = userEvent.setup();
      const toggle = screen.getByRole('button', { name: 'Move “Pick”' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('group', { name: 'Move “Pick” to' })).not.toBeInTheDocument();

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const choices = within(screen.getByRole('group', { name: 'Move “Pick” to' }))
        .getAllByRole('button')
        .map((b) => b.textContent);
      expect(choices).toEqual(['Do Now', 'Delegate', 'Delete', 'Unsorted']);
      expect(screen.getByRole('button', { name: 'Do Now' })).toHaveFocus();
    });

    it('Escape closes the Move menu and returns focus to its button', async () => {
      await renderMatrix('/matrix', [activeTodo({ title: 'Esc', quadrant: 'Q1' })]);
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Move “Esc”' }));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('group', { name: 'Move “Esc” to' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move “Esc”' })).toHaveFocus();
    });

    it('a click outside closes the Move menu without moving anything', async () => {
      const todo = activeTodo({ title: 'Outside', quadrant: 'Q1' });
      const { repository } = await renderMatrix('/matrix', [todo]);
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Move “Outside”' }));
      await user.click(screen.getByRole('heading', { level: 1 }));
      expect(screen.queryByRole('group', { name: 'Move “Outside” to' })).not.toBeInTheDocument();
      expect(await repository.get(todo.id)).toEqual(todo);
    });

    it('gives every card a keyboard drag handle', async () => {
      await renderMatrix('/matrix', [activeTodo({ title: 'Movable', quadrant: 'Q1' })]);
      const handle = screen.getByRole('button', { name: 'Drag “Movable”' });
      expect(handle).toHaveAttribute('aria-roledescription', 'draggable');
      expect(handle).toHaveAccessibleDescription(/press space or enter to pick it up/i);
    });
  });

  describe('managing todos from the matrix (FR-16)', () => {
    it('adds a todo straight into a quadrant', async () => {
      const { user, repository } = await renderMatrix('/matrix');
      await user.click(screen.getByRole('button', { name: 'Add todo to Delegate' }));

      const dialog = screen.getByRole('dialog', { name: 'Add todo' });
      expect(within(dialog).getByLabelText('Quadrant')).toHaveValue('Q3');
      await user.type(within(dialog).getByLabelText('Title'), 'Ask Sam to file it{Enter}');

      await waitFor(() => {
        expect(titlesIn('Delegate')).toEqual(['Ask Sam to file it']);
      });
      expect((await repository.get('new-1'))?.quadrant).toBe('Q3');
    });

    it('adds an unsorted todo from the header button', async () => {
      const { user } = await renderMatrix('/matrix');
      await user.click(screen.getByRole('button', { name: 'Add todo' }));
      expect(screen.getByLabelText('Quadrant')).toHaveValue('');
      await user.type(screen.getByLabelText('Title'), 'Sort me later{Enter}');
      await waitFor(() => {
        expect(titlesIn('Unsorted')).toEqual(['Sort me later']);
      });
    });

    it('completing a todo removes it while completed todos are hidden', async () => {
      const todo = activeTodo({ title: 'Ship it', quadrant: 'Q1' });
      const { user, repository } = await renderMatrix('/matrix', [todo]);
      await user.click(screen.getByRole('checkbox', { name: 'Ship it' }));
      await waitFor(() => {
        expect(titlesIn('Do Now')).toEqual([]);
      });
      expect(await repository.get(todo.id)).toMatchObject({
        isCompleted: true,
        completedAt: T2.toISOString(),
      });
    });

    it('edits and deletes from a card', async () => {
      const todo = activeTodo({ title: 'Draft', quadrant: 'Q2' });
      const { user, repository } = await renderMatrix('/matrix', [todo]);

      await user.click(screen.getByRole('button', { name: 'Edit “Draft”' }));
      const title = screen.getByLabelText('Title');
      await user.clear(title);
      await user.type(title, 'Final{Enter}');
      await waitFor(() => {
        expect(titlesIn('Schedule')).toEqual(['Final']);
      });

      await user.click(screen.getByRole('button', { name: 'Delete “Final”' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
      await waitFor(() => {
        expect(titlesIn('Schedule')).toEqual([]);
      });
      expect(await repository.get(todo.id)).toBeUndefined();
      expect(screen.getByRole('heading', { level: 1, name: 'Eisenhower Matrix' })).toHaveFocus();
    });
  });

  it('shows the same data as the List view (FR-16)', async () => {
    const todo = activeTodo({ title: 'Shared', quadrant: null });
    const { user, router } = await renderMatrix('/matrix', [todo]);
    await moveWithMenu(user, 'Shared', 'Do Now');

    await act(() => router.navigate({ to: '/' }));
    const row = await screen.findByRole('listitem');
    expect(row).toHaveTextContent('Shared');
    expect(row).toHaveTextContent('Do Now');
  });
});
