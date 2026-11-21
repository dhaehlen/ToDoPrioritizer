// jsdom has no IndexedDB. Dexie needs the global IDB classes when it loads
// (liveQuery never emits without them), so install the fake before anything
// imports Dexie. Tests still pass their own fresh `new IDBFactory()` for isolation.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement scrolling; the router's scroll restoration calls it.
window.scrollTo = () => undefined;

afterEach(() => {
  cleanup();
});
