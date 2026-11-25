# Integration: remove automatic Verify from Possession Mode

Integrated directly on `main`, 25 Nov 2026, per `team-rules.md` ("Verify starts when a person presses it").

## What was found

`PossessionJourney.tsx` unconditionally rendered `<AutoLoopCard recipient="" />` on the Possession page.
`AutoLoopCard` (`dashboard/src/components/AutoLoopCard.tsx`) uses `useAutoLoop` (`dashboard/src/loop/useAutoLoop.ts`),
whose `approve()` function calls `POST /fixes/{id}/approve` and then, in the same call, immediately and
automatically calls `POST /fixes/{id}/verify` with no separate user action in between:

```ts
const approve = useCallback(async (fix: Fix) => {
  ...
  const ok = await call(`/fixes/${fix.fix_id}/approve`, { diff_sha256: fix.diff_sha256 });
  const v = await call(`/fixes/${fix.fix_id}/verify`, {}); // <- fires right after approve, no separate press
  ...
```

This violates the Manual Verify rule: Verify must require its own explicit user action, separate from Approve.

## What was checked and is *not* affected

The production Fix pages (`dashboard/src/components/FixPanels.tsx`, `dashboard/src/fixes/FixProvider.tsx`,
used at `/app/fixes/verify`) already do this correctly: `approve` and `verify` are two separate functions
on `FixContext`, each wired to its own button (`Approve Fix`, then a distinct `Verify on a patched copy`).
No automatic chaining exists there. This was confirmed by reading `FixProvider.tsx` and by the existing test
`fix-panels.test.tsx`, and made explicit with a new test (below) that asserts no `POST /fixes/{id}/verify`
call happens until that second button is pressed.

## What changed

- `dashboard/src/components/PossessionJourney.tsx`: removed the `<AutoLoopCard recipient="" />` render and
  its now-unused import. **`AutoLoopCard.tsx` and `useAutoLoop.ts` are both kept, unmodified, as source
  files** (coordinator's instruction): only the render site on Possession Mode is removed, not the
  component or the hook. `AutoLoopCard`'s own isolated test (`auto-loop.test.tsx`) is untouched and still
  passes, since it renders the component directly rather than through Possession Mode.
- `dashboard/src/test/possession-no-autoloop.test.tsx` (new): asserts "Run the whole loop" (AutoLoopCard's
  own heading and button) does not render on either Possession Mode or the Try page.
- `dashboard/src/test/fix-panels.test.tsx`: new test asserting the real Fix-page flow requires an explicit
  second press — after Approve, no `POST /fixes/{id}/verify` call has happened; only after clicking
  "Verify on a patched copy" does that call occur.

## Tests

- `cd dashboard && npx tsc --noEmit`: clean.
- `cd dashboard && npx vitest run`: 24 files, 169 tests pass (was 166 before this change: 3 new).
- `auto-loop.test.tsx` (AutoLoopCard's own test, unaffected by the render-site removal): 3/3 still pass.

## Not done

- `useAutoLoop`'s internal auto-chaining (`approve()` calling `verify()` automatically) is unchanged inside
  the file itself, since the instruction was to stop rendering the card, not to edit its logic. If
  `AutoLoopCard` is ever rendered again anywhere, this auto-chain would still fire; flagging this for
  whoever revisits that component.
