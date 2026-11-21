import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TodoProvider } from '../../state/TodoProvider';
import { useTodoActions } from '../../state/useTodoActions';
import { createControllableRepository } from '../../test/ControllableRepository';
import { ErrorBanner } from './ErrorBanner';

/** Stands in for the add form (built in M4) so a save can be triggered. */
function SaveButton() {
  const { create } = useTodoActions();
  return (
    <button type="button" onClick={() => void create({ title: 'Try to save' })}>
      Save
    </button>
  );
}

function renderBanner(ctl: ReturnType<typeof createControllableRepository>, retryDelayMs = 2000) {
  return render(
    <TodoProvider repository={ctl.repo} storeOptions={{ retryDelayMs }}>
      <ErrorBanner />
      <SaveButton />
    </TodoProvider>,
  );
}

describe('ErrorBanner', () => {
  it('shows nothing when storage works', () => {
    const ctl = createControllableRepository();
    renderBanner(ctl);
    act(() => {
      ctl.emit([]);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains when todos cannot be loaded, and clears once storage recovers', async () => {
    const ctl = createControllableRepository();
    renderBanner(ctl, 10);

    act(() => {
      ctl.fail(new Error('IndexedDB unavailable'));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/can't be loaded/i);

    // The store re-subscribes after 10 ms; then storage starts working again.
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    act(() => {
      ctl.emit([]);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a failed save until the user dismisses it', async () => {
    const user = userEvent.setup();
    const ctl = createControllableRepository();
    ctl.repo.put.mockRejectedValue(new Error('quota exceeded'));
    renderBanner(ctl);
    act(() => {
      ctl.emit([]);
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't be saved/i);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
