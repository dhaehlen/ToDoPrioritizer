import type { ClientRect, SensorContext, UniqueIdentifier } from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';
import { activeTodo } from '../../test/fixtures';
import {
  createAnnouncements,
  jumpBetweenTargets,
  quadrantForTarget,
  startsDrag,
  targetId,
} from './dnd';

const rect = (left: number, top: number, width = 100, height = 100): ClientRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

// The wide layout: the tray on the left, and the 2×2 matrix to its right.
//   unsorted | Q1 | Q2
//            | Q3 | Q4
const LAYOUT = new Map<UniqueIdentifier, ClientRect>([
  ['unsorted', rect(0, 0)],
  ['Q1', rect(200, 0)],
  ['Q2', rect(400, 0)],
  ['Q3', rect(200, 200)],
  ['Q4', rect(400, 200)],
]);

const CARD = rect(10, 10, 40, 20);

/**
 * Presses an arrow key with the card centered on target `fromId` (or at its
 * starting position, for `null`) and returns the target its center lands on.
 */
function press(code: string, fromId: UniqueIdentifier | null, layout = LAYOUT) {
  const event = new KeyboardEvent('keydown', { code, cancelable: true });
  const fromRect = fromId === null ? CARD : layout.get(fromId);
  if (!fromRect) throw new Error(`No target ${String(fromId)}`);
  const currentCoordinates = {
    x: fromRect.left + fromRect.width / 2 - CARD.width / 2,
    y: fromRect.top + fromRect.height / 2 - CARD.height / 2,
  };
  // `over` is deliberately stale: the getter must not rely on it.
  const context = {
    collisionRect: CARD,
    droppableRects: layout,
    over: { id: 'stale' },
  } as unknown as SensorContext;
  const result = jumpBetweenTargets(event, { active: 'todo', currentCoordinates, context });
  if (!result) return { event, landed: undefined };
  // Returning the card's own position means "don't move".
  if (result.x === currentCoordinates.x && result.y === currentCoordinates.y) {
    return { event, landed: 'stayed' };
  }
  const cx = result.x + CARD.width / 2;
  const cy = result.y + CARD.height / 2;
  const landed = [...layout].find(
    ([, r]) => cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom,
  )?.[0];
  return { event, landed };
}

describe('drop target ids', () => {
  it('map quadrants and Unsorted both ways', () => {
    expect(targetId('Q3')).toBe('Q3');
    expect(targetId(null)).toBe('unsorted');
    expect(quadrantForTarget('Q3')).toBe('Q3');
    expect(quadrantForTarget('unsorted')).toBeNull();
  });

  it('return undefined for anything that is not a drop target', () => {
    expect(quadrantForTarget(undefined)).toBeUndefined();
    expect(quadrantForTarget('some-todo-id')).toBeUndefined();
  });
});

describe('jumpBetweenTargets (keyboard dragging)', () => {
  it.each([
    ['ArrowRight', 'unsorted', 'Q1'],
    ['ArrowRight', 'Q1', 'Q2'],
    ['ArrowDown', 'Q1', 'Q3'],
    ['ArrowDown', 'Q2', 'Q4'],
    ['ArrowLeft', 'Q2', 'Q1'],
    ['ArrowLeft', 'Q1', 'unsorted'],
    ['ArrowUp', 'Q4', 'Q2'],
  ])('%s from %s lands on %s', (key, from, to) => {
    expect(press(key, from).landed).toBe(to);
  });

  it('starts from where the card is when the drag begins', () => {
    // The card starts inside the Unsorted tray's area.
    expect(press('ArrowRight', null).landed).toBe('Q1');
  });

  it('stays put when there is no target in that direction', () => {
    expect(press('ArrowRight', 'Q2').landed).toBe('stayed');
    expect(press('ArrowUp', 'Q1').event.defaultPrevented).toBe(true);
  });

  it('moves through a single stacked column on small screens', () => {
    const stacked = new Map<UniqueIdentifier, ClientRect>([
      ['unsorted', rect(0, 0)],
      ['Q1', rect(0, 150)],
      ['Q2', rect(0, 300)],
      ['Q3', rect(0, 450)],
      ['Q4', rect(0, 600)],
    ]);
    expect(press('ArrowDown', 'Q1', stacked).landed).toBe('Q2');
    expect(press('ArrowUp', 'Q1', stacked).landed).toBe('unsorted');
    expect(press('ArrowRight', 'Q1', stacked).landed).toBe('stayed');
  });

  it('ignores keys other than the arrows', () => {
    const { event, landed } = press('KeyA', 'Q1');
    expect(landed).toBeUndefined();
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('startsDrag', () => {
  function inCard(html: string, selector: string) {
    const card = document.createElement('li');
    card.innerHTML = html;
    return card.querySelector(selector);
  }

  it('starts on plain card content', () => {
    expect(startsDrag(inCard('<p>Title</p>', 'p'))).toBe(true);
  });

  it.each([
    ['a checkbox', '<input type="checkbox">', 'input'],
    ['the Move to menu', '<select><option>x</option></select>', 'select'],
    ['a button', '<button>Edit</button>', 'button'],
    ['text inside a button', '<button><span>Edit</span></button>', 'span'],
  ])('does not start on %s', (_label, html, selector) => {
    expect(startsDrag(inCard(html, selector))).toBe(false);
  });

  it('starts on the drag handle, even though it is a button', () => {
    expect(startsDrag(inCard('<button data-drag-handle><span>⠿</span></button>', 'span'))).toBe(
      true,
    );
  });

  it('starts for non-element targets', () => {
    expect(startsDrag(null)).toBe(true);
  });
});

describe('createAnnouncements', () => {
  const todo = activeTodo({ title: 'Pay rent' });
  const a = createAnnouncements((id) => (id === todo.id ? todo : undefined));
  const active = { id: todo.id } as never;

  it('uses titles and quadrant names, not ids', () => {
    expect(a.onDragStart({ active })).toBe('Picked up “Pay rent”.');
    expect(a.onDragOver({ active, over: { id: 'Q2' } as never })).toBe(
      '“Pay rent” is over Schedule.',
    );
    expect(a.onDragEnd({ active, over: { id: 'unsorted' } as never })).toBe(
      '“Pay rent” moved to Unsorted.',
    );
    expect(a.onDragCancel({ active, over: null })).toBe('Moving “Pay rent” was cancelled.');
  });

  it('explains when the todo is not over a quadrant', () => {
    expect(a.onDragOver({ active, over: null })).toBe('“Pay rent” is not over a quadrant.');
    expect(a.onDragEnd({ active, over: null })).toBe(
      '“Pay rent” was dropped outside the matrix and did not move.',
    );
  });

  it('falls back to "Todo" for an unknown id', () => {
    expect(a.onDragStart({ active: { id: 'gone' } as never })).toBe('Picked up “Todo”.');
  });
});
