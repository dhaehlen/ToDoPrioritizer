# ToDoPrioritizer — Requirements (Draft v0.1)

Status: **v0.3 — all open questions decided; ready for architecture**
Last updated: 2026-11-20

## 1. Purpose

A to-do app that lets a user capture tasks and prioritize them with the
Eisenhower Matrix. It has two main views: a **List view** for managing
todos and a **Matrix view** for sorting them into four quadrants.

## 2. Glossary

| Term      | Meaning                                            |
| --------- | -------------------------------------------------- |
| Todo      | One task the user wants to track.                  |
| Active    | A todo that is not yet marked done.                |
| Completed | A todo marked done. It is kept, not deleted.       |
| Quadrant  | One of the four Eisenhower categories (section 4). |
| Unsorted  | A todo that has not been put in a quadrant yet.    |

## 3. Data model

### 3.1 Todo

| Field         | Type              | Required | Rules                                                            |
| ------------- | ----------------- | -------- | ---------------------------------------------------------------- |
| `id`          | unique ID         | yes      | Set by the system. Never changes.                                |
| `title`       | text              | yes      | 1–200 characters after trimming spaces. Cannot be blank.         |
| `description` | text              | no       | Up to 2,000 characters.                                          |
| `createdAt`   | timestamp         | yes      | Set by the system when the todo is created. Never changes.       |
| `updatedAt`   | timestamp         | yes      | Set by the system on every edit.                                 |
| `isCompleted` | boolean           | yes      | Starts as `false`.                                               |
| `completedAt` | timestamp or null | —        | Set when the todo is marked done. Null while the todo is active. |
| `quadrant`    | `Q1`–`Q4` or null | —        | Null means unsorted.                                             |

**Invariant:** `completedAt` is set if and only if `isCompleted` is `true`.

Timestamps are stored in UTC and shown in the user's local time zone.

## 4. Eisenhower quadrants

| ID  | Urgent | Important | Label    | Action                   |
| --- | ------ | --------- | -------- | ------------------------ |
| Q1  | yes    | yes       | Do Now   | Do it right away.        |
| Q2  | no     | yes       | Schedule | Plan a time to do it.    |
| Q3  | yes    | no        | Delegate | Hand it to someone else. |
| Q4  | no     | no        | Delete   | Drop it.                 |

Q4's label "Delete" is a suggestion to the user. Putting a todo in Q4
**does not** delete it.

## 5. Functional requirements

### 5.1 Managing todos

- **FR-1 Add.** The user can create a todo by entering a title and, if they
  want, a description and a quadrant. The system sets `id`, `createdAt`,
  `updatedAt`, and `isCompleted = false`.
- **FR-2 Edit.** The user can change a todo's title, description, and
  quadrant. `updatedAt` is refreshed. `createdAt` and `completedAt` are
  never changed by an edit.
- **FR-3 Remove.** The user can permanently delete a todo. The app asks for
  confirmation first (or offers an undo, see Q7).
- **FR-4 Validation.** The app rejects a blank title or one that is too long
  and shows a clear error message. Nothing is saved when input is invalid.

### 5.2 Completion

- **FR-5 Mark done.** The user can mark an active todo as done. This sets
  `isCompleted = true` and `completedAt` to the current time. The todo is
  kept.
- **FR-6 Mark not done.** The user can undo completion. This sets
  `isCompleted = false` and clears `completedAt`.
- **FR-7 Display.** A completed todo looks different from an active one
  (for example, a checkmark or strikethrough) and shows its completion date.

### 5.3 List view

- **FR-8** The list shows each todo's title, created date, completion state,
  quadrant (or "Unsorted"), and completion date if it has one.
- **FR-9 Filter.** The user can filter the list by status: **All**,
  **Active**, or **Completed**. The default is **Active**.
- **FR-10 Sort.** By default, the newest todo is shown first. Completed
  todos can be sorted by `completedAt`, newest first.
- **FR-11 Empty states.** Each filter shows a helpful message when it has
  no todos.

### 5.4 Matrix view

- **FR-12** The matrix shows a 2×2 grid. Its axes are labelled
  Urgent / Not Urgent and Important / Not Important, and each quadrant shows
  its label (Do Now, Schedule, Delegate, Delete).
- **FR-13** Unsorted todos appear in a separate **Unsorted** area next to the
  grid.
- **FR-14 Assign.** The user can move a todo into a quadrant, between
  quadrants, or back to Unsorted. They can do this by drag-and-drop and also
  with a non-drag method (a menu or buttons) for accessibility and touch
  screens.
- **FR-15** By default, the matrix shows only active todos. A "show
  completed" toggle also shows completed todos in their quadrants.
- **FR-16** The user can add, edit, mark done, and remove a todo from the
  matrix view. All changes appear in the list view, and list changes appear
  in the matrix.
- **FR-17** Each quadrant shows how many todos it has.

### 5.5 Persistence

- **FR-18** Todos are saved on the user's device, in the browser. They are
  still there after a page reload or a browser restart. There is no account,
  login, or server-side storage.
- **FR-19** The app makes no network requests for data. All reads and writes
  happen on the device. (Because v1 is not a PWA, the app cannot be loaded
  for the first time, or reloaded, without a network connection.)

**Known limitation:** data is kept per browser and per device. It does not
sync between devices, and it is lost if the user clears their site data.

## 6. Non-functional requirements

- **NFR-1 Usability.** The main actions (add, mark done, assign quadrant)
  each take at most 2 interactions.
- **NFR-2 Accessibility.** The app meets WCAG 2.1 AA. Every action can be
  done with the keyboard, and quadrant colors are never the only way to tell
  quadrants apart.
- **NFR-3 Responsive.** The app works on desktop and on mobile screens
  (≥ 360px wide). On narrow screens, the matrix may stack its quadrants.
- **NFR-4 Performance.** Each view loads and responds in under 200 ms with
  1,000 todos.
- **NFR-5 Data integrity.** Each change either saves completely or not at
  all. The `completedAt` invariant (section 3.1) always holds.
- **NFR-6 Testability.** The business rules (validation, completion, and
  quadrant assignment) are covered by automated tests.

## 7. Open questions

### 7.1 Decided (2026-11-20)

| #   | Question                                       | Decision                                                                                       |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Q1  | Platform                                       | **Web app.**                                                                                   |
| Q2  | Users and storage                              | **One user. Data is stored on the user's own device.** No accounts and no server-side storage. |
| Q3  | Can a completed todo be marked not done again? | **Yes.** `completedAt` is cleared (FR-6).                                                      |
| Q4  | Do completed todos appear in the matrix?       | **No by default.** A "show completed" toggle is available (FR-15).                             |
| Q5  | Is "Unsorted" allowed?                         | **Yes.** New todos go to Unsorted unless the user picks a quadrant.                            |
| Q6  | Custom ordering within a quadrant              | **Not in v1.**                                                                                 |
| Q7  | How deletion is confirmed                      | **A confirmation dialog** (proposed default, not changed).                                     |
| Q8  | "Delete all in Q4" action                      | **Not in v1.**                                                                                 |
| Q9  | Due dates, tags, or "delegated to"             | **Not in v1.**                                                                                 |

| Q10 | Tech stack | **See section 10.** The app is front-end only with no backend. It will not be a PWA in v1. |

### 7.2 Still open

None.

## 8. Out of scope for v1

Due dates and reminders, recurring todos, tags or projects, sharing and
collaboration, a "delegated to" assignee, notifications, and data
import/export.

## 9. Acceptance criteria (examples)

- **AC-1:** Given an active todo, when the user marks it done, then it
  disappears from the Active filter, appears under Completed with today's
  date, and is not deleted.
- **AC-2:** Given a completed todo, when the user edits its title, then
  `completedAt` stays the same.
- **AC-3:** Given an unsorted todo, when the user drags it to "Schedule",
  then its quadrant is Q2 in both views, and it is still Q2 after a reload.
- **AC-4:** When the user tries to save a todo whose title is only spaces,
  then the save is rejected and an error is shown.
- **AC-5:** Given a todo in Q1, when the user deletes it and confirms, then
  it is removed from both views and does not come back after a reload.

## 10. Technology stack (decided 2026-11-20)

| Concern                   | Choice                             | Reason                                                                                                                     |
| ------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Language                  | TypeScript (strict mode)           | The compiler can check the data model's rules, such as the `completedAt` invariant.                                        |
| UI framework              | React                              | Large ecosystem, and good accessible drag-and-drop libraries.                                                              |
| Routing                   | TanStack Router (file-based) + Zod | URL search params with type-checked values, such as the status filter. Chosen partly as a chance to learn TanStack Router. |
| Build tool and dev server | Vite                               | Fast, and the standard choice for React with TypeScript.                                                                   |
| Storage                   | IndexedDB through Dexie            | Saves each todo as its own record, so a change saves completely or not at all. Supports indexes and schema migrations.     |
| Drag-and-drop             | dnd-kit                            | Supports the keyboard and screen readers (NFR-2, FR-14).                                                                   |
| Unit and component tests  | Vitest + React Testing Library     | Cover the business rules and components (NFR-6).                                                                           |
| End-to-end tests          | Playwright                         | Cover the acceptance criteria in section 9 in a real browser.                                                              |
| Backend                   | None                               | One user with data on their device (Q2).                                                                                   |
| PWA / offline install     | Not in v1                          | —                                                                                                                          |

**Architecture constraint:** all storage access goes through one
`TodoRepository` interface. UI components never call Dexie directly. This
keeps the business logic testable, and lets a backend be added later by
changing only that one interface.
