import { QUADRANTS, type Quadrant } from './todo';

export interface QuadrantInfo {
  readonly id: Quadrant;
  readonly urgent: boolean;
  readonly important: boolean;
  /** Short label shown in the UI, e.g. "Do Now". */
  readonly label: string;
  /** One-line guidance for what to do with todos in this quadrant. */
  readonly action: string;
}

export const QUADRANT_INFO: Readonly<Record<Quadrant, QuadrantInfo>> = {
  Q1: { id: 'Q1', urgent: true, important: true, label: 'Do Now', action: 'Do it right away.' },
  Q2: {
    id: 'Q2',
    urgent: false,
    important: true,
    label: 'Schedule',
    action: 'Plan a time to do it.',
  },
  Q3: {
    id: 'Q3',
    urgent: true,
    important: false,
    label: 'Delegate',
    action: 'Hand it to someone else.',
  },
  Q4: { id: 'Q4', urgent: false, important: false, label: 'Delete', action: 'Drop it.' },
};

/** Quadrants in display order (Q1–Q4). */
export const QUADRANT_LIST: readonly QuadrantInfo[] = QUADRANTS.map((q) => QUADRANT_INFO[q]);

/** The display label for a quadrant, or "Unsorted" for `null`. */
export const quadrantLabel = (quadrant: Quadrant | null): string =>
  quadrant ? QUADRANT_INFO[quadrant].label : 'Unsorted';

/** Maps the two Eisenhower questions to a quadrant. */
export function quadrantFor(flags: { urgent: boolean; important: boolean }): Quadrant {
  if (flags.important) return flags.urgent ? 'Q1' : 'Q2';
  return flags.urgent ? 'Q3' : 'Q4';
}
