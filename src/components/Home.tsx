import { useState } from 'react';
import type { Trip } from '../types';
import { formatDay } from '../types';
import { extractToken } from '../lib/share';
import { deleteTrip, getName, listTripIds, loadTrip, saveTrip, setName, setPassphrase } from '../lib/storage';

export function Home({
  onOpenTrip,
  onJoinToken,
}: {
  onOpenTrip: (id: string) => void;
  onJoinToken: (token: string) => void;
}) {
  const [name, setNameState] = useState(getName());
  const [trips, setTrips] = useState<Trip[]>(() =>
    listTripIds()
      .map(loadTrip)
      .filter((t): t is Trip => t !== null),
  );
  const [creating, setCreating] = useState(false);
  const [joinText, setJoinText] = useState('');
  const [joinError, setJoinError] = useState('');

  const saveName = (value: string) => {
    setNameState(value);
    setName(value);
  };

  const handleJoin = () => {
    const token = extractToken(joinText);
    if (!token) {
      setJoinError("That doesn't look like a FriendPlanner link — paste the whole message.");
      return;
    }
    onJoinToken(token);
  };

  const handleDelete = (trip: Trip) => {
    if (!confirm(`Remove "${trip.name}" from this device? Anyone with a shared link still has their copy.`)) return;
    deleteTrip(trip.id);
    setTrips((prev) => prev.filter((t) => t.id !== trip.id));
  };

  return (
    <div className="page">
      <header className="hero">
        <h1>🧭 FriendPlanner</h1>
        <p className="muted">
          Plan holiday activities together — no accounts, no servers, everything stays with your group.
        </p>
      </header>

      <section className="card">
        <label className="field">
          <span>Your name (how friends will see you)</span>
          <input
            type="text"
            value={name}
            placeholder="e.g. Robert"
            onChange={(e) => saveName(e.target.value)}
          />
        </label>
      </section>

      {trips.length > 0 && (
        <section>
          <h2>Your trips</h2>
          <ul className="trip-list">
            {trips.map((trip) => (
              <li key={trip.id} className="card trip-item">
                <button className="trip-open" onClick={() => onOpenTrip(trip.id)}>
                  <strong>{trip.name}</strong>
                  <span className="muted">
                    {trip.destination && `${trip.destination} · `}
                    {formatDay(trip.start)} – {formatDay(trip.end)} ·{' '}
                    {trip.activities.filter((a) => !a.deleted).length} activities
                  </span>
                </button>
                <button className="ghost danger" title="Remove from this device" onClick={() => handleDelete(trip)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Start a new trip</h2>
        {creating ? (
          <NewTripForm
            onCreate={(trip, passphrase) => {
              saveTrip(trip);
              setPassphrase(trip.id, passphrase);
              onOpenTrip(trip.id);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <button className="primary" onClick={() => setCreating(true)}>
            ＋ New trip
          </button>
        )}
      </section>

      <section className="card">
        <h2>Join a trip</h2>
        <p className="muted">Got a link from a friend? Opening it works directly — or paste it here.</p>
        <textarea
          rows={2}
          value={joinText}
          placeholder="Paste the shared link or message…"
          onChange={(e) => {
            setJoinText(e.target.value);
            setJoinError('');
          }}
        />
        {joinError && <p className="error">{joinError}</p>}
        <button onClick={handleJoin} disabled={!joinText.trim()}>
          Join
        </button>
      </section>

      <footer className="muted small">
        Your plans live only in this browser and in the encrypted links you share. Clearing browser data removes
        them — the latest shared link in your group chat is your backup.
      </footer>
    </div>
  );
}

function NewTripForm({
  onCreate,
  onCancel,
}: {
  onCreate: (trip: Trip, passphrase: string) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [passphrase, setPassphrase] = useState('');

  const valid = name.trim() && start && end && end >= start && passphrase.length >= 4;

  const submit = () => {
    if (!valid) return;
    onCreate(
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        destination: destination.trim(),
        start,
        end,
        updatedAt: Date.now(),
        activities: [],
      },
      passphrase,
    );
  };

  return (
    <div className="form">
      <label className="field">
        <span>Trip name</span>
        <input value={name} placeholder="e.g. Tuscany 2026" onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label className="field">
        <span>Destination (optional)</span>
        <input value={destination} placeholder="e.g. Florence, Italy" onChange={(e) => setDestination(e.target.value)} />
      </label>
      <div className="row">
        <label className="field">
          <span>First day</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          <span>Last day</span>
          <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Group passphrase (share it with your friends in person)</span>
        <input
          value={passphrase}
          placeholder="At least 4 characters — longer is safer"
          onChange={(e) => setPassphrase(e.target.value)}
        />
      </label>
      <div className="row">
        <button className="primary" disabled={!valid} onClick={submit}>
          Create trip
        </button>
        <button className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
