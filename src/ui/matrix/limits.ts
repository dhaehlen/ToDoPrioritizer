/**
 * How many cards a quadrant shows before "Show N more" (NFR-4). Rendering
 * hundreds of draggable cards at once made opening the Matrix slow, and a
 * quadrant that long is hard to scan anyway. Counts always include every todo.
 */
export const CARD_LIMIT = 50;
