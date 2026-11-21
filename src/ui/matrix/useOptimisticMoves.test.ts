import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Todo } from '../../domain/todo';
import { activeTodo, T1 } from '../../test/fixtures';
import { useOptimisticMoves } from './useOptimisticMoves';

describe('useOptimisticMoves', () => {
  const todo = activeTodo({ quadrant: null });
  const other = activeTodo({ quadrant: 'Q4' });

  it('returns the stored todos unchanged when nothing is moving', () => {
    const todos = [todo, other];
    const { result } = renderHook(() => useOptimisticMoves(todos));
    expect(result.current.todos).toBe(todos);
  });

  it('shows a moved todo in its new quadrant right away', () => {
    const { result } = renderHook(() => useOptimisticMoves([todo, other]));
    act(() => {
      result.current.move(todo, 'Q2');
    });
    expect(result.current.todos.map((t) => t.quadrant)).toEqual(['Q2', 'Q4']);
  });

  it('keeps the move when unrelated changes arrive (same updatedAt)', () => {
    const { result, rerender } = renderHook(({ todos }) => useOptimisticMoves(todos), {
      initialProps: { todos: [todo, other] as readonly Todo[] },
    });
    act(() => {
      result.current.move(todo, 'Q2');
    });
    // Storage sends fresh copies of every todo whenever any todo changes.
    rerender({ todos: [{ ...todo }, { ...other, title: 'Edited elsewhere' }] });
    expect(result.current.todos[0]?.quadrant).toBe('Q2');
  });

  it('defers to storage once the saved todo arrives', () => {
    const { result, rerender } = renderHook(({ todos }) => useOptimisticMoves(todos), {
      initialProps: { todos: [todo] as readonly Todo[] },
    });
    act(() => {
      result.current.move(todo, 'Q2');
    });
    const saved = { ...todo, quadrant: 'Q3' as const, updatedAt: T1.toISOString() };
    rerender({ todos: [saved] });
    expect(result.current.todos[0]).toBe(saved);
  });

  it('reverts a move that failed to save', () => {
    const { result } = renderHook(() => useOptimisticMoves([todo]));
    act(() => {
      result.current.move(todo, 'Q1');
    });
    act(() => {
      result.current.revert(todo);
    });
    expect(result.current.todos[0]?.quadrant).toBeNull();
  });
});
