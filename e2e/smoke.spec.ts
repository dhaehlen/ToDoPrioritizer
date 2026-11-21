import { expect, test } from '@playwright/test';

test.describe('app shell', () => {
  test('loads the list view and switches to the matrix view', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Todos' })).toBeVisible();

    await page.getByRole('link', { name: 'Matrix' }).click();
    await expect(page).toHaveURL('/matrix');
    await expect(page.getByRole('heading', { level: 1, name: 'Eisenhower Matrix' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Todos' })).toBeVisible();
  });

  test('opens browser storage without showing an error', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Todos' })).toBeVisible();
    // Wait until the app has created its IndexedDB database, then check for errors.
    await expect
      .poll(async () => (await page.evaluate(() => indexedDB.databases())).map((d) => d.name))
      .toContain('todo-prioritizer');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('each view has its own page title (WCAG 2.4.2)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Todos · ToDoPrioritizer');
    await page.getByRole('link', { name: 'Matrix' }).click();
    await expect(page).toHaveTitle('Eisenhower Matrix · ToDoPrioritizer');
  });

  test('the skip link is the first Tab stop and jumps to the main content (WCAG 2.4.1)', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'Like Safari, WebKit skips links on Tab unless the user turns on "Press Tab to highlight each item".',
    );
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Todos' })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page).toHaveURL('/');
    // The next Tab stop is inside the main content, not the header.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Add todo' })).toBeFocused();
  });

  test('opens /matrix directly (deep link)', async ({ page }) => {
    await page.goto('/matrix');
    await expect(page.getByRole('heading', { level: 1, name: 'Eisenhower Matrix' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Matrix' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
