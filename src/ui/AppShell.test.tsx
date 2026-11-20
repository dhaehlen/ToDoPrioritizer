import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '../test/renderWithRouter';

describe('AppShell', () => {
  it('shows the list view at /', async () => {
    await renderWithRouter('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'List' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates to the matrix view from the tab bar', async () => {
    const user = userEvent.setup();
    const { router } = await renderWithRouter('/');

    await user.click(await screen.findByRole('link', { name: 'Matrix' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Eisenhower Matrix' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/matrix');
    expect(screen.getByRole('link', { name: 'Matrix' })).toHaveAttribute('aria-current', 'page');
  });
});
