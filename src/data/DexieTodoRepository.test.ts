import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { activeTodo, completedTodo } from '../test/fixtures';
import { createTodoDatabase } from './db';
import { DexieTodoRepository } from './DexieTodoRepository';
import { runTodoRepositoryContract } from './TodoRepository.contract';

/** A fresh, empty fake IndexedDB for each test, so tests never share data. */
function freshDb(factory = new IDBFactory()) {
  return createTodoDatabase('test-db', { indexedDB: factory, IDBKeyRange });
}

runTodoRepositoryContract('DexieTodoRepository', () => {
  const db = freshDb();
  return Promise.resolve({
    repo: new DexieTodoRepository(db),
    cleanup: () => {
      db.close();
    },
  });
});

describe('DexieTodoRepository', () => {
  it('keeps todos after the database is closed and reopened (FR-18)', async () => {
    const factory = new IDBFactory();
    const todos = [activeTodo({ quadrant: 'Q1' }), completedTodo()];

    const first = freshDb(factory);
    const writer = new DexieTodoRepository(first);
    for (const t of todos) await writer.put(t);
    first.close();

    const second = freshDb(factory);
    const reader = new DexieTodoRepository(second);
    expect((await reader.getAll()).sort((a, b) => a.id.localeCompare(b.id))).toEqual(todos);
    second.close();
  });

  it('skips invalid stored records and reports each one', async () => {
    const db = freshDb();
    const good = activeTodo();
    const corrupt = { id: 'corrupt', title: 'No other fields' };
    // Write directly to the table, bypassing the repository's validation,
    // to simulate old or damaged data on the user's device.
    await db.todos.bulkPut([good, corrupt]);

    const onInvalidRecord = vi.fn();
    const repo = new DexieTodoRepository(db, { onInvalidRecord });

    expect(await repo.getAll()).toEqual([good]);
    expect(onInvalidRecord).toHaveBeenCalledTimes(1);
    expect(onInvalidRecord).toHaveBeenCalledWith(expect.objectContaining({ record: corrupt }));

    expect(await repo.get('corrupt')).toBeUndefined();
    db.close();
  });

  it('logs invalid records with console.warn by default', async () => {
    const db = freshDb();
    await db.todos.put({ id: 'corrupt' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(await new DexieTodoRepository(db).getAll()).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    db.close();
  });

  it('strips unknown fields written by a newer version of the app', async () => {
    const db = freshDb();
    const todo = activeTodo();
    await db.todos.put({ ...todo, dueDate: '2027-01-01' });
    expect(await new DexieTodoRepository(db).get(todo.id)).toEqual(todo);
    db.close();
  });

  it('reports storage errors to the subscriber', async () => {
    const db = freshDb();
    const failure = new Error('disk full');
    vi.spyOn(db.todos, 'toArray').mockRejectedValue(failure);
    const repo = new DexieTodoRepository(db);

    const error = vi.fn();
    const unsubscribe = repo.subscribe({ next: vi.fn(), error });
    await vi.waitFor(() => {
      expect(error).toHaveBeenCalledWith(failure);
    });
    unsubscribe();
    db.close();
  });
});
