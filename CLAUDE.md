# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FriendPlanner (remote: `https://github.com/RACranendonk/FriendPlanner`) is a personal side-project:
a web app for Robert's friend group to plan holiday activities together — who joins which hike,
museum visit, or dinner, including when the group splits up. Live at
`https://racranendonk.github.io/FriendPlanner/` once deployed.

## Product invariants — do not violate

- **No backend of our own, ever (for now).** The app is a static site on GitHub Pages. No server
  storage we operate, no databases, no accounts with third-party data services. Robert explicitly
  does not want responsibility for storing anyone's data.
- **Nothing readable ever leaves the group's devices.** localStorage holds each device's copy;
  sync happens via the end-to-end-encrypted trip token — in share-links (URL *fragment* `#…`,
  never sent to servers) and as ciphertext blobs published to public Nostr relays. Relays are
  best-effort commodity infrastructure: they may only ever receive ciphertext, and the app must
  keep working (local copy + manual links) when they're down.
- **No accounts or login.** Access to a plan is gated only by a pre-shared group passphrase
  (PBKDF2 → AES-GCM for content; the same passphrase derives the trip's Nostr keypair, so knowing
  it is also what authorizes publishing updates). Only people who know each other in real life
  share the passphrase.
- The share-link flow is the invite mechanism and the fallback — never remove it in favor of
  relay-only sync.

## Stack & architecture

Vite + React + TypeScript, plain CSS (`src/styles.css`; warm light/dark palettes — dark applies
via `prefers-color-scheme` unless the in-app toggle (`src/lib/theme.ts`, `fp.theme` in
localStorage, `data-theme` on `<html>`) forces one; the two dark variable blocks must stay in
sync).
No state-management or UI libraries — keep the dependency count low. Runtime deps beyond React:
`@noble/curves` (Schnorr signatures for relay events) and `leaflet` (maps — OpenStreetMap tiles
and Nominatim geocoding, both keyless public OSM infrastructure in the same commodity category as
the relays).

- `src/types.ts` — `Trip`/`Activity`/`Vote` model plus category/slot constants and date helpers.
  Votes are per-person `{in, ts}` records so merges keep each person's latest choice.
- `src/lib/crypto.ts` — JSON → deflate → AES-GCM (key from passphrase via PBKDF2, fresh salt/iv
  per token) → base64url. Requires a secure context (localhost or HTTPS; `file://` won't work).
- `src/lib/share.ts` — `FP1_`-prefixed token pack/unpack, token extraction from pasted text.
- `src/lib/nostr.ts` — minimal NIP-01/NIP-78 implementation: deterministic trip keypair
  (PBKDF2 from tripId+passphrase → secp256k1 Schnorr via `@noble/curves`; every member derives
  the *same* keypair, making relay events replaceable per trip), event build/sign/verify,
  relay list. Kind 30078, d-tag `friendplanner`.
- `src/lib/sync.ts` — `TripSync`: websocket client for the relays (subscribe → verify → decrypt →
  `onRemote`; debounced publish to all connected relays; reconnect with backoff).
- `src/lib/useTripSync.ts` — React hook wrapping `TripSync`; no-op without a stored passphrase.
- `src/lib/merge.ts` — merges two copies of a trip: newer activity edit wins, votes merge
  per-person by timestamp, deletions survive via tombstones (`deleted: true`, never hard-remove).
- `src/lib/grouping.ts` — trip-view day grouping: unscheduled bucket first, popularity-first sort
  within a group, unique-winner `topId` for the subtle highlight.
- `src/lib/linkinfo.ts` — labels activity links by target site (Komoot/Google Maps/…, hostname
  fallback); normalizes bare domains to https and rejects non-web schemes.
- `src/lib/geo.ts` — coordinate parsing from Google Maps URLs, Nominatim geocoding. Pins live as
  optional `lat`/`lng` on Activity, so they sync like any other field.
- `src/components/MapView.tsx` — Leaflet wrapper (emoji divIcon pins, safe DOM-built popups,
  optional tap-to-pick). Used by the trip map, the card mini-map, and the form's pin picker.
- `src/components/Llama.tsx` — easter egg: tap the title compass 5× quickly and a llama backflips
  across the page (pure CSS, reduced-motion-aware). Deliberately not in the README — no spoilers.
- `src/lib/participation.ts` — who's-in listing and merge-safe withdrawal (in:false tombstone
  votes, never entry deletion — see the merge-safety comment there before changing it).
- `src/lib/storage.ts` — localStorage wrapper (`fp.*` keys: name, trip index, trips, passphrases).
- `src/components/` — `Home` (trip list/create/join), `JoinGate` (passphrase entry for a shared
  link), `TripView` (day-grouped activity list), `ActivityCard`/`ActivityForm`, `ShareDialog`
  (link generation + merge-an-update). `App.tsx` does hash-based routing: a `#FP1_…` fragment
  routes to `JoinGate`.

Bumping `updatedAt`: activity edits set it; **vote toggles deliberately don't** (votes carry their
own timestamps), so a vote never clobbers someone's concurrent edit of the same activity in a merge.

## Commands

```sh
npm run dev    # dev server at http://localhost:5173/FriendPlanner/
npm test       # vitest unit tests (src/lib/*.test.ts)
npm run build  # tsc --noEmit type-check + vite production build
```

CI/deploy (`.github/workflows/deploy.yml`) runs tests + build on every push to `main` and deploys
`dist/` to GitHub Pages. It's a backstop, not the primary gate — see below.

## Development workflow

Robert is the sole developer — no branch/PR ceremony, **commit directly to `main`.** Local
validation is the actual gate (CI double-checks after the fact):

0. **New feature? Open a GitHub issue first** (`gh issue create`), describing what's being built
   and why, before writing code. Small fixes/chores don't need one.
   - **Label every issue** with its type (`bug`, `enhancement`, `documentation`, `question`, or
     `research` for investigation-only spikes), add `in progress` while work is actively underway
     (remove it on close), and add `friend-request` when the idea came from someone in the group —
     one generic label, never per-person labels or names (see the no-personal-data rule below).
     `needs-verification` marks issues opened by people outside the group once the repo is public.
   - **Prefix issue titles with the area** they touch (e.g. `Share:`, `Merge:`, `UI:`, `Docs:`,
     `Build:`) so the issue list scans at a glance.
1. Before committing, run `npm test` and `npm run build` locally and confirm both are clean.
2. **New feature → add or extend tests that actually exercise it**, and check whether
   `.github/workflows/deploy.yml` needs updating. CI passing must mean the new code was actually
   checked — a green pipeline that never touches the new feature is a false signal.
3. **Every significant change to the app → update `README.md` in the same commit.** The README
   is purely user-facing (what the app does, how a group uses it, the privacy model) — it
   deliberately has **no development chapter**; dev commands and architecture live here in
   CLAUDE.md. Keep it accurate to what the deployed page actually does; it goes stale silently
   if it isn't part of the definition of done. Purely internal refactors don't need it.
4. Commit with clear, descriptive messages explaining *why*, not just what, and **reference the
   issue** (`Refs #N`, or `Closes #N` once the feature is complete).
5. **Re-run tests and build right before pushing** (not just before the first commit), then push
   to `main` and confirm CI comes back green. Close the issue if the commit didn't auto-close it.
5a. **When an issue is resolved, leave a succinct resolution comment on it** (`gh issue comment`):
   the commit hash and a short bullet list of the steps taken — what was added/changed where, and
   how it was validated. The issue thread should tell its own story without opening the diff.
6. **Meaningful versions get a tagged release**: bump `package.json`'s version, tag `vX.Y.Z`, and
   publish a GitHub release (`gh release create`) with short notes on what changed for users.
   Not every push is a release — a release marks a coherent, tell-the-group-about-it milestone.

No secrets or personal data in commits: no tokens or API keys, and no real trip data, passphrases,
or friends' names — tests and docs use clearly fake placeholders.

Code comments: only where the *why* isn't obvious from the code (a non-obvious constraint, a
workaround, a subtle invariant) — never restating what well-named code already says.
