import { useState } from 'react';
import type { BringItem, Trip } from '../types';

/**
 * What's coming from home — scale, salt & pepper, board games. Grocery-style
 * list, but instead of crossing off, items get claimed ("I'll bring it").
 * Unclaimed items sort first: they're the open questions.
 */
export function BringSection({
  trip,
  me,
  onUpdate,
}: {
  trip: Trip;
  me: string;
  onUpdate: (trip: Trip) => void;
}) {
  const [text, setText] = useState('');
  const [quantity, setQuantity] = useState('');

  const items = (trip.bring ?? [])
    .filter((b) => !b.deleted)
    .sort((a, b) => (a.broughtBy ? 1 : 0) - (b.broughtBy ? 1 : 0) || a.createdAt - b.createdAt);

  const save = (bring: BringItem[]) => onUpdate({ ...trip, bring });

  const add = () => {
    if (!text.trim() || !me) return;
    const now = Date.now();
    save([
      ...(trip.bring ?? []),
      {
        id: crypto.randomUUID(),
        text: text.trim(),
        quantity: quantity.trim(),
        addedBy: me,
        broughtBy: '',
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setText('');
    setQuantity('');
  };

  const setBringer = (item: BringItem, person: string) => {
    save(
      (trip.bring ?? []).map((b) => (b.id === item.id ? { ...b, broughtBy: person, updatedAt: Date.now() } : b)),
    );
  };

  const remove = (item: BringItem) => {
    if (!confirm(`Remove "${item.text}" from the list (for everyone)?`)) return;
    save((trip.bring ?? []).map((b) => (b.id === item.id ? { ...b, deleted: true, updatedAt: Date.now() } : b)));
  };

  return (
    <section className="card">
      <h2>Bringing from home</h2>
      <div className="grocery-add">
        <input
          value={text}
          placeholder={me ? 'e.g. Kitchen scale' : 'Enter your name above to add items'}
          disabled={!me}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <input
          className="grocery-qty"
          value={quantity}
          placeholder="Detail (optional)"
          disabled={!me}
          onChange={(e) => setQuantity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="primary" disabled={!me || !text.trim()} onClick={add}>
          Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="muted small">What's coming from home? Scale, salt &amp; pepper, board games… 🎒</p>
      ) : (
        <ul className="grocery-list">
          {items.map((item) => (
            <li key={item.id}>
              <div className="bring-row">
                <span className="grocery-text">
                  {item.text}
                  {item.quantity && <span className="chip">{item.quantity}</span>}
                </span>
                {item.broughtBy ? (
                  <button
                    className="chip person bring-claim"
                    title={item.broughtBy === me ? 'Tap to unclaim' : `${item.broughtBy} is bringing this`}
                    onClick={() => setBringer(item, item.broughtBy === me ? '' : item.broughtBy)}
                  >
                    🎒 {item.broughtBy}
                  </button>
                ) : (
                  <button className="ghost" disabled={!me} onClick={() => setBringer(item, me)}>
                    I'll bring it
                  </button>
                )}
                <button className="ghost danger chip-x" title="Remove" onClick={() => remove(item)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
