import { expect, test, type Page } from '@playwright/test';
import { addTodo, cell, dragWithMouse, readStoredTodos, waitForDatabase } from './helpers';

/**
 * The acceptance criteria from docs/REQUIREMENTS.md §9, one test each, run
 * against the real app in real browsers. Where it matters, they check the
 * stored record in IndexedDB as well as what's on screen.
 */

const today = (page: Page) =>
  page.evaluate(() =>
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date()),
  );

async function storedByTitle(page: Page, title: string) {
  const todos = await readStoredTodos(page);
  return todos.find((t) => t.title === title);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForDatabase(page);
});

test('AC-1: marking a todo done moves it from Active to Completed with today’s date, without deleting it', async ({
  page,
}) => {
  // Given an active todo
  await addTodo(page, 'Water the plants');
  await expect(page.getByRole('checkbox', { name: 'Water the plants' })).not.toBeChecked();

  // When the user marks it done
  await page.getByRole('checkbox', { name: 'Water the plants' }).click();

  // Then it disappears from the Active filter…
  await expect(page.getByRole('checkbox', { name: 'Water the plants' })).toBeHidden();
  // …appears under Completed with today's date…
  await page.getByRole('link', { name: /^Completed/ }).click();
  const row = page.getByRole('listitem').filter({ hasText: 'Water the plants' });
  await expect(row).toContainText(`Completed ${await today(page)}`);
  await expect(row.getByRole('checkbox')).toBeChecked();
  // …and is not deleted.
  await expect
    .poll(() => storedByTitle(page, 'Water the plants'))
    .toMatchObject({ isCompleted: true, completedAt: expect.any(String) });
});

test('AC-2: editing a completed todo’s title keeps its completion date', async ({ page }) => {
  // Given a completed todo
  await addTodo(page, 'Draft report');
  await page.getByRole('checkbox', { name: 'Draft report' }).click();
  await expect
    .poll(async () => (await storedByTitle(page, 'Draft report'))?.isCompleted)
    .toBe(true);
  const before = await storedByTitle(page, 'Draft report');

  // When the user edits its title
  await page.goto('/?status=completed');
  await page.getByRole('button', { name: 'Edit “Draft report”' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit todo' });
  await dialog.getByLabel('Title').fill('Final report');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  // Then completedAt stays the same
  await expect.poll(() => storedByTitle(page, 'Final report')).toBeTruthy();
  const after = await storedByTitle(page, 'Final report');
  expect(after?.completedAt).toBe(before?.completedAt);
  expect(after?.createdAt).toBe(before?.createdAt);
  expect(after?.isCompleted).toBe(true);
});

test('AC-3: dragging an unsorted todo to Schedule puts it in Q2 in both views, and after a reload', async ({
  page,
}) => {
  // Given an unsorted todo
  await addTodo(page, 'Plan vacation');
  await page.getByRole('link', { name: 'Matrix' }).click();
  await expect(cell(page, 'Unsorted').getByText('Plan vacation', { exact: true })).toBeVisible();

  // When the user drags it to "Schedule"
  await dragWithMouse(
    page,
    cell(page, 'Unsorted').getByText('Plan vacation', { exact: true }),
    cell(page, 'Schedule'),
    'Schedule',
  );

  // Then its quadrant is Q2 in both views…
  await expect(cell(page, 'Schedule').getByText('Plan vacation', { exact: true })).toBeVisible();
  await expect.poll(async () => (await storedByTitle(page, 'Plan vacation'))?.quadrant).toBe('Q2');
  await page.getByRole('link', { name: 'List' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Plan vacation' })).toContainText(
    'Schedule',
  );

  // …and it is still Q2 after a reload.
  await page.goto('/matrix');
  await expect(cell(page, 'Schedule').getByText('Plan vacation', { exact: true })).toBeVisible();
});

test('AC-4: a title of only spaces is rejected with an error', async ({ page }) => {
  // When the user tries to save a todo whose title is only spaces
  await page.getByRole('button', { name: 'Add todo' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add todo' });
  await dialog.getByLabel('Title').fill('     ');
  await dialog.getByRole('button', { name: 'Add todo' }).click();

  // Then the save is rejected and an error is shown
  await expect(dialog.getByText('Enter a title.')).toBeVisible();
  await expect(dialog.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog).toBeVisible();
  expect(await readStoredTodos(page)).toEqual([]);
});

test('AC-5: deleting a Q1 todo removes it from both views, and it does not come back after a reload', async ({
  page,
}) => {
  // Given a todo in Q1
  await addTodo(page, 'Urgent call', 'Q1');

  // When the user deletes it and confirms
  await page.getByRole('button', { name: 'Delete “Urgent call”' }).click();
  await page
    .getByRole('dialog', { name: 'Delete todo?' })
    .getByRole('button', { name: 'Delete' })
    .click();

  // Then it is removed from both views…
  await expect(page.getByRole('checkbox', { name: 'Urgent call' })).toBeHidden();
  await page.getByRole('link', { name: 'Matrix' }).click();
  await expect(cell(page, 'Do Now')).toContainText('Drop todos here.');
  // …and does not come back after a reload.
  await page.reload();
  await expect(cell(page, 'Do Now')).toBeVisible();
  await expect(page.getByText('Urgent call', { exact: true })).toBeHidden();
  expect(await readStoredTodos(page)).toEqual([]);
});
