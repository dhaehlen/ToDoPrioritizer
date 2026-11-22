# ADR-0005: TanStack Router, with view state in the URL

- **Status:** Accepted
- **Date:** 2026-11-20 (Matrix toggle added 2026-11-21)
- **Deciders:** Both. The user chose TanStack Router, partly to learn it, and
  agreed on Active as the default filter. Claude designed the file-based
  routes, the Zod checks on search params, and the removal of defaults from
  the URL.

## Context

The app has two views, List (`/`) and Matrix (`/matrix`). Users expect reload,
Back/Forward, and bookmarks to work. The List's status filter and the Matrix's
"show completed" toggle are view state worth keeping in the URL. Claude
recommended React Router, but the user chose TanStack Router to learn it.

## Decision

- **TanStack Router** with **file-based routing**. The Vite plugin generates
  `src/routeTree.gen.ts`. That file is committed and excluded from lint and
  formatting.
- **View state lives in the URL** and each route checks it with a Zod schema
  in `validateSearch`:
  - `/` takes `?status=all|active|completed`. The default is `active`, and an
    invalid value falls back to `active`.
  - `/matrix` takes `?completed=true`. The default is `false`.
- **Defaults are left out of the URL** with `stripSearchParams`, so the Active
  list is just `/`.
- **Components read their route's API with `getRouteApi('/…')`** instead of
  importing the route file, which would create an import cycle.
- **Filter tabs use `activeOptions={{ exact: true }}`.** The default partial
  match marked two tabs as current at once; this was a bug, fixed in M6.
- **Each route sets its page title** through the `head` option, rendered by
  `<HeadContent />`.

## Consequences

- Links and `navigate` calls are type-checked. For example, a mistyped
  `status: 'done'` doesn't compile.
- Real URLs need an SPA fallback on the static host.
- There's more to learn than with React Router, which was the point.

## Alternatives considered

- **React Router:** Claude's original recommendation. Simpler, but its search
  params aren't type-checked.
- **No router (view kept in `useState`):** reload and Back would break.
  Rejected.
- **Filter kept in browser storage:** it would be remembered between visits,
  but it couldn't be shared or bookmarked. Rejected in favor of the URL.
