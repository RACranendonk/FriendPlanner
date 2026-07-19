import { useState } from 'react';
import type { Activity, Category, Slot, Trip } from '../types';
import { CATEGORIES, SLOTS, formatDay, tripDays } from '../types';

export function ActivityForm({
  trip,
  me,
  initial,
  onSave,
  onCancel,
}: {
  trip: Trip;
  me: string;
  initial: Activity | null;
  onSave: (act: Activity) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'other');
  const [day, setDay] = useState(initial?.day ?? '');
  const [slot, setSlot] = useState<Slot>(initial?.slot ?? 'allday');
  const [locationName, setLocationName] = useState(initial?.locationName ?? '');
  const [locationUrl, setLocationUrl] = useState(initial?.locationUrl ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      category,
      day: day || null,
      slot,
      locationName: locationName.trim(),
      locationUrl: locationUrl.trim(),
      notes: notes.trim(),
      votes: initial?.votes ?? (me ? { [me]: { in: true, ts: Date.now() } } : {}),
      createdBy: initial?.createdBy ?? me,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal form">
        <h2>{initial ? 'Edit activity' : 'New activity'}</h2>
        <label className="field">
          <span>What?</span>
          <input value={title} placeholder="e.g. Hike to Monte Ceceri" autoFocus onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="row">
          <label className="field">
            <span>Type</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {Object.entries(CATEGORIES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.emoji} {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>When?</span>
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="">Sometime during the trip</option>
              {tripDays(trip).map((d) => (
                <option key={d} value={d}>
                  {formatDay(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Time of day</span>
            <select value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
              {Object.entries(SLOTS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Place (shown as an inline map)</span>
          <input
            value={locationName}
            placeholder="e.g. Uffizi Gallery, Florence"
            onChange={(e) => setLocationName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Activity link (Komoot route, tickets, website…)</span>
          <input
            value={locationUrl}
            placeholder="https://…"
            inputMode="url"
            onChange={(e) => setLocationUrl(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea
            rows={3}
            value={notes}
            placeholder="Costs, what to bring, why it's great…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div className="row">
          <button className="primary" disabled={!title.trim()} onClick={submit}>
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
