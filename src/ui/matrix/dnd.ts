/**
 * Drag-and-drop setup for the Matrix view (ARCHITECTURE §6.3).
 *
 * Drop targets are the four quadrants plus the Unsorted tray. Their dnd-kit
 * ids are `Q1`–`Q4` and `unsorted`. Draggables use the todo's id.
 */
import {
  KeyboardCode,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  type Announcements,
  type ClientRect,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react';
import { quadrantLabel } from '../../domain/quadrants';
import { isQuadrant, type Quadrant, type Todo } from '../../domain/todo';

export const UNSORTED_TARGET = 'unsorted';
export type DropTargetId = Quadrant | typeof UNSORTED_TARGET;

export const targetId = (quadrant: Quadrant | null): DropTargetId => quadrant ?? UNSORTED_TARGET;

/** Maps a drop target id back to a quadrant (`null` for Unsorted). Returns `undefined` for anything else. */
export function quadrantForTarget(id: UniqueIdentifier | undefined): Quadrant | null | undefined {
  if (id === UNSORTED_TARGET) return null;
  return isQuadrant(id) ? id : undefined;
}

/**
 * Uses the pointer position when there is one (mouse or touch), so the target
 * is the quadrant under the cursor. With the keyboard there is no pointer, so
 * it falls back to whichever target overlaps the dragged card.
 */
export const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : rectIntersection(args);
};

const center = (rect: ClientRect) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const contains = (rect: ClientRect, point: { x: number; y: number }) =>
  point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;

const DIRECTIONS: Partial<Record<string, { x: number; y: number }>> = {
  [KeyboardCode.Right]: { x: 1, y: 0 },
  [KeyboardCode.Left]: { x: -1, y: 0 },
  [KeyboardCode.Down]: { x: 0, y: 1 },
  [KeyboardCode.Up]: { x: 0, y: -1 },
};

/**
 * Makes the arrow keys jump straight to the nearest drop target in that
 * direction. dnd-kit's default moves the card a few pixels per key press,
 * which is slow and imprecise for picking one of five targets.
 *
 * This works in both layouts: the 2×2 grid, and the single stacked column on
 * small screens, where Left/Right simply find nothing.
 */
export const jumpBetweenTargets: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context },
) => {
  const direction = DIRECTIONS[event.code];
  const { collisionRect, droppableRects } = context;
  if (!direction || !collisionRect) return undefined;
  event.preventDefault();

  // Start from where the card is now. `currentCoordinates` (the card's top-left)
  // is updated by the sensor on every key press. `context.over` and
  // `collisionRect`'s position only update after React re-renders, so they
  // are stale when keys are pressed quickly.
  const from = {
    x: currentCoordinates.x + collisionRect.width / 2,
    y: currentCoordinates.y + collisionRect.height / 2,
  };

  let best: { rect: ClientRect; distance: number } | null = null;
  for (const rect of droppableRects.values()) {
    // Skip the target the card is already in.
    if (contains(rect, from)) continue;
    const to = center(rect);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // Only targets that are actually in the pressed direction.
    const along = dx * direction.x + dy * direction.y;
    if (along <= 1) continue;
    const across = Math.abs(dx * direction.y + dy * direction.x);
    // Prefer targets straight ahead over ones off to the side.
    const distance = along + across * 2;
    if (!best || distance < best.distance) best = { rect, distance };
  }
  if (!best) return currentCoordinates;

  // Put the card's center on the target's center.
  const target = center(best.rect);
  return {
    x: target.x - collisionRect.width / 2,
    y: target.y - collisionRect.height / 2,
  };
};

/**
 * True if a press on `target` should start a drag. Presses on a card's own
 * controls (checkbox, menu, buttons) don't, so those keep working normally.
 * The drag handle is the exception.
 */
export function startsDrag(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  if (target.closest('[data-drag-handle]')) return true;
  return !target.closest('button, input, select, textarea, a, label');
}

/** A mouse/pen press anywhere on a card, except its controls, can start a drag. */
export class CardPointerSensor extends PointerSensor {
  static override activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: ReactPointerEvent) =>
        event.isPrimary && event.button === 0 && startsDrag(event.target),
    },
  ];
}

/** A long press anywhere on a card, except its controls, can start a drag. */
export class CardTouchSensor extends TouchSensor {
  static override activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent: event }: ReactTouchEvent) =>
        event.touches.length <= 1 && startsDrag(event.target),
    },
  ];
}

export const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'To move this todo, press Space or Enter to pick it up. Use the arrow keys to choose a ' +
    'quadrant, then press Space or Enter to drop it there, or Escape to cancel. You can also ' +
    'use the Move to menu.',
};

/** Spoken updates during a drag, using todo titles and quadrant names instead of ids. */
export function createAnnouncements(findTodo: (id: UniqueIdentifier) => Todo | undefined) {
  const title = (id: UniqueIdentifier) => `“${findTodo(id)?.title ?? 'Todo'}”`;
  const where = (id: UniqueIdentifier | undefined) => {
    const quadrant = quadrantForTarget(id);
    return quadrant === undefined ? undefined : quadrantLabel(quadrant);
  };

  return {
    onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const target = where(over?.id);
      return target
        ? `${title(active.id)} is over ${target}.`
        : `${title(active.id)} is not over a quadrant.`;
    },
    onDragEnd: ({ active, over }) => {
      const target = where(over?.id);
      return target
        ? `${title(active.id)} moved to ${target}.`
        : `${title(active.id)} was dropped outside the matrix and did not move.`;
    },
    onDragCancel: ({ active }) => `Moving ${title(active.id)} was cancelled.`,
  } satisfies Announcements;
}
