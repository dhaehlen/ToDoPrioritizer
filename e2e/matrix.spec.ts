import { expect, test } from '@playwright/test';
import { addToCell as addTo, cell, dragKey, dragWithMouse } from './helpers';

test.describe('matrix view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/matrix');
    await expect(cell(page, 'Unsorted')).toBeVisible();
  });

  test('drags a todo with the mouse into a quadrant, and it stays there after a reload (AC-3)', async ({
    page,
  }) => {
    await addTo(page, 'Unsorted', 'Plan the trip');
    await dragWithMouse(
      page,
      cell(page, 'Unsorted').getByText('Plan the trip', { exact: true }),
      cell(page, 'Schedule'),
      'Schedule',
    );

    await expect(cell(page, 'Schedule').getByText('Plan the trip', { exact: true })).toBeVisible();
    await expect(cell(page, 'Unsorted').getByText('Plan the trip', { exact: true })).toBeHidden();

    await page.reload();
    await expect(cell(page, 'Schedule').getByText('Plan the trip', { exact: true })).toBeVisible();
  });

  test('drags a todo with the keyboard (NFR-2)', async ({ page }) => {
    await addTo(page, 'Unsorted', 'Keyboard only');
    await page.getByRole('button', { name: 'Drag “Keyboard only”' }).focus();

    await dragKey(page, 'Space', /Picked up “Keyboard only”|over Unsorted/);
    await dragKey(page, 'ArrowRight', /over Do Now/);
    await dragKey(page, 'ArrowRight', /over Schedule/);
    await dragKey(page, 'ArrowDown', /over Delete/);
    await dragKey(page, 'Space', /“Keyboard only” moved to Delete./);

    await expect(cell(page, 'Delete').getByText('Keyboard only', { exact: true })).toBeVisible();
    await expect(
      page.getByText('“Keyboard only” moved to Delete.', { exact: true }),
    ).toBeAttached();
    // Focus returns to the handle so the user can keep going.
    await expect(page.getByRole('button', { name: 'Drag “Keyboard only”' })).toBeFocused();
  });

  test('Escape cancels a keyboard drag', async ({ page }) => {
    await addTo(page, 'Do Now', 'Stay put');
    await page.getByRole('button', { name: 'Drag “Stay put”' }).focus();
    await dragKey(page, 'Space', /Picked up “Stay put”|over Do Now/);
    await dragKey(page, 'ArrowRight', /over Schedule/);
    await dragKey(page, 'Escape', /cancelled/);

    await expect(cell(page, 'Do Now').getByText('Stay put', { exact: true })).toBeVisible();
    await expect(cell(page, 'Schedule').getByText('Stay put', { exact: true })).toBeHidden();
  });

  test('moves a todo with the "Move" menu', async ({ page }) => {
    await addTo(page, 'Unsorted', 'Menu move');
    await page.getByRole('button', { name: 'Move “Menu move”' }).click();
    await page
      .getByRole('group', { name: 'Move “Menu move” to' })
      .getByRole('button', { name: 'Delegate' })
      .click();
    await expect(cell(page, 'Delegate').getByText('Menu move', { exact: true })).toBeVisible();
  });

  test('clicking a card’s checkbox completes it instead of starting a drag', async ({ page }) => {
    await addTo(page, 'Do Now', 'Just finish');
    await page.getByRole('checkbox', { name: 'Just finish' }).click();
    await expect(cell(page, 'Do Now').getByText('Just finish', { exact: true })).toBeHidden();

    await page.getByLabel('Show completed').check();
    await expect(page).toHaveURL('/matrix?completed=true');
    await expect(cell(page, 'Do Now').getByRole('checkbox', { name: 'Just finish' })).toBeChecked();
  });

  test('a move in the matrix shows in the list view (FR-16)', async ({ page }) => {
    await addTo(page, 'Unsorted', 'Both views');
    await page.getByRole('button', { name: 'Move “Both views”' }).click();
    await page
      .getByRole('group', { name: 'Move “Both views” to' })
      .getByRole('button', { name: 'Do Now' })
      .click();
    await page.getByRole('link', { name: 'List' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Both views' })).toContainText(
      'Do Now',
    );
  });
});

test.describe('matrix view on a phone (NFR-3)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('stacks the quadrants Q1–Q4 in one column with no sideways scrolling', async ({ page }) => {
    await page.goto('/matrix');
    const names = ['Unsorted', 'Do Now', 'Schedule', 'Delegate', 'Delete'];
    const boxes = await Promise.all(names.map((n) => cell(page, n).boundingBox()));
    const tops = boxes.map((b) => b?.y ?? Number.NaN);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    // All in one column: every box starts at the same x.
    expect(new Set(boxes.map((b) => Math.round(b?.x ?? -1))).size).toBe(1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
