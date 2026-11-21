import { describe, expect, it } from 'vitest';
import { activeTodo, completedTodo } from '../test/fixtures';
import {
  DEFAULT_STATUS_FILTER,
  filterByStatus,
  groupByQuadrant,
  selectListTodos,
  sortForList,
} from './selectors';

const at = (hour: number) => `2026-11-20T${String(hour).padStart(2, '0')}:00:00.000Z`;

describe('filterByStatus (FR-9)', () => {
  const a1 = activeTodo();
  const a2 = activeTodo();
  const c1 = completedTodo();
  const todos = [a1, c1, a2];

  it('defaults to "active"', () => {
    expect(DEFAULT_STATUS_FILTER).toBe('active');
  });

  it('"all" returns every todo', () => {
    expect(filterByStatus(todos, 'all')).toEqual(todos);
  });

  it('"active" returns only todos that are not done', () => {
    expect(filterByStatus(todos, 'active')).toEqual([a1, a2]);
  });

  it('"completed" returns only done todos', () => {
    expect(filterByStatus(todos, 'completed')).toEqual([c1]);
  });

  it('returns a new array and does not mutate the input', () => {
    const result = filterByStatus(todos, 'all');
    expect(result).not.toBe(todos);
    expect(todos).toEqual([a1, c1, a2]);
  });
});

describe('sortForList (FR-10)', () => {
  it('sorts newest created first', () => {
    const old = activeTodo({ createdAt: at(8) });
    const mid = activeTodo({ createdAt: at(9) });
    const recent = activeTodo({ createdAt: at(10) });
    expect(sortForList([mid, old, recent], 'active')).toEqual([recent, mid, old]);
  });

  it('breaks ties on createdAt by id so the order is stable', () => {
    const a = activeTodo({ id: 'a', createdAt: at(9) });
    const b = activeTodo({ id: 'b', createdAt: at(9) });
    expect(sortForList([a, b], 'all')).toEqual([b, a]);
    expect(sortForList([b, a], 'all')).toEqual([b, a]);
  });

  it('sorts the Completed filter by completion date, newest first', () => {
    // Created in one order, completed in the opposite order.
    const first = completedTodo({ createdAt: at(8), completedAt: at(12) });
    const second = completedTodo({ createdAt: at(9), completedAt: at(11) });
    expect(sortForList([second, first], 'completed')).toEqual([first, second]);
  });

  it('breaks ties on completedAt by creation date', () => {
    const older = completedTodo({ createdAt: at(8), completedAt: at(12) });
    const newer = completedTodo({ createdAt: at(9), completedAt: at(12) });
    expect(sortForList([older, newer], 'completed')).toEqual([newer, older]);
  });

  it('puts todos without a completion date last when sorting by completion', () => {
    const open = activeTodo({ createdAt: at(13) });
    const done = completedTodo({ createdAt: at(8), completedAt: at(12) });
    expect(sortForList([open, done], 'completed')).toEqual([done, open]);
    expect(sortForList([done, open], 'completed')).toEqual([done, open]);
  });

  it('sorts "all" by creation date even when some are completed', () => {
    const done = completedTodo({ createdAt: at(8), completedAt: at(12) });
    const open = activeTodo({ createdAt: at(9) });
    expect(sortForList([done, open], 'all')).toEqual([open, done]);
  });

  it('does not mutate the input', () => {
    const todos = [activeTodo({ createdAt: at(8) }), activeTodo({ createdAt: at(9) })];
    const copy = [...todos];
    sortForList(todos, 'all');
    expect(todos).toEqual(copy);
  });
});

describe('selectListTodos', () => {
  it('filters and then sorts', () => {
    const oldDone = completedTodo({ createdAt: at(7), completedAt: at(9) });
    const newDone = completedTodo({ createdAt: at(8), completedAt: at(10) });
    const open = activeTodo({ createdAt: at(11) });
    expect(selectListTodos([oldDone, open, newDone], 'completed')).toEqual([newDone, oldDone]);
    expect(selectListTodos([oldDone, open, newDone], 'active')).toEqual([open]);
  });
});

describe('groupByQuadrant (FR-13, FR-15, FR-17)', () => {
  it('puts each todo in its quadrant and null-quadrant todos in unsorted', () => {
    const q1 = activeTodo({ quadrant: 'Q1' });
    const q2 = activeTodo({ quadrant: 'Q2' });
    const q3 = activeTodo({ quadrant: 'Q3' });
    const q4 = activeTodo({ quadrant: 'Q4' });
    const none = activeTodo({ quadrant: null });
    expect(groupByQuadrant([q1, q2, q3, q4, none], { includeCompleted: false })).toEqual({
      Q1: [q1],
      Q2: [q2],
      Q3: [q3],
      Q4: [q4],
      unsorted: [none],
    });
  });

  it('always returns all five groups, even when empty', () => {
    expect(groupByQuadrant([], { includeCompleted: false })).toEqual({
      Q1: [],
      Q2: [],
      Q3: [],
      Q4: [],
      unsorted: [],
    });
  });

  it('hides completed todos by default (includeCompleted: false)', () => {
    const open = activeTodo({ quadrant: 'Q1' });
    const done = completedTodo({ quadrant: 'Q1' });
    const unsortedDone = completedTodo({ quadrant: null });
    const groups = groupByQuadrant([open, done, unsortedDone], { includeCompleted: false });
    expect(groups.Q1).toEqual([open]);
    expect(groups.unsorted).toEqual([]);
  });

  it('shows completed todos after active ones when includeCompleted is true', () => {
    const doneRecent = completedTodo({ quadrant: 'Q2', createdAt: at(12) });
    const openOld = activeTodo({ quadrant: 'Q2', createdAt: at(8) });
    const openNew = activeTodo({ quadrant: 'Q2', createdAt: at(10) });
    const groups = groupByQuadrant([doneRecent, openOld, openNew], { includeCompleted: true });
    expect(groups.Q2).toEqual([openNew, openOld, doneRecent]);
  });

  it('gives counts through the array lengths', () => {
    const todos = [
      activeTodo({ quadrant: 'Q1' }),
      activeTodo({ quadrant: 'Q1' }),
      activeTodo({ quadrant: 'Q4' }),
    ];
    const groups = groupByQuadrant(todos, { includeCompleted: false });
    expect(groups.Q1).toHaveLength(2);
    expect(groups.Q4).toHaveLength(1);
    expect(groups.Q2).toHaveLength(0);
  });
});
