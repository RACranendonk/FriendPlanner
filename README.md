# 🧭 FriendPlanner

Plan holiday activities with your friend group — hikes, museums, dinners — and see who joins what,
even when the group splits up.

**No accounts. No server of our own. No readable data anywhere.** The plan lives in your own
browser; syncing happens through encrypted blobs that only people with the group passphrase can
read.

## How it works

0. Curious first? **"Try a demo trip"** on the home screen loads a sample plan with fictional
   friends — safe to edit and delete, and it behaves like any real trip (sync included).
1. One person creates a trip and picks a **group passphrase** (share it in person or in your chat).
2. Add activities: what, which day, morning/afternoon/evening, a Google Maps or Komoot link, notes.
3. Everyone taps **"I'm in"** on the activities they want to join. If someone drops out of the
   trip, remove them from the **"Who's in"** list — their participation disappears everywhere,
   but every activity they suggested stays in the plan.
4. Hit **Share** — the app packs the entire plan into one encrypted link. Paste it in the group
   chat **once**: friends open it and enter the passphrase to join the trip.
5. From then on, changes sync automatically: live while the page is open, or on the next refresh.
   Concurrent edits merge (newer edit wins, participant lists combine, deletions stick).

Syncing works by publishing the end-to-end-encrypted plan (AES-GCM, key derived from the
passphrase with PBKDF2) to a handful of free public relay servers (the open
[Nostr](https://nostr.com) relay network). Relays only ever store ciphertext they cannot read, and
updates are signed with a key derived from the trip + passphrase, so relays can't tamper with or
forge a plan — only passphrase holders can. Every device keeps the full plan in localStorage; the
relays are just the messenger, and the share-link flow keeps working as a fallback if they're
unreachable (the link's `#…` part is never sent to any server).

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # unit tests (crypto, share tokens, merge logic)
npm run build    # type-check + production build in dist/
```

Built with Vite + React + TypeScript. Pushing to `main` deploys to GitHub Pages via
`.github/workflows/deploy.yml` (set the repo's Pages source to "GitHub Actions" once).

## Caveats

- Everything is only as secure as the passphrase — pick a phrase outsiders can't guess.
- Public relays are best-effort infrastructure: they may be slow, drop old data, or disappear.
  That's fine — every device holds the full plan and re-seeds the relays on the next edit, and
  manual link sharing always works as fallback.
- Relays see connection metadata (your IP, update timestamps, blob size) but never plan content,
  names, or who's in the group.
- Clearing browser data deletes your local copy; rejoin via any shared link or wait for a friend's
  next sync.
