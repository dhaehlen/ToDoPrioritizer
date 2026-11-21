import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createControllableRepository } from '../test/ControllableRepository';
import { activeTodo } from '../test/fixtures';
import { TodoStore } from './TodoStore';

describe('TodoStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in the loading state without touching storage', () => {
    const { repo } = createControllableRepository();
    const store = new TodoStore(repo);
    expect(store.getSnapshot()).toEqual({
      status: 'loading',
      todos: [],
      loadError: null,
      saveError: null,
    });
    expect(repo.subscribe).not.toHaveBeenCalled();
  });

  it('subscribes to storage on the first listener and becomes ready with the list', () => {
    const ctl = createControllableRepository();
    const store = new TodoStore(ctl.repo);
    const listener = vi.fn();
    store.subscribe(listener);
    expect(ctl.subscriberCount).toBe(1);

    const todos = [activeTodo()];
    ctl.emit(todos);
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', todos });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('opens only one storage subscription for many listeners', () => {
    const ctl = createControllableRepository();
    const store = new TodoStore(ctl.repo);
    store.subscribe(vi.fn());
    store.subscribe(vi.fn());
    store.subscribe(vi.fn());
    expect(ctl.repo.subscribe).toHaveBeenCalledTimes(1);
  });

  it('returns the same snapshot object until something changes', () => {
    const ctl = createControllableRepository();
    const store = new TodoStore(ctl.repo);
    store.subscribe(vi.fn());
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    ctl.emit([]);
    expect(store.getSnapshot()).not.toBe(before);
  });

  it('keeps watching storage when every listener leaves (switching views)', () => {
    const ctl = createControllableRepository();
    const store = new TodoStore(ctl.repo);
    const unsubscribe = store.subscribe(vi.fn());
    const todos = [activeTodo()];
    ctl.emit(todos);
    unsubscribe();

    expect(ctl.subscriberCount).toBe(1);
    store.subscribe(vi.fn());
    expect(ctl.repo.subscribe).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', todos });
  });

  it('goes to error, keeps the last list, and recovers after retrying', () => {
    const ctl = createControllableRepository();
    const store = new TodoStore(ctl.repo, { retryDelayMs: 1000 });
    const listener = vi.fn();
    store.subscribe(listener);
    const todos = [activeTodo()];
    ctl.emit(todos);

    const failure = new Error('storage gone');
    ctl.fail(failure);
    expect(store.getSnapshot()).toMatchObject({ status: 'error', todos, loadError: failure });
    expect(ctl.subscriberCount).toBe(0);

    vi.advanceTimersByTime(999);
    expect(ctl.repo.subscribe).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(ctl.repo.subscribe).toHaveBeenCalledTimes(2);

    const newer = [activeTodo(), activeTodo()];
    ctl.emit(newer);
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', todos: newer, loadError: null });
  });

  it('keeps retrying while storage keeps failing', () => {
    const ctl = createControllableRepository();
    const store = new TodoStore(ctl.repo, { retryDelayMs: 100 });
    store.subscribe(vi.fn());
    for (let attempt = 1; attempt <= 3; attempt++) {
      ctl.fail(new Error(`attempt ${String(attempt)}`));
      vi.advanceTimersByTime(100);
    }
    expect(ctl.repo.subscribe).toHaveBeenCalledTimes(4);
    expect(store.getSnapshot().status).toBe('error');
  });

  it('stop() closes the subscription and cancels a pending retry', () => {
    const ctl = createControllableRepository();
    const store = new TodoStore(ctl.repo, { retryDelayMs: 100 });
    store.subscribe(vi.fn());
    ctl.fail(new Error('x'));
    store.stop();
    vi.advanceTimersByTime(1000);
    expect(ctl.repo.subscribe).toHaveBeenCalledTimes(1);
    expect(ctl.subscriberCount).toBe(0);
  });

  it('restarts after stop() when a listener subscribes again (StrictMode remount)', () => {
    const ctl = createControllableRepository();
    const store = new TodoStore(ctl.repo);
    store.subscribe(vi.fn());
    store.stop();
    expect(ctl.subscriberCount).toBe(0);
    store.subscribe(vi.fn());
    expect(ctl.subscriberCount).toBe(1);
  });

  it('records and dismisses save errors', () => {
    const { repo } = createControllableRepository();
    const store = new TodoStore(repo);
    const listener = vi.fn();
    store.subscribe(listener);

    const failure = new Error('quota exceeded');
    store.reportSaveError(failure);
    expect(store.getSnapshot().saveError).toBe(failure);

    store.dismissSaveError();
    expect(store.getSnapshot().saveError).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);

    store.dismissSaveError(); // nothing to dismiss: no change, no notification
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
