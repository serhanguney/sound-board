# Sound Board

A soundboard for team meetings: play sound effects on demand, or schedule them
to fire during a call.

## Commands

```bash
pnpm dev        # dev server
pnpm check      # typecheck + lint + test — run before committing
pnpm test       # vitest
pnpm build      # production build (type errors and lint errors fail the build)
```

`BLOB_READ_WRITE_TOKEN` must be set for the sound list to load.
`NEXT_PUBLIC_UPLOAD_ENABLED=true` reveals the upload form.

## Layout

```
src/domain/       Pure, serializable, zod-validated types and logic. No React,
                  no browser APIs, no I/O. Fully unit-tested.
src/audio/        AudioEngine — the sole owner of every HTMLAudioElement.
src/scheduling/   Scheduler — the sole owner of the clock and running schedules.
src/persistence/  Versioned, schema-validated localStorage access.
src/server/       Server actions; the only place that touches @vercel/blob.
src/features/     UI, grouped by feature. Components and hooks colocated.
src/components/ui shadcn primitives. Vendor code — excluded from lint.
src/app/          Next routes and providers only.
```

Dependencies point inward: `features → domain`, never the reverse. Domain
modules import nothing from `features`, `app`, or `server`.

## Rules that exist for a reason

**Schedules store an absolute deadline (`firesAt`), never a countdown.**
Remaining time is derived from `Date.now()`. Browsers throttle timers in
background tabs to as little as once a minute, so anything that decrements a
counter per tick silently stops keeping time when the tab loses focus. Deadlines
make throttling affect only the countdown's refresh rate. `Scheduler` resyncs on
`visibilitychange`/`focus`, and `advance()` collapses deadlines missed during a
suspension into a single firing. See `src/scheduling/scheduler.test.ts`.

**Domain objects must stay serializable.** Icons are a `SoundIconKey` string
resolved to a component in `src/features/sounds/sound-icon.tsx`. Never put a
`ReactNode` in a domain type — flows and favourites persist to localStorage.

**The AudioEngine lives outside React.** Its event handlers read engine state
directly, so they cannot capture a stale render. React subscribes through
`useSyncExternalStore` (`src/lib/use-store.ts`). Never create an
`HTMLAudioElement` in a component.

**State is replaced, never mutated.** `createExternalStore` skips notifying
subscribers when an updater returns the same reference, which is what keeps the
scheduler's twice-a-second tick from re-rendering the board.

**Ids are branded** (`SoundId`, `ScheduleId`). Look sounds up by id, never by
display name.

**Anything crossing a trust boundary is parsed with zod** — server action input,
localStorage reads, form values.
