import { useMemo, useRef, useState } from 'react';
import type { Activity, Trip } from '../types';
import { CATEGORIES, SLOTS, formatDay } from '../types';
import { goingNames, groupActivities } from '../lib/grouping';
import { MapView, type MapPin } from './MapView';
import { googleCalendarUrl } from '../lib/calendar';
import { StaysSection } from './StaysSection';
import { ThemeToggle } from './ThemeToggle';
import { Credits } from './Credits';
import { getName, getPassphrase, loadTrip, saveTrip, setName } from '../lib/storage';
import { mergeTrips, sameTrip } from '../lib/merge';
import { listParticipants, withdrawParticipation } from '../lib/participation';
import { useTripSync } from '../lib/useTripSync';
import { ActivityCard } from './ActivityCard';
import { ActivityForm } from './ActivityForm';
import { ShareDialog } from './ShareDialog';

export function TripView({ tripId, onBack }: { tripId: string; onBack: () => void }) {
  const [trip, setTrip] = useState<Trip | null>(() => loadTrip(tripId));
  const [me, setMe] = useState(getName());
  const [editing, setEditing] = useState<Activity | 'new' | null>(null);
  const [sharing, setSharing] = useState(false);

  const passphrase = useMemo(() => getPassphrase(tripId), [tripId]);
  const tripRef = useRef(trip);
  tripRef.current = trip;

  const sync = useTripSync(tripId, passphrase, (incoming) => {
    const current = tripRef.current;
    const merged = current ? mergeTrips(current, incoming) : incoming;
    if (!current || !sameTrip(merged, current)) {
      saveTrip(merged);
      setTrip(merged);
    }
    // We hold changes the relays haven't seen (or they only had an older
    // version) — publish the merged state so everyone converges.
    if (!sameTrip(merged, incoming)) sync.publish(merged);
  });

  const groups = useMemo(() => (trip ? groupActivities(trip) : []), [trip]);
  const [showTripMap, setShowTripMap] = useState(false);
  const pins = useMemo<MapPin[]>(
    () =>
      (trip?.activities ?? [])
        .filter((a) => !a.deleted && a.lat != null && a.lng != null)
        .map((a) => ({
          id: a.id,
          lat: a.lat!,
          lng: a.lng!,
          emoji: CATEGORIES[a.category].emoji,
          title: a.title,
          subtitle:
            `${a.day ? formatDay(a.day) : 'Sometime during the trip'} · ${SLOTS[a.slot]}` +
            (goingNames(a).length > 0 ? ` · ${goingNames(a).join(', ')}` : ''),
        })),
    [trip],
  );

  if (!trip) {
    return (
      <div className="page narrow">
        <p>This trip isn't on this device (anymore).</p>
        <button onClick={onBack}>← Back</button>
      </div>
    );
  }

  const update = (next: Trip) => {
    const stamped = { ...next, updatedAt: Date.now() };
    saveTrip(stamped);
    setTrip(stamped);
    sync.publish(stamped);
  };

  const upsertActivity = (act: Activity) => {
    update({ ...trip, activities: [...trip.activities.filter((a) => a.id !== act.id), act] });
  };

  const toggleVote = (act: Activity) => {
    const person = me.trim();
    if (!person) return;
    const currentlyIn = act.votes[person]?.in ?? false;
    // Deliberately leaves act.updatedAt alone: votes carry their own timestamps,
    // so a vote never clobbers someone else's concurrent edit of the activity.
    upsertActivity({ ...act, votes: { ...act.votes, [person]: { in: !currentlyIn, ts: Date.now() } } });
  };

  const removeActivity = (act: Activity) => {
    if (!confirm(`Delete "${act.title}" for everyone (after you share the update)?`)) return;
    upsertActivity({ ...act, deleted: true, updatedAt: Date.now() });
  };

  const saveMyName = (value: string) => {
    setMe(value);
    setName(value);
  };

  const participants = listParticipants(trip);

  const removeParticipation = (person: string) => {
    const label = person === me.trim() ? 'Leave all activities you joined?' : `Remove ${person} from everything they joined?`;
    if (!confirm(`${label} Activities they suggested stay in the plan.`)) return;
    update(withdrawParticipation(trip, person));
  };

  return (
    <div className="page">
      <header className="trip-header">
        <button className="ghost" onClick={onBack}>
          ← Trips
        </button>
        <div className="trip-title">
          <h1>{trip.name}</h1>
          <p className="muted">
            {trip.destination && `${trip.destination} · `}
            {formatDay(trip.start)} – {formatDay(trip.end)}
            {' · '}
            {sync.connected > 0 ? (
              <span className="sync-status ok" title={`Connected to ${sync.connected} of ${sync.total} relays`}>
                ● synced
              </span>
            ) : passphrase ? (
              <span className="sync-status" title="No relay connection — your local copy still works; share a link as fallback">
                ○ offline
              </span>
            ) : null}
          </p>
        </div>
        <ThemeToggle />
        <button className="primary" onClick={() => setSharing(true)}>
          Share
        </button>
      </header>

      {!me.trim() && (
        <section className="card highlight">
          <label className="field">
            <span>Enter your name to join activities</span>
            <input value={me} placeholder="e.g. Robert" onChange={(e) => saveMyName(e.target.value)} />
          </label>
        </section>
      )}

      <StaysSection trip={trip} me={me.trim()} onUpdate={update} />

      <section className="card">
        <div className="section-head">
          <h2>Trip map</h2>
          <button className="ghost" onClick={() => setShowTripMap((v) => !v)}>
            {showTripMap ? 'Hide' : `Show map (${pins.length} pinned)`}
          </button>
        </div>
        {showTripMap &&
          (pins.length > 0 ? (
            <MapView pins={pins} height={380} />
          ) : (
            <p className="muted small">
              No pinned activities yet — use "Find on map" when adding or editing an activity.
            </p>
          ))}
      </section>

      {participants.length > 0 && (
        <section className="card">
          <h2>Who's in</h2>
          <div className="going-row">
            {participants.map((person) => (
              <span key={person} className={`chip person ${person === me.trim() ? 'is-me' : ''}`}>
                {person}
                <button
                  className="chip-x"
                  title={`Remove ${person}'s participation (their suggestions stay)`}
                  onClick={() => removeParticipation(person)}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <p className="muted small">
            Removing someone clears their "I'm in" everywhere — activities they suggested stay in the plan.
          </p>
        </section>
      )}

      <div className="toolbar">
        <button className="primary wide" onClick={() => setEditing('new')}>
          ＋ Add activity
        </button>
      </div>

      {groups.map(
        (group) =>
          (group.items.length > 0 || group.day !== null) && (
            <section key={group.day ?? 'unscheduled'} className="day-group">
              <h2>{group.label}</h2>
              {group.items.length === 0 ? (
                <p className="muted small">Nothing here yet — toss in an idea ✨</p>
              ) : (
                group.items.map((act) => (
                  <ActivityCard
                    key={act.id}
                    activity={act}
                    me={me.trim()}
                    highlight={act.id === group.topId}
                    calendarUrl={googleCalendarUrl(trip, act)}
                    onToggle={() => toggleVote(act)}
                    onEdit={() => setEditing(act)}
                    onDelete={() => removeActivity(act)}
                  />
                ))
              )}
            </section>
          ),
      )}

      {editing && (
        <ActivityForm
          trip={trip}
          me={me.trim()}
          initial={editing === 'new' ? null : editing}
          onSave={(act) => {
            upsertActivity(act);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <footer>
        <Credits />
      </footer>

      {sharing && (
        <ShareDialog
          trip={trip}
          onMerged={update}
          onEnsurePublished={() => sync.publish(trip)}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}
