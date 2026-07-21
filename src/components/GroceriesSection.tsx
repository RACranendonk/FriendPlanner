import { useRef, useState } from 'react';
import type { GroceryItem, Trip } from '../types';
import { categorizeGroceryItem, GROCERY_CATEGORIES } from '../lib/groceryCategories';

/**
 * The shared shopping list. Open items first in the order they were added;
 * crossed-off ones sink to the bottom until "Clear bought" tombstones them.
 * The aisle-sort view is view-only (component state, not synced) — it just
 * regroups the same items by store category instead of changing any data.
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
  const [byAisle, setByAisle] = useState(false);
  const itemInputRef = useRef<HTMLInputElement>(null);

  const byRecency = (a: GroceryItem, b: GroceryItem) =>
    (a.done ? 1 : 0) - (b.done ? 1 : 0) || a.createdAt - b.createdAt;

  const items = (trip.groceries ?? []).filter((g) => !g.deleted).sort(byRecency);
  const doneCount = items.filter((g) => g.done).length;

  const aisleGroups = GROCERY_CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((g) => categorizeGroceryItem(g.text) === cat.id),
  })).filter((group) => group.items.length > 0);

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
    // The next entry starts with its name, wherever the add came from.
    itemInputRef.current?.focus();
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

  const renderItem = (item: GroceryItem) => (
    <li key={item.id} className={item.done ? 'done' : ''}>
      <label>
        <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
        <span className="grocery-text">{item.text}</span>
        <span className={`grocery-amount${item.quantity ? '' : ' none'}`}>{item.quantity || '—'}</span>
        <span className="muted small grocery-by">{item.addedBy}</span>
      </label>
    </li>
  );

  return (
    <section className="card">
      <div className="section-head">
        <h2>Groceries</h2>
        {items.length > 0 && (
          <button className="ghost" onClick={() => setByAisle((v) => !v)}>
            {byAisle ? '↩ Original order' : '🧭 Sort by aisle'}
          </button>
        )}
      </div>
      <div className="grocery-add">
        <input
          ref={itemInputRef}
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
      ) : byAisle ? (
        aisleGroups.map((group) => (
          <div key={group.id} className="grocery-aisle-group">
            <h3>{group.label}</h3>
            <ul className="grocery-list">{group.items.map(renderItem)}</ul>
          </div>
        ))
      ) : (
        <ul className="grocery-list">{items.map(renderItem)}</ul>
      )}
      {doneCount > 0 && (
        <button className="clear-bought" onClick={clearDone}>
          🧹 Clear {doneCount} bought {doneCount === 1 ? 'item' : 'items'}
        </button>
      )}
    </section>
  );
}
