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

  test('opens /matrix directly (deep link)', async ({ page }) => {
    await page.goto('/matrix');
    await expect(page.getByRole('heading', { level: 1, name: 'Eisenhower Matrix' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Matrix' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
