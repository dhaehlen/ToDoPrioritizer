import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createTodoDatabase, DEFAULT_DB_NAME } from './db';

describe('TodoDatabase schema', () => {
  it('uses the app database name by default', () => {
    const db = createTodoDatabase(undefined, { indexedDB: new IDBFactory(), IDBKeyRange });
    expect(db.name).toBe(DEFAULT_DB_NAME);
    db.close();
  });

  it('v1: todos keyed by id and indexed by createdAt only', async () => {
    const db = createTodoDatabase('schema-test', { indexedDB: new IDBFactory(), IDBKeyRange });
    await db.open();

    expect(db.verno).toBe(1);
    const schema = db.todos.schema;
    expect(schema.primKey.keyPath).toBe('id');
    expect(schema.indexes.map((i) => i.name)).toEqual(['createdAt']);
    db.close();
  });
});
