import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryTodoRepository } from '../data/InMemoryTodoRepository';
import type { TodoRepository } from '../data/TodoRepository';
import { createControllableRepository } from '../test/ControllableRepository';
import { activeTodo } from '../test/fixtures';
import { TodoProvider } from './TodoProvider';
import { useTodoActions } from './useTodoActions';
import { useDismissSaveError, useTodos } from './useTodos';

function wrapperFor(repository: TodoRepository, { strict = false } = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const tree = <TodoProvider repository={repository}>{children}</TodoProvider>;
    return strict ? <StrictMode>{tree}</StrictMode> : tree;
  };
}

/** Uses all three hooks together, as a component would. */
const useEverything = () => ({
  state: useTodos(),
  actions: useTodoActions(),
  dismiss: useDismissSaveError(),
});

describe('state hooks', () => {
  it('throw a helpful error outside <TodoProvider>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useTodos())).toThrow(/inside <TodoProvider>/);
  });

  it('useTodos goes from loading to ready with the stored todos', async () => {
    const todos = [activeTodo()];
    const { result } = renderHook(() => useTodos(), {
      wrapper: wrapperFor(new InMemoryTodoRepository(todos)),
    });
    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.todos).toEqual(todos);
  });

  it('an action updates every reader of useTodos (FR-16)', async () => {
    const wrapper = wrapperFor(new InMemoryTodoRepository());
    const { result } = renderHook(useEverything, { wrapper });
    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      await result.current.actions.create({ title: 'From the hook' });
    });
    await waitFor(() => {
      expect(result.current.state.todos.map((t) => t.title)).toEqual(['From the hook']);
    });
  });

  it('pending is true while an action is running', async () => {
    const ctl = createControllableRepository();
    let finishPut: () => void = () => undefined;
    ctl.repo.put.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishPut = resolve;
        }),
    );
    const { result } = renderHook(useEverything, { wrapper: wrapperFor(ctl.repo) });
    expect(result.current.actions.pending).toBe(false);

    let done: Promise<unknown> = Promise.resolve();
    act(() => {
      done = result.current.actions.create({ title: 'Slow' });
    });
    expect(result.current.actions.pending).toBe(true);

    await act(async () => {
      finishPut();
      await done;
    });
    expect(result.current.actions.pending).toBe(false);
  });

  it('a failed save shows up as saveError and can be dismissed', async () => {
    const ctl = createControllableRepository();
    const failure = new Error('quota exceeded');
    ctl.repo.put.mockRejectedValue(failure);
    const { result } = renderHook(useEverything, { wrapper: wrapperFor(ctl.repo) });

    await act(async () => {
      const outcome = await result.current.actions.create({ title: 'x' });
      expect(outcome).toEqual({ ok: false, error: { kind: 'storage', cause: failure } });
    });
    expect(result.current.state.saveError).toBe(failure);

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.state.saveError).toBeNull();
  });

  it('closes the storage subscription when the provider unmounts', async () => {
    const ctl = createControllableRepository();
    const { unmount } = renderHook(() => useTodos(), { wrapper: wrapperFor(ctl.repo) });
    await waitFor(() => {
      expect(ctl.subscriberCount).toBe(1);
    });
    unmount();
    expect(ctl.subscriberCount).toBe(0);
  });

  it('keeps exactly one storage subscription under StrictMode', async () => {
    const ctl = createControllableRepository();
    const { result } = renderHook(() => useTodos(), {
      wrapper: wrapperFor(ctl.repo, { strict: true }),
    });
    await waitFor(() => {
      expect(ctl.subscriberCount).toBe(1);
    });
    const todos = [activeTodo()];
    act(() => {
      ctl.emit(todos);
    });
    expect(result.current).toMatchObject({ status: 'ready', todos });
  });
});
