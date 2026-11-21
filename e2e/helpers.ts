import { expect, type Locator, type Page } from '@playwright/test';

// Shared helpers for the e2e specs. Each Playwright test gets a fresh browser
// context, so IndexedDB starts empty in every test.

export const DB_NAME = 'todo-prioritizer';
export const STORE = 'todos';

/** A Matrix drop target (quadrant or the Unsorted tray), found by its heading. */
export const cell = (page: Page, name: string) =>
  page.getByRole('region', { name: new RegExp(`^${name}`) });

/** dnd-kit's screen-reader live region, which announces each step of a drag. */
export const dragAnnouncer = (page: Page) => page.locator('[id^="DndLiveRegion"]');

/** Adds a todo with the header "Add todo" button (works in both views). */
export async function addTodo(page: Page, title: string, quadrant = '') {
  await page.getByRole('button', { name: 'Add todo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add todo' });
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Quadrant').selectOption(quadrant);
  await dialog.getByRole('button', { name: 'Add todo' }).click();
  await expect(dialog).toBeHidden();
}

/** Adds a todo with a Matrix cell's "+ Add" button. */
export async function addToCell(page: Page, where: string, title: string) {
  await page.getByRole('button', { name: `Add todo to ${where}` }).click();
  const dialog = page.getByRole('dialog', { name: 'Add todo' });
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByRole('button', { name: 'Add todo' }).click();
  await expect(dialog).toBeHidden();
  await expect(cell(page, where).getByText(title, { exact: true })).toBeVisible();
}

/**
 * Drags with real mouse events: press, move in small steps, then release once
 * the target is highlighted (announced), as a person would. dnd-kit updates
 * the drop target after a re-render, so releasing at the very instant the
 * pointer arrives can drop on the previous target.
 */
export async function dragWithMouse(
  page: Page,
  source: Locator,
  target: Locator,
  targetName: string,
) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('Drag source or target is not visible');
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 4, { steps: 4 }); // pass the activation distance
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await expect(dragAnnouncer(page)).toHaveText(new RegExp(`is over ${targetName}`));
  await page.mouse.up();
}

/**
 * Presses a key during a keyboard drag, then waits for the announcement that
 * confirms it. (dnd-kit starts listening for keys just after pick-up, so a
 * key pressed in the same instant would be lost.)
 */
export async function dragKey(page: Page, key: string, announcement: RegExp) {
  await page.keyboard.press(key);
  await expect(dragAnnouncer(page)).toHaveText(announcement);
}

/** Waits until the app has created its IndexedDB database. */
export async function waitForDatabase(page: Page) {
  await expect
    .poll(async () => (await page.evaluate(() => indexedDB.databases())).map((d) => d.name))
    .toContain(DB_NAME);
}

/** Reads the raw stored records straight from IndexedDB, bypassing the app. */
export function readStoredTodos(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    ([dbName, storeName]) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const open = indexedDB.open(dbName);
        open.onerror = () => {
          reject(new Error(String(open.error)));
        };
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction(storeName).objectStore(storeName).getAll();
          request.onsuccess = () => {
            db.close();
            resolve(request.result as Record<string, unknown>[]);
          };
          request.onerror = () => {
            reject(new Error(String(request.error)));
          };
        };
      }),
    [DB_NAME, STORE] as const,
  );
}

/** Writes raw records straight into IndexedDB in one transaction (for seeding large data sets). */
export function writeStoredTodos(page: Page, records: readonly object[]): Promise<void> {
  return page.evaluate(
    ([dbName, storeName, rows]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(dbName);
        open.onerror = () => {
          reject(new Error(String(open.error)));
        };
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          for (const row of rows) store.put(row);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            reject(new Error(String(tx.error)));
          };
        };
      }),
    [DB_NAME, STORE, records] as const,
  );
}
