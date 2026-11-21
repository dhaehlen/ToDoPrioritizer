import { Dexie, type DexieOptions, type Table } from 'dexie';

export const DEFAULT_DB_NAME = 'todo-prioritizer';

/**
 * The IndexedDB database. Records are stored exactly as the domain `Todo`, but
 * they are typed `unknown` on read, because anything stored on the user's
 * device may be old or corrupted and must be checked (see `todoSchema.ts`).
 */
export type TodoDatabase = Dexie & { todos: Table<unknown, string> };

/**
 * Schema history. Never edit a released version: add a new one with an
 * `.upgrade()` step and a test in `db.test.ts`.
 *
 * - v1: `todos` keyed by `id`, indexed by `createdAt`. `isCompleted` and
 *   `quadrant` are not indexed, because IndexedDB cannot index booleans or null.
 */
function defineSchema(db: Dexie): void {
  db.version(1).stores({ todos: 'id, createdAt' });
}

export function createTodoDatabase(
  name: string = DEFAULT_DB_NAME,
  options?: DexieOptions,
): TodoDatabase {
  const db = new Dexie(name, options) as TodoDatabase;
  defineSchema(db);
  return db;
}
