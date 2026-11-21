import { describe, expect, it } from 'vitest';
import type { Todo } from '../domain/todo';
import { activeTodo } from '../test/fixtures';
import { InMemoryTodoRepository } from './InMemoryTodoRepository';
import { runTodoRepositoryContract } from './TodoRepository.contract';
import { InvalidTodoError } from './todoSchema';

runTodoRepositoryContract('InMemoryTodoRepository', () =>
  Promise.resolve({ repo: new InMemoryTodoRepository() }),
);

describe('InMemoryTodoRepository', () => {
  it('can be seeded with initial todos', async () => {
    const todos = [activeTodo(), activeTodo()];
    const repo = new InMemoryTodoRepository(todos);
    expect(await repo.getAll()).toEqual(todos);
  });

  it('rejects invalid seed data', () => {
    const bad = { ...activeTodo(), quadrant: 'Q9' } as unknown as Todo;
    expect(() => new InMemoryTodoRepository([bad])).toThrow(InvalidTodoError);
  });
});
