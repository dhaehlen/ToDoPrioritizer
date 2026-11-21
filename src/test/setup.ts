// jsdom has no IndexedDB. Dexie needs the global IDB classes when it loads
// (liveQuery never emits without them), so install the fake before anything
// imports Dexie. Tests still pass their own fresh `new IDBFactory()` for isolation.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement scrolling; the router's scroll restoration calls it.
window.scrollTo = () => undefined;

// jsdom has <dialog> but not showModal()/close(). This minimal polyfill sets
// `open` and fires `close` like a browser does. It doesn't trap focus or
// handle Escape; e2e tests in real browsers cover those.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  if (!this.open) return;
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

afterEach(() => {
  cleanup();
});
