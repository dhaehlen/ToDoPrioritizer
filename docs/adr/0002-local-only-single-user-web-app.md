# ADR-0002: Local-only, single-user web app with no backend

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Both. The user chose web, single user, and on-device data.
  Claude recommended no backend and no PWA, and the user agreed.

## Context

The app needs a list of todos and an Eisenhower Matrix. An earlier attempt had
a Python backend, and the user asked that it not influence the design. The
user wanted a web app for one person, with data saved on their own device.

## Decision

- **Platform:** a single-page **web app**.
- **Users:** **one user**, with no accounts or login.
- **Storage:** data lives **in the browser on the user's device** (see
  [ADR-0006](0006-indexeddb-dexie-repository.md)).
- **No backend.** Every read and write happens on the device (FR-19).
- **No PWA in v1.** There is no service worker and no offline install.

## Consequences

- No server to run, secure, or pay for. Free static hosting works, but the
  host needs an SPA fallback so every URL serves `index.html`.
- Data is per browser and per device. It doesn't sync, and it's lost if the
  user clears site data. This is documented as a known limitation in the
  requirements.
- Without a service worker, the app can't be opened for the first time, or
  reloaded, while offline.
- Adding a backend later is possible by writing another `TodoRepository`
  implementation.

## Alternatives considered

- **Python backend (FastAPI + SQLite) running locally:** every user would have
  to install Python and start a server to save a few small records the browser
  can store itself. Rejected.
- **Accounts plus a backend database:** not needed for a single user. Deferred.
- **PWA:** considered and declined by the user for v1.
