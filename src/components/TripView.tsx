import { useMemo, useRef, useState } from 'react';
import type { Activity, Trip } from '../types';
import { formatDay, tripDays } from '../types';
import { getName, getPassphrase, loadTrip, saveTrip, setName } from '../lib/storage';
import { mergeTrips, sameTrip } from '../lib/merge';
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

  const groups = useMemo(() => {
    if (!trip) return [];
    const active = trip.activities.filter((a) => !a.deleted);
    const days = tripDays(trip);
    const extraDays = [...new Set(active.map((a) => a.day).filter((d): d is string => !!d && !days.includes(d)))].sort();
    const slotOrder: Record<string, number> = { allday: 0, morning: 1, afternoon: 2, evening: 3 };
    const byDay = (day: string | null) =>
      active
        .filter((a) => a.day === day)
        .sort((a, b) => slotOrder[a.slot] - slotOrder[b.slot] || a.title.localeCompare(b.title));
    return [
      ...[...days, ...extraDays].map((day) => ({ day, label: formatDay(day), items: byDay(day) })),
      { day: null, label: 'Sometime during the trip', items: byDay(null) },
    ];
  }, [trip]);

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
                <p className="muted small">Nothing planned yet.</p>
              ) : (
                group.items.map((act) => (
                  <ActivityCard
                    key={act.id}
                    activity={act}
                    me={me.trim()}
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

      {sharing && <ShareDialog trip={trip} onMerged={update} onClose={() => setSharing(false)} />}
    </div>
  );
}
