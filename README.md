# 🧭 FriendPlanner

Plan holiday activities with your friend group — hikes, museums, dinners — and see who joins what,
even when the group splits up.

**No accounts. No server. No stored data.** The whole plan lives in your own browser and in
encrypted links you paste into your group chat. Only people who know the group passphrase can read
them.

## How it works

1. One person creates a trip and picks a **group passphrase** (share it in person or in your chat).
2. Add activities: what, which day, morning/afternoon/evening, a Google Maps or Komoot link, notes.
3. Everyone taps **"I'm in"** on the activities they want to join.
4. Hit **Share** — the app packs the entire plan into one encrypted link. Paste it in the group chat.
5. Friends open the link, enter the passphrase, and get the plan merged into their own copy.
   Newer edits win; participant lists are combined.

The part of the link after `#` is never sent to any server — the plan is end-to-end encrypted
(AES-GCM, key derived from the passphrase with PBKDF2) and only ever decrypted on your devices.

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

- The link is only as secure as the passphrase — pick a phrase outsiders can't guess.
- Clearing browser data deletes your local copy; the newest link in your chat is the backup.
- Sync is turn-based, not live: share a fresh link after making changes.
