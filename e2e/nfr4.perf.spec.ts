import { expect, test, type Page } from '@playwright/test';
import { QUADRANTS } from '../src/domain/todo';
import { CARD_LIMIT } from '../src/ui/matrix/limits';
import { waitForDatabase, writeStoredTodos } from './helpers';

/**
 * NFR-4 (revised 2026-11-21): with 1,000 todos, interactions (changing the
 * filter, completing, moving, switching views) respond in under 200 ms, and
 * each view's cold page load finishes in under 1 s.
 *
 * Run with `npm run e2e:perf` (production build, one worker, Chromium).
 * Timings are taken inside the page with performance.now(), so Playwright's
 * own overhead isn't counted. "Done" means the expected rows are in the DOM
 * and the browser has painted the next frame. Each number is the median of 7
 * runs, after one discarded warm-up run. Timings on a busy laptop vary by
 * ±30% or more between runs.
 */

const INTERACTION_BUDGET_MS = 200;
const LOAD_BUDGET_MS = 1000;
/** The first run of each measurement is a warm-up (JIT, caches) and is discarded; the median of the rest is used. */
const RUNS = 8;
const TOTAL = 1000;
const COMPLETED = 200;
const ACTIVE = TOTAL - COMPLETED;

const LIST_ROWS = 'main ul > li';
const MATRIX_CARDS = 'section[data-quadrant] li';
/** The seed puts 160 active todos in each quadrant and in Unsorted, so each shows CARD_LIMIT. */
const MATRIX_VISIBLE = 5 * CARD_LIMIT;

/** 1,000 valid stored todos: 800 active and 200 completed, spread over Q1–Q4 and Unsorted. */
function makeTodos() {
  const base = Date.parse('2026-11-01T09:00:00.000Z');
  const quadrants = [...QUADRANTS, null];
  return Array.from({ length: TOTAL }, (_, i) => {
    const created = new Date(base + i * 60_000).toISOString();
    const completed = i < COMPLETED;
    return {
      id: `perf-${String(i).padStart(4, '0')}`,
      title: `Todo number ${String(i)} with a realistic length title`,
      description: i % 3 === 0 ? 'Some notes about this todo.' : '',
      quadrant: quadrants[i % quadrants.length],
      createdAt: created,
      updatedAt: created,
      isCompleted: completed,
      completedAt: completed ? new Date(base + i * 60_000 + 30_000).toISOString() : null,
    };
  });
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
};

function report(name: string, allSamples: number[]) {
  const samples = allSamples.slice(1); // drop the warm-up run
  const value = median(samples);
  test.info().annotations.push({
    type: 'timing',
    description: `${name}: median ${value.toFixed(0)} ms (runs: ${samples.map((s) => s.toFixed(0)).join(', ')})`,
  });
  console.log(
    `[NFR-4] ${name}: median ${value.toFixed(0)} ms — runs ${samples.map((s) => s.toFixed(0)).join(', ')}`,
  );
  return value;
}

/**
 * Loads `path` and returns the ms from navigation start until at least
 * `count` elements match `selector` and a frame has been painted.
 */
async function timeLoad(page: Page, path: string, selector: string, count: number) {
  await page.addInitScript(
    ([sel, n]) => {
      const w = window as unknown as { __readyAt?: number };
      const check = () => {
        if (document.querySelectorAll(sel).length >= n) {
          requestAnimationFrame(() => {
            w.__readyAt = performance.now();
          });
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    },
    [selector, count] as const,
  );
  await page.goto(path);
  await page.waitForFunction(() => (window as unknown as { __readyAt?: number }).__readyAt);
  return page.evaluate(() => (window as unknown as { __readyAt: number }).__readyAt);
}

type Action = { click: string } | { select: string; value: string };
/** Done when `selector` matches exactly `count` elements, or its first match contains `text`. */
type Until = { selector: string; count: number } | { selector: string; text: string };

/** Performs `action` in the page and returns the ms until `until` holds and a frame has been painted. */
function timeInteraction(page: Page, action: Action, until: Until) {
  return page.evaluate(
    ({ action, until }) =>
      new Promise<number>((resolve, reject) => {
        const start = performance.now();
        if ('click' in action) {
          const el = document.querySelector<HTMLElement>(action.click);
          if (!el) {
            reject(new Error(`No element for ${action.click}`));
            return;
          }
          el.click();
        } else {
          const el = document.querySelector<HTMLSelectElement>(action.select);
          if (!el) {
            reject(new Error(`No element for ${action.select}`));
            return;
          }
          el.value = action.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const check = () => {
          const done =
            'count' in until
              ? document.querySelectorAll(until.selector).length === until.count
              : (document.querySelector(until.selector)?.textContent ?? '').includes(until.text);
          if (done) {
            requestAnimationFrame(() => {
              resolve(performance.now() - start);
            });
          } else if (performance.now() - start > 5000) {
            reject(new Error(`Timed out waiting for ${until.selector}`));
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      }),
    { action, until },
  );
}

test.describe('NFR-4: performance with 1,000 todos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForDatabase(page);
    await writeStoredTodos(page, makeTodos());
  });

  test('the List view loads in under 1 s', async ({ page }) => {
    const samples: number[] = [];
    for (let i = 0; i < RUNS; i++) samples.push(await timeLoad(page, '/', LIST_ROWS, ACTIVE));
    expect(report('List view cold load (800 active rows)', samples)).toBeLessThan(LOAD_BUDGET_MS);
  });

  test('the Matrix view loads in under 1 s', async ({ page }) => {
    const samples: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      samples.push(await timeLoad(page, '/matrix', MATRIX_CARDS, MATRIX_VISIBLE));
    }
    expect(report('Matrix view cold load (800 active todos)', samples)).toBeLessThan(
      LOAD_BUDGET_MS,
    );
  });

  test('the List view responds in under 200 ms', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(LIST_ROWS)).toHaveCount(ACTIVE);

    const filter: number[] = [];
    const complete: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      filter.push(
        await timeInteraction(
          page,
          { click: 'a[href="/?status=all"]' },
          { selector: LIST_ROWS, count: TOTAL },
        ),
      );
      await page.goto('/');
      await expect(page.locator(LIST_ROWS)).toHaveCount(ACTIVE - i);
      complete.push(
        await timeInteraction(
          page,
          { click: `${LIST_ROWS}:first-child input[type="checkbox"]` },
          { selector: LIST_ROWS, count: ACTIVE - i - 1 },
        ),
      );
    }
    const filterMs = report('List: switch filter Active → All (1,000 rows)', filter);
    const completeMs = report('List: complete a todo (save + re-render)', complete);
    expect(filterMs).toBeLessThan(INTERACTION_BUDGET_MS);
    expect(completeMs).toBeLessThan(INTERACTION_BUDGET_MS);
  });

  test('the Matrix view responds in under 200 ms', async ({ page }) => {
    const switchView: number[] = [];
    const move: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      await page.goto('/');
      await expect(page.locator(LIST_ROWS)).toHaveCount(ACTIVE);
      switchView.push(
        await timeInteraction(
          page,
          { click: 'header a[href="/matrix"]' },
          { selector: MATRIX_CARDS, count: MATRIX_VISIBLE },
        ),
      );
      // The moved card may land beyond the first CARD_LIMIT, so wait for Do Now's count instead.
      const inQ1 = Number(await page.locator('section[data-quadrant="Q1"] h2 span').textContent());
      // Open the first unsorted card's Move menu (not timed), then time choosing "Do Now".
      await page
        .locator('section[data-quadrant="unsorted"] li')
        .first()
        .getByRole('button', { name: /^Move/ })
        .click();
      move.push(
        await timeInteraction(
          page,
          { click: '[data-choice]' },
          { selector: 'section[data-quadrant="Q1"] h2 span', text: String(inQ1 + 1) },
        ),
      );
    }
    const switchMs = report('Switch view List → Matrix (800 active todos)', switchView);
    const moveMs = report('Matrix: move a todo with the Move menu', move);
    expect(switchMs).toBeLessThan(INTERACTION_BUDGET_MS);
    expect(moveMs).toBeLessThan(INTERACTION_BUDGET_MS);
  });
});
