/** The four Eisenhower quadrants. See `quadrants.ts` for labels and meaning. */
export const QUADRANTS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
export type Quadrant = (typeof QUADRANTS)[number];

/** An ISO-8601 UTC timestamp, as produced by `Date.prototype.toISOString()`. */
export type IsoUtc = string;

/** Limits are counted in user-perceived characters (grapheme clusters), not UTF-16 units. */
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

interface TodoBase {
  readonly id: string;
  /** Trimmed; 1–TITLE_MAX_LENGTH characters. */
  readonly title: string;
  /** Trimmed; 0–DESCRIPTION_MAX_LENGTH characters. `''` means no description. */
  readonly description: string;
  /** `null` means the todo is Unsorted. */
  readonly quadrant: Quadrant | null;
  readonly createdAt: IsoUtc;
  readonly updatedAt: IsoUtc;
}

export interface ActiveTodo extends TodoBase {
  readonly isCompleted: false;
  readonly completedAt: null;
}

export interface CompletedTodo extends TodoBase {
  readonly isCompleted: true;
  readonly completedAt: IsoUtc;
}

/**
 * A todo. The union enforces the invariant from REQUIREMENTS §3.1:
 * `completedAt` is set if and only if `isCompleted` is true.
 */
export type Todo = ActiveTodo | CompletedTodo;

export const isQuadrant = (value: unknown): value is Quadrant =>
  typeof value === 'string' && (QUADRANTS as readonly string[]).includes(value);
