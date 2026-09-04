# Board interchange schema

Canonical format for handing a Kanban board between suite apps. Kanban
Designer is the producer of record — it stays the place teams *design*
boards. Other apps *consume* a board designed there to seed their own
execution: a lightweight generic tracker, or a domain-specific one
(Improvement Board's items, Change Planner's actions) that maps board
columns/cards onto its own model rather than adopting Track mode wholesale.

This doc is the spec; `kanban-designer/src/utils/boardExport.ts` is the
reference implementation (`wrapBoardExport` / `unwrapBoardExport`).

## Envelope (v1)

```json
{
  "schema": "agile-toolkit.kanban-board",
  "version": 1,
  "board": { "...": "KanbanBoard, see below" }
}
```

- `schema` — always the literal string `agile-toolkit.kanban-board`.
- `version` — integer, bumped only on a breaking change to `board`'s shape.
  A consumer that doesn't recognize a version should still try `board.columns`
  before giving up — added fields are additive and shouldn't break older
  readers.
- `board` — a `KanbanBoard` object, defined by `kanban-designer/src/types.ts`
  (copy is the source of truth; shape summarized below for consumers that
  don't share the TypeScript).

## `KanbanBoard` (summary)

```ts
interface KanbanBoard {
  id: string
  name: string
  columns: KanbanColumn[]
  swimLanes: string[]
  showWipWarnings: boolean
  mode?: 'design' | 'track'   // absent/'design' = structure only
  updatedAt?: number
}

interface KanbanColumn {
  id: string
  name: string
  wipLimit: number | null
  cards: KanbanCard[]
  subColumns?: KanbanColumn[]
  collapsed?: boolean
}

interface KanbanCard {
  id: string
  title: string
  description?: string
  swimLane?: string
  color?: string
  dueDate?: string           // Track-mode field
  tags?: string[]
  assignee?: string          // Track-mode field
  enteredColumnAt?: string   // Track-mode field
  checklist?: ChecklistItem[] // Track-mode field
}

interface ChecklistItem {
  id: string
  text: string
  done: boolean
}
```

Track-mode fields (`dueDate`, `assignee`, `enteredColumnAt`, `checklist`) may
be present even when `mode` is `'design'` or absent — Kanban Designer never
deletes data when a board is switched out of Track mode. A consumer that only
cares about structure (columns/cards/WIP) can safely ignore them; a consumer
that wants to seed real tracking data (a Track app, or a domain-specific
tracker) should read them when present rather than assuming Design-mode
boards never carry them.

## Producing (any app)

Wrap a board before sending it — as a file download, a `#board=` URL
fragment, a `?prefill=` query param, or any future transport:

```ts
{ schema: 'agile-toolkit.kanban-board', version: 1, board }
```

A **bare** `KanbanBoard` object (no envelope) is also accepted by every
Kanban Designer import path today, for backward compatibility with senders
that predate this schema (e.g. Improvement Board's `?prefill=` link). New
producers should use the envelope; it costs nothing and makes future
versioning possible.

## Consuming (any app)

1. Parse the JSON.
2. If it has `schema === 'agile-toolkit.kanban-board'`, read `.board`.
3. Otherwise, if it has a `columns` array directly, treat the object itself
   as the board (legacy/bare shape).
4. Otherwise, reject — not board-shaped.

This is exactly `unwrapBoardExport()` in `kanban-designer/src/utils/boardExport.ts`;
copy it rather than reimplementing if the consumer is also TypeScript.

## Versioning

Only bump `version` for a breaking change (a field renamed or repurposed,
not one added). A consumer should treat an unrecognized version as
"try anyway" rather than "refuse" — `board.columns` existing is the real
compatibility contract, `version` is informational.

## Adopters

- **Kanban Designer** — produces (file export, `#board=` share link) and
  consumes (`?prefill=`, `#board=`, file import) via the envelope, with
  fallback to the bare shape. Reference implementation.
- **Improvement Board** — produces the bare shape today (`kanbanLink.ts`).
  Not yet updated to the envelope; still compatible via the fallback.
- **Kanban Tracker** — new lightweight execution app; intended to consume
  this format directly rather than re-deriving its own. Not yet implemented.
- **Change Planner, Scrum Facilitator (retro board)** — candidates to consume
  a designed board for their own domain-specific tracking. Not yet wired up.
