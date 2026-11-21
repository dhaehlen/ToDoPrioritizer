import { expect, test, type Page } from '@playwright/test';

// Each Playwright test gets a fresh browser context, so IndexedDB starts empty.

async function addTodo(page: Page, title: string, quadrant?: string) {
  await page.getByRole('button', { name: 'Add todo' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add todo' });
  await dialog.getByLabel('Title').fill(title);
  if (quadrant) await dialog.getByLabel('Quadrant').selectOption(quadrant);
  await dialog.getByRole('button', { name: 'Add todo' }).click();
  await expect(dialog).toBeHidden();
}

test.describe('list view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/no todos yet/i)).toBeVisible();
  });

  test('adds a todo and keeps it after a reload (FR-18)', async ({ page }) => {
    await addTodo(page, 'Renew passport', 'Q2');
    await expect(page.getByRole('checkbox', { name: 'Renew passport' })).toBeVisible();

    await page.reload();
    const row = page.getByRole('listitem').filter({ hasText: 'Renew passport' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Schedule');
  });

  test('the add dialog focuses the title, and Escape closes it without saving', async ({
    page,
  }) => {
    // Open with the keyboard: Safari doesn't focus buttons on click, so there
    // would be nothing for the dialog to return focus to.
    await page.getByRole('button', { name: 'Add todo' }).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Add todo' });
    await expect(dialog.getByLabel('Title')).toBeFocused();
    await dialog.getByLabel('Title').fill('Discard me');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Add todo' })).toBeFocused();
    await expect(page.getByText(/no todos yet/i)).toBeVisible();
  });

  test('marks a todo done, then finds it under Completed after a reload (AC-1)', async ({
    page,
  }) => {
    await addTodo(page, 'Call mom');
    // click(), not check(): under the Active filter the row disappears as soon as it's done.
    await page.getByRole('checkbox', { name: 'Call mom' }).click();
    await expect(page.getByRole('checkbox', { name: 'Call mom' })).toBeHidden();

    await page.getByRole('link', { name: /^Completed/ }).click();
    await expect(page).toHaveURL('/?status=completed');
    await page.reload();
    const row = page.getByRole('listitem').filter({ hasText: 'Call mom' });
    await expect(row).toContainText('Completed');
    await expect(row.getByRole('checkbox')).toBeChecked();
  });

  test('deletes a todo after confirming, and it stays gone after a reload (AC-5)', async ({
    page,
  }) => {
    await addTodo(page, 'Old idea', 'Q4');
    await page.getByRole('button', { name: 'Delete “Old idea”' }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete todo?' });
    await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await confirm.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('checkbox', { name: 'Old idea' })).toBeHidden();
    await page.reload();
    await expect(page.getByText(/no todos yet/i)).toBeVisible();
  });

  test('a filter in the URL survives reload and Back (FR-9)', async ({ page }) => {
    await addTodo(page, 'Something');
    await page.getByRole('link', { name: /^All/ }).click();
    await expect(page).toHaveURL('/?status=all');
    await page.reload();
    await expect(page.getByRole('link', { name: /^All/ })).toHaveAttribute('aria-current', 'page');
    await page.goBack();
    await expect(page).toHaveURL('/');
  });
});
