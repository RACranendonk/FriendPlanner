# 🧭 FriendPlanner

**Plan holiday activities with your friend group — no accounts, no sign-ups, no company storing
your data.**

Live at **https://racranendonk.github.io/FriendPlanner/** · Curious? Hit **"Try a demo trip"** on
the home screen for a ready-made sample you can safely poke around in.

Some of you want to hike, others want museums, and half the group decides at breakfast.
FriendPlanner keeps the plan in one place: everyone sees the ideas, taps **"I'm in"** on what they
like, and the group can see at a glance who's going where — including when you split up.

## What's in it

- **Trips** — a name, a destination, a date range, and one shared passphrase for the group.
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
  (😖 to 😍, with the group average shown), discuss in comments, and crown the winner with a 🏆
  when it's settled. Lives in its own tab so the
  activity schedule stays front and center. The same tab holds the **bringing-from-home list**:
  the scale, the salt & pepper, the board games — anyone can add what's needed, and a tap on
  "I'll bring it" claims it (🎒) so nothing arrives in fivefold or not at all.
- **Groceries tab** — a shared shopping list: add what the house needs (with a quantity), see who
  asked for it, cross things off as they're bought (or uncross them), and clear the bought ones
  after a run.
- **Trip map** — pin activities to a map (paste a Google Maps link, use "Find on map", or tap to
  place the pin) and see every pin together: tap one for the activity, its day, and who's going.
- **Who's in** — the list of everyone participating. If someone drops out, remove them: their
  "I'm in"s disappear everywhere, but every idea they contributed stays.
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

## Good to know

- Clearing your browser data deletes your local copy — rejoin with any shared link, or simply
  wait for the next sync from a friend.
- The public relays are best-effort infrastructure. If they're ever unreachable, nothing is lost:
  every device holds the full plan, and the Share dialog's link flow works as a manual fallback.
- Editing the *same* activity at the same moment: the newer edit wins. Adding, voting, and
  deleting never conflict.
