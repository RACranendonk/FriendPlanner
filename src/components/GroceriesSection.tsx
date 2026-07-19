import { useState } from 'react';
import type { GroceryItem, Trip } from '../types';

/**
 * The shared shopping list. Open items first in the order they were added;
 * crossed-off ones sink to the bottom until "Clear bought" tombstones them.
 */
export function GroceriesSection({
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

  const items = (trip.groceries ?? [])
    .filter((g) => !g.deleted)
    .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || a.createdAt - b.createdAt);
  const doneCount = items.filter((g) => g.done).length;

  const save = (groceries: GroceryItem[]) => onUpdate({ ...trip, groceries });

  const add = () => {
    if (!text.trim() || !me) return;
    const now = Date.now();
    save([
      ...(trip.groceries ?? []),
      {
        id: crypto.randomUUID(),
        text: text.trim(),
        quantity: quantity.trim(),
        addedBy: me,
        done: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setText('');
    setQuantity('');
  };

  const toggle = (item: GroceryItem) => {
    save(
      (trip.groceries ?? []).map((g) => (g.id === item.id ? { ...g, done: !g.done, updatedAt: Date.now() } : g)),
    );
  };

  const clearDone = () => {
    if (!confirm(`Remove ${doneCount} bought ${doneCount === 1 ? 'item' : 'items'} from the list?`)) return;
    const now = Date.now();
    save((trip.groceries ?? []).map((g) => (g.done && !g.deleted ? { ...g, deleted: true, updatedAt: now } : g)));
  };

  return (
    <section className="card">
      <h2>Groceries</h2>
      <div className="grocery-add">
        <input
          value={text}
          placeholder={me ? 'e.g. Pasta' : 'Enter your name above to add items'}
          disabled={!me}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <input
          className="grocery-qty"
          value={quantity}
          placeholder="How much?"
          disabled={!me}
          onChange={(e) => setQuantity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="primary" disabled={!me || !text.trim()} onClick={add}>
          Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="muted small">Nothing on the list — add what the house needs 🧺</p>
      ) : (
        <ul className="grocery-list">
          {items.map((item) => (
            <li key={item.id} className={item.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
                <span className="grocery-text">{item.text}</span>
                <span className={`grocery-amount${item.quantity ? '' : ' none'}`}>{item.quantity || '—'}</span>
                <span className="muted small grocery-by">{item.addedBy}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {doneCount > 0 && (
        <button className="clear-bought" onClick={clearDone}>
          🧹 Clear {doneCount} bought {doneCount === 1 ? 'item' : 'items'}
        </button>
      )}
    </section>
  );
}
