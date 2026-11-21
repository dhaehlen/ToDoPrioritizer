import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Automated accessibility checks (NFR-2: WCAG 2.1 AA, plus 2.2 AA rules such
 * as minimum target size). axe finds many problems, but not all of them:
 * keyboard flows and screen-reader announcements have their own e2e tests.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }));
  expect(summary).toEqual([]);
}

/** Adds todos through the UI so each scan sees real content. */
async function seed(page: Page) {
  await page.goto('/');
  const todos: [string, string][] = [
    ['Pay rent', 'Q1'],
    ['Plan the trip with a longer title that wraps onto a second line', 'Q2'],
    ['Reply to newsletter', 'Q3'],
    ['Sort old photos', 'Q4'],
    ['Something unsorted', ''],
  ];
  for (const [title, quadrant] of todos) {
    await page.getByRole('button', { name: 'Add todo' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add todo' });
    await dialog.getByLabel('Title').fill(title);
    await dialog.getByLabel('Quadrant').selectOption(quadrant);
    await dialog.getByRole('button', { name: 'Add todo' }).click();
    await expect(dialog).toBeHidden();
  }
  await page.getByRole('checkbox', { name: 'Sort old photos' }).click();
  await expect(page.getByRole('checkbox', { name: 'Sort old photos' })).toBeHidden();
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accessibility (${colorScheme} mode)`, () => {
    test.use({ colorScheme });

    test('list view, empty', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText(/no todos yet/i)).toBeVisible();
      await expectNoViolations(page);
    });

    test('list view with todos, on each filter', async ({ page }) => {
      await seed(page);
      await expectNoViolations(page);
      await page.goto('/?status=all');
      await expect(page.getByRole('listitem').first()).toBeVisible();
      await expectNoViolations(page);
    });

    test('add dialog with validation errors', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Add todo' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add todo' });
      await dialog.getByRole('button', { name: 'Add todo' }).click();
      await expect(dialog.getByText('Enter a title.')).toBeVisible();
      await expectNoViolations(page);
    });

    test('delete confirmation', async ({ page }) => {
      await seed(page);
      await page.getByRole('button', { name: 'Delete “Pay rent”' }).click();
      await expect(page.getByRole('dialog', { name: 'Delete todo?' })).toBeVisible();
      await expectNoViolations(page);
    });

    test('matrix view with todos, including completed', async ({ page }) => {
      await seed(page);
      await page.goto('/matrix?completed=true');
      await expect(page.getByRole('region', { name: /^Delete/ })).toContainText('Sort old photos');
      await expectNoViolations(page);
    });
  });
}

test.describe('accessibility on a phone', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('list and matrix views', async ({ page }) => {
    await seed(page);
    await expectNoViolations(page);
    await page.goto('/matrix');
    await expect(page.getByRole('region', { name: /^Do Now/ })).toContainText('Pay rent');
    await expectNoViolations(page);
  });
});
