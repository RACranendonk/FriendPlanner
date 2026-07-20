# 🧭 FriendPlanner

**Plan holiday activities with your friend group — no accounts, no sign-ups, no company storing
your data.**

Live at **https://racranendonk.github.io/FriendPlanner/** · Curious? Hit **"Try a demo trip"** on
the home screen for a ready-made sample you can safely poke around in — it stays entirely on your
device and is never shared or synced.

Some of you want to hike, others want museums, and half the group decides at breakfast.
FriendPlanner keeps the plan in one place: everyone sees the ideas, taps **"I'm in"** on what they
like, and the group can see at a glance who's going where — including when you split up.

## What's in it

- **Trips** — a name, a destination, a date range, an optional description, and one shared
  passphrase for the group. Typo in the name, dates shifted, or something to tell the group up
  front? The ✏️ next to the trip title edits all of it later — and shrinking the dates never
  loses activities, anything planned outside the new range stays in the plan under its own day.
- **Activities** — title, category (🥾 hike, 🏛️ culture, 🍽️ food, 🏖️ beach, 🚵 sport,
  🌙 nightlife), day and time of day — plus an exact departure time once one is agreed
  ("Morning · 08:30") — notes, a place, and a link (Komoot, tickets, a website — shown labeled by
  where it leads, so a tap never surprises).
- **Voting** — tap "I'm in" to join an activity. Every card shows who's going and a count; the
  most popular activity floats to the top of each day and a clear winner gets a highlighted card.
- **Comments** — every activity and stay option has its own little 💬 thread. Ask "what is
  this?", get an answer next to the question — nobody has to edit over anyone's notes, and every
  remark shows who wrote it.
- **Ideas pile** — activities without a day yet sit at the top of the plan: they're the ones that
  still need a decision.
- **Planning tab** — before the activities, decide the trip itself: collect accommodation
  candidates (Airbnb, Booking, anything with a link), rate each option on a five-point scale
  (🤮 to 😍, with the group average shown), discuss in comments, and crown the winner with a 🏆
  when it's settled. Lives in its own tab so the
  activity schedule stays front and center. The same tab holds the **bringing-from-home list**:
  the scale, the salt & pepper, the board games — anyone can add what's needed, and a tap on
  "I'll bring it" claims it (🎒) so nothing arrives in fivefold or not at all.
- **Groceries tab** — a shared shopping list: add what the house needs (with a quantity), see who
  asked for it, cross things off as they're bought (or uncross them), and clear the bought ones
  after a run.
- **Trip map** — pin activities to a map (paste a Google Maps link, use "Find on map", or tap to
  place the pin) and see every pin together: tap one for the activity, its day, and who's going.
  A pinned activity also gets a 🧭 button that opens your phone's navigation app for turn-by-turn
  directions there.
- **Who's in** — everyone who's opened the trip or joined an activity, seen at a glance. If
  someone drops out, remove them: their "I'm in"s and their spot on this list disappear, but every
  idea they contributed stays.
- **Your look** — follows your phone's light/dark setting by default; the 🌗 button switches
  between light, dark, and follow-device whenever you prefer otherwise. Activity cards carry a
  color edge per category, so a hike day and a museum day look different at a glance.
- **Add to calendar** — planned activities have a 📅 button that opens a prefilled Google
  Calendar event (uses the departure time when set, otherwise a sensible window for the time of
  day).
- **Live sharing** — invite the group with one link and the plan stays in sync by itself:
  open tabs update within seconds, otherwise the next refresh catches up. Simultaneous edits
  merge sensibly (adding never conflicts; votes are per-person; deletions stick).

## Getting started

1. One person opens the app, creates the trip, and picks a **group passphrase**.
2. Hit **Share** and paste the short invite link in your group chat, and tell everyone the
   passphrase (in person, or however you like). The Share dialog also offers a longer "backup
   link" that carries the whole plan inside it — a good safety copy for the chat now and then.
3. Friends open the link, enter their name and the passphrase — that's it, no account, nothing to
   install. Everyone can now add ideas, vote, and edit.
4. On the trip, check the app at breakfast: the day's plan, who's joining what, and the map are
   always current.

## Privacy & security

FriendPlanner is built so that **nobody — including the people running the app — can read your
plans**:

- The plan lives in your own browser on your own device. There is no FriendPlanner server and no
  account anywhere.
- Syncing works by passing around an **end-to-end encrypted** copy of the plan (AES-GCM, key
  derived from your group passphrase). It travels through public relay servers that only ever see
  unreadable ciphertext — and cryptographically *cannot* alter or fake a plan, only deliver it.
- Share links carry the encrypted plan in the part after `#`, which browsers never send to any
  server.
- The map is drawn from OpenStreetMap; like any map site, their servers see your IP and searched
  place names — but never your plans, notes, or names.
- Everything stands or falls with the passphrase: pick one outsiders can't guess, and share it
  only with the group.

## How the plan travels

There's no FriendPlanner server — so how does your edit show up on everyone else's phone?

- **Your device is the source of truth.** The complete plan lives in your own browser. The app
  always shows your local copy, so it opens instantly and works even with no connection at all.
- **Changes travel as sealed envelopes.** When you change something, your browser encrypts the
  whole plan using the group passphrase and sends the resulting unreadable blob to a handful of
  public **Nostr relays** — open message-relay servers on the internet that anyone can use, a bit
  like leaving a locked box at a few post offices. The app never trusts them with anything
  readable.
- **The group listens at the same mailbox.** The passphrase also determines the trip's address on
  those relays. Everyone else's device watches that address, picks up the newest envelope, opens
  it with the passphrase, and merges it into their own copy — that's the whole sync.
- **Relays can't read, fake, or tamper — only deliver.** Every update is signed with a key that
  can only be derived from the passphrase, and every device checks that signature before
  accepting anything. A misbehaving relay could at worst be offline or lose data; it can never
  read your plan or slip in a fake one.
- **Invite links work the same way, without the relays.** A share link carries an encrypted copy
  of the plan in the part after `#`, which your browser never sends to any server — the recipient
  unlocks it with the passphrase. So even if every relay disappeared, the plan still lives on
  every device and can still be passed around by link.

## Good to know

- Clearing your browser data deletes your local copy — rejoin with any shared link, or simply
  wait for the next sync from a friend.
- The public relays are best-effort infrastructure. If they're ever unreachable or drop old data,
  nothing is lost: every device holds the full plan, and whenever someone opens a trip whose
  shared copy has gone missing or is more than a week old, the app quietly re-uploads it. The
  Share dialog's link flow works as a manual fallback — and dropping a backup link in the chat
  after a big planning session is cheap insurance for long-dormant trips.
- Editing the *same* activity at the same moment: the newer edit wins. Adding, voting, and
  deleting never conflict.
