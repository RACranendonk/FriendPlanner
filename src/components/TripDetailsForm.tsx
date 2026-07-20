import { useState } from 'react';
import type { Trip } from '../types';

export function TripDetailsForm({
  trip,
  onSave,
  onCancel,
}: {
  trip: Trip;
  onSave: (trip: Trip) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(trip.name);
  const [destination, setDestination] = useState(trip.destination);
  const [start, setStart] = useState(trip.start);
  const [end, setEnd] = useState(trip.end);
  const [description, setDescription] = useState(trip.description ?? '');

  const valid = name.trim() && start && end && end >= start;

  const submit = () => {
    if (!valid) return;
    onSave({
      ...trip,
      name: name.trim(),
      destination: destination.trim(),
      start,
      end,
      description: description.trim() || undefined,
      metaUpdatedAt: Date.now(),
    });
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal form">
        <h2>Edit trip</h2>
        <label className="field">
          <span>Trip name</span>
          <input value={name} placeholder="e.g. Tuscany 2026" autoFocus onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Destination (optional)</span>
          <input
            value={destination}
            placeholder="e.g. Florence, Italy"
            onChange={(e) => setDestination(e.target.value)}
          />
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
          <span>Description (optional, shown under the trip name)</span>
          <textarea
            rows={3}
            value={description}
            placeholder="The plan in one breath — house rules, the vibe, what to book early…"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <p className="muted small">
          Changing the dates never loses activities — anything planned outside the new range stays in the plan
          under its own day.
        </p>
        <div className="row">
          <button className="primary" disabled={!valid} onClick={submit}>
            Save
          </button>
          <button className="ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
