import { useMemo, useRef, useState } from 'react';
import type { Stay, StayFieldDef, Trip } from '../types';
import { linkInfo } from '../lib/linkinfo';
import { geocode, isValidCoords, navUrl, type LatLng } from '../lib/geo';
import { MapView } from './MapView';
import { CommentThread } from './CommentThread';
import { RATING_CLEARED, RATING_LEVELS, averageRating, effectiveRatings, ratingEmoji } from '../lib/rating';

/**
 * Accommodation candidates: share options, vote, argue in comments, crown a
 * winner. Votes reuse the per-person {in, ts} records; comments are
 * append-only (see merge.ts). Vote toggles and comment adds deliberately don't
 * bump the stay's updatedAt — both merge on their own and must not clobber
 * concurrent edits of the stay's fields.
 *
 * The list itself is a comparison table (one row per option) so options stay
 * scannable as candidates pile up; the full card — ratings, comments,
 * decide/edit/delete — opens in a modal per row instead of living inline.
 */
export function StaysSection({
  trip,
  me,
  onUpdate,
}: {
  trip: Trip;
  me: string;
  onUpdate: (trip: Trip) => void;
}) {
  const [editing, setEditing] = useState<Stay | 'new' | null>(null);
  const [openStayId, setOpenStayId] = useState<string | null>(null);
  const [managingFields, setManagingFields] = useState(false);

  const fields = (trip.stayFields ?? []).filter((f) => !f.deleted);
  const visible = (trip.stays ?? []).filter((s) => !s.deleted);
  const bySortValue = (a: Stay, b: Stay) =>
    (b.decided ? 1 : 0) - (a.decided ? 1 : 0) ||
    (averageRating(b) ?? -1) - (averageRating(a) ?? -1) ||
    Object.keys(effectiveRatings(b)).length - Object.keys(effectiveRatings(a)).length ||
    a.title.localeCompare(b.title);

  // The order is frozen when the section opens: a rating mustn't shuffle the
  // row someone is looking at. Fresh sort on the next visit/refresh; stays
  // that appear mid-session go to the end.
  const orderRef = useRef<Map<string, number> | null>(null);
  if (orderRef.current === null) {
    orderRef.current = new Map([...visible].sort(bySortValue).map((s, i) => [s.id, i]));
  }
  const frozenIndex = orderRef.current;
  const stays = [...visible].sort((a, b) => {
    const ia = frozenIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const ib = frozenIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return ia - ib || a.createdBy.localeCompare(b.createdBy) || bySortValue(a, b);
  });
  const anyDecided = stays.some((s) => s.decided);
  // Highlight only a strict favorite: the single stay with the best average.
  const averages = stays.filter((s) => !s.decided).map((s) => averageRating(s)).filter((a): a is number => a !== null);
  const topAverage = averages.length > 0 ? Math.max(...averages) : null;
  const topIsUnique = averages.filter((a) => a === topAverage).length === 1;

  const upsert = (stay: Stay) => {
    onUpdate({ ...trip, stays: [...(trip.stays ?? []).filter((s) => s.id !== stay.id), stay] });
  };

  const rate = (stay: Stay, score: number) => {
    if (!me) return;
    // Ratings merge per person like votes — no updatedAt bump. Clearing writes
    // score 0 (a tombstone) instead of deleting: a deleted record would be
    // resurrected by the first merge with an older copy.
    upsert({ ...stay, ratings: { ...(stay.ratings ?? {}), [me]: { score, ts: Date.now() } } });
  };

  const addComment = (stay: Stay, text: string) => {
    if (!me || !text.trim()) return;
    upsert({
      ...stay,
      comments: [...stay.comments, { id: crypto.randomUUID(), author: me, text: text.trim(), ts: Date.now() }],
    });
  };

  const decide = (stay: Stay) => {
    const now = Date.now();
    onUpdate({
      ...trip,
      stays: (trip.stays ?? []).map((s) =>
        s.id === stay.id
          ? { ...s, decided: !s.decided, updatedAt: now }
          : s.decided
            ? { ...s, decided: false, updatedAt: now }
            : s,
      ),
    });
  };

  const remove = (stay: Stay) => {
    if (!confirm(`Remove "${stay.title}" from the options (for everyone)?`)) return;
    upsert({ ...stay, deleted: true, updatedAt: Date.now() });
  };

  const addField = (label: string) => {
    if (!label.trim()) return;
    const now = Date.now();
    const field: StayFieldDef = { id: crypto.randomUUID(), label: label.trim(), createdBy: me, createdAt: now, updatedAt: now };
    onUpdate({ ...trip, stayFields: [...(trip.stayFields ?? []), field] });
  };

  const removeField = (field: StayFieldDef) => {
    if (!confirm(`Remove the "${field.label}" column (for everyone)?`)) return;
    onUpdate({
      ...trip,
      stayFields: (trip.stayFields ?? []).map((f) => (f.id === field.id ? { ...f, deleted: true, updatedAt: Date.now() } : f)),
    });
  };

  const openStay = openStayId ? stays.find((s) => s.id === openStayId) ?? null : null;

  return (
    <section className="card">
      <div className="section-head">
        <h2>Where we stay</h2>
        <div className="row">
          <button className="ghost" onClick={() => setManagingFields((v) => !v)}>
            ⚙️ Fields
          </button>
          <button className="ghost" onClick={() => setEditing('new')}>
            ＋ Add option
          </button>
        </div>
      </div>

      {managingFields && (
        <FieldsManager fields={fields} onAdd={addField} onRemove={removeField} />
      )}

      {stays.length === 0 ? (
        <p className="muted small">
          Found a nice place? Add it here so the group can compare, discuss, and vote.
        </p>
      ) : (
        <StaysTable
          stays={stays}
          fields={fields}
          anyDecided={anyDecided}
          topAverage={topAverage}
          topIsUnique={topIsUnique}
          onOpen={(stay) => setOpenStayId(stay.id)}
        />
      )}

      {openStay && (
        <StayDetail
          stay={openStay}
          me={me}
          highlight={!anyDecided && topIsUnique && !openStay.decided && averageRating(openStay) === topAverage}
          onRate={(score) => rate(openStay, score)}
          onComment={(text) => addComment(openStay, text)}
          onDecide={() => decide(openStay)}
          onEdit={() => {
            setOpenStayId(null);
            setEditing(openStay);
          }}
          onDelete={() => remove(openStay)}
          onClose={() => setOpenStayId(null)}
        />
      )}

      {editing && (
        <StayForm
          initial={editing === 'new' ? null : editing}
          me={me}
          fields={fields}
          onSave={(stay) => {
            upsert(stay);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function FieldsManager({
  fields,
  onAdd,
  onRemove,
}: {
  fields: StayFieldDef[];
  onAdd: (label: string) => void;
  onRemove: (field: StayFieldDef) => void;
}) {
  const [label, setLabel] = useState('');

  const submit = () => {
    if (!label.trim()) return;
    onAdd(label);
    setLabel('');
  };

  return (
    <div className="fields-manager">
      <p className="muted small">
        Custom yes/no columns for comparing options — not every trip needs the same things.
      </p>
      {fields.length > 0 && (
        <div className="going-row">
          {fields.map((f) => (
            <span key={f.id} className="chip">
              {f.label}
              <button className="chip-x" title={`Remove "${f.label}"`} onClick={() => onRemove(f)}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="row">
        <input
          value={label}
          placeholder="e.g. Good game table?"
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button disabled={!label.trim()} onClick={submit}>
          + Add field
        </button>
      </div>
    </div>
  );
}

function StaysTable({
  stays,
  fields,
  anyDecided,
  topAverage,
  topIsUnique,
  onOpen,
}: {
  stays: Stay[];
  fields: StayFieldDef[];
  anyDecided: boolean;
  topAverage: number | null;
  topIsUnique: boolean;
  onOpen: (stay: Stay) => void;
}) {
  return (
    <div className="stays-table-wrap">
      <table className="stays-table">
        <thead>
          <tr>
            <th>Option</th>
            <th>Cost</th>
            <th>Location</th>
            {fields.map((f) => (
              <th key={f.id} title={f.label}>
                {f.label}
              </th>
            ))}
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          {stays.map((stay) => {
            const average = averageRating(stay);
            const hasPin = stay.lat != null && stay.lng != null && isValidCoords(stay.lat, stay.lng);
            const highlight = !anyDecided && topIsUnique && !stay.decided && average === topAverage;
            return (
              <tr key={stay.id} className={stay.decided ? 'decided' : highlight ? 'popular' : ''}>
                <td>
                  <button className="linklike" onClick={() => onOpen(stay)}>
                    {stay.decided && '🏆 '}
                    {stay.title}
                  </button>
                </td>
                <td className="num">{stay.cost != null ? stay.cost.toLocaleString() : '—'}</td>
                <td className="truncate">
                  {stay.locationName || (hasPin ? '📍 Pinned location' : '—')}
                </td>
                {fields.map((f) => (
                  <td key={f.id} className="center">
                    {stay.customValues?.[f.id] ? '✅' : '—'}
                  </td>
                ))}
                <td className="num">{average !== null ? `${ratingEmoji(average)} ${average.toFixed(1)}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StayDetail({
  stay,
  me,
  highlight,
  onRate,
  onComment,
  onDecide,
  onEdit,
  onDelete,
  onClose,
}: {
  stay: Stay;
  me: string;
  highlight: boolean;
  onRate: (score: number) => void;
  onComment: (text: string) => void;
  onDecide: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [showMap, setShowMap] = useState(false);
  const link = linkInfo(stay.url);
  const ratings = effectiveRatings(stay);
  const raters = Object.keys(ratings).sort((a, b) => a.localeCompare(b));
  const average = averageRating(stay);
  const myScore = me ? ratings[me] : undefined;
  const hasPin = stay.lat != null && stay.lng != null && isValidCoords(stay.lat, stay.lng);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal stay${stay.decided ? ' decided' : highlight ? ' popular' : ''}`}>
        <div className="activity-title-row">
          {stay.decided && <span title="The group's choice">🏆</span>}
          <strong>{stay.title}</strong>
          {average !== null && (
            <span className="chip count" title={`Average of ${raters.length} ${raters.length === 1 ? 'rating' : 'ratings'}`}>
              {ratingEmoji(average)} {average.toFixed(1)}
            </span>
          )}
        </div>
        {stay.cost != null && <p className="muted small">💰 {stay.cost.toLocaleString()} total</p>}
        {(stay.locationName || hasPin) && (
          <p className="muted small">
            📍 {stay.locationName || 'Pinned location'}
            {hasPin && (
              <>
                {' · '}
                <button className="linklike" onClick={() => setShowMap((v) => !v)}>
                  {showMap ? 'hide map' : 'show map'}
                </button>
              </>
            )}
          </p>
        )}
        {link && (
          <p className="muted small">
            🔗{' '}
            <a href={link.href} target="_blank" rel="noreferrer noopener">
              {link.label}
            </a>
            {link.label !== link.host && <span> ({link.host})</span>}
          </p>
        )}
        {stay.details && <p className="small notes">{stay.details}</p>}
        {showMap && hasPin && <MapView pins={[{ id: stay.id, lat: stay.lat!, lng: stay.lng!, emoji: '🏠' }]} height={220} />}
        <div className="going-row">
          {raters.map((person) => (
            <span key={person} className={`chip person ${person === me ? 'is-me' : ''}`}>
              {person} {ratingEmoji(ratings[person])}
            </span>
          ))}
        </div>

        <CommentThread comments={stay.comments} me={me} onPost={onComment} />

        <div className="activity-actions">
          <div className="rating-row" title={me ? 'How do you feel about this place?' : 'Enter your name above to rate'}>
            {RATING_LEVELS.map((level) => (
              <button
                key={level.score}
                className={`rating-btn${myScore === level.score ? ' selected' : ''}`}
                title={myScore === level.score ? `${level.label} — tap again to remove your rating` : level.label}
                disabled={!me}
                onClick={() => onRate(myScore === level.score ? RATING_CLEARED : level.score)}
              >
                {level.emoji}
              </button>
            ))}
          </div>
          <span className="spacer" />
          {hasPin && (
            <a className="linkbtn" href={navUrl(stay.lat!, stay.lng!)} title="Navigate there">
              🧭
            </a>
          )}
          <button className="ghost" title={stay.decided ? 'Un-decide' : 'Crown as the choice'} onClick={onDecide}>
            {stay.decided ? 'Un-decide' : '🏆 Decide'}
          </button>
          <button className="ghost" onClick={onEdit}>
            Edit
          </button>
          <button className="ghost danger" onClick={onDelete}>
            Delete
          </button>
        </div>
        <div className="row">
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StayForm({
  initial,
  me,
  fields,
  onSave,
  onCancel,
}: {
  initial: Stay | null;
  me: string;
  fields: StayFieldDef[];
  onSave: (stay: Stay) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [details, setDetails] = useState(initial?.details ?? '');
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : '');
  const [locationName, setLocationName] = useState(initial?.locationName ?? '');
  const [customValues, setCustomValues] = useState<Record<string, boolean>>(initial?.customValues ?? {});

  const initialPin =
    initial?.lat != null && initial?.lng != null && isValidCoords(initial.lat, initial.lng)
      ? { lat: initial.lat, lng: initial.lng }
      : null;
  const [pin, setPin] = useState<LatLng | null>(initialPin);
  const [showPicker, setShowPicker] = useState(initialPin !== null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState('');
  const pickerPins = useMemo(() => (pin ? [{ id: 'pin', lat: pin.lat, lng: pin.lng, emoji: '🏠' }] : []), [pin]);

  const findOnMap = async () => {
    setFinding(true);
    setFindError('');
    const query = locationName.trim() || title.trim();
    let found: LatLng | null = null;
    if (query) {
      try {
        found = await geocode(query);
      } catch {
        found = null;
      }
    }
    setFinding(false);
    setShowPicker(true);
    if (found) setPin(found);
    else setFindError("Couldn't find that place — tap the map to set the pin yourself.");
  };

  const submit = () => {
    if (!title.trim()) return;
    const parsedCost = cost.trim() ? Number(cost) : NaN;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      url: url.trim(),
      details: details.trim(),
      cost: Number.isFinite(parsedCost) ? parsedCost : undefined,
      locationName: locationName.trim(),
      lat: pin?.lat,
      lng: pin?.lng,
      customValues,
      // votes is a read-only legacy field now (see rating.ts): ratings superseded it,
      // so new stays never write to it — only old data still carries entries.
      votes: initial?.votes ?? {},
      comments: initial?.comments ?? [],
      decided: initial?.decided,
      createdBy: initial?.createdBy ?? me,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal form">
        <h2>{initial ? 'Edit option' : 'New stay option'}</h2>
        <label className="field">
          <span>Name</span>
          <input
            value={title}
            placeholder="e.g. Farmhouse with pool near Greve"
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="row">
          <label className="field">
            <span>Link (Airbnb, Booking, …)</span>
            <input value={url} placeholder="https://…" inputMode="url" onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="field">
            <span>Total cost (whole stay)</span>
            <input
              value={cost}
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              placeholder="e.g. 1200"
              onChange={(e) => setCost(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>The facts</span>
          <textarea
            rows={3}
            value={details}
            placeholder="Price per night, beds, distance to town…"
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Place (shown as a map pin)</span>
          <input
            value={locationName}
            placeholder="e.g. Greve in Chianti, Italy"
            onChange={(e) => setLocationName(e.target.value)}
          />
        </label>
        <div className="field">
          <span>Map pin {pin ? '— set 📍' : '(optional, lets options be compared by location)'}</span>
          <div className="row">
            <button disabled={finding || (!locationName.trim() && !title.trim())} onClick={findOnMap}>
              {finding ? 'Searching…' : '📍 Find on map'}
            </button>
            <button className="ghost" onClick={() => setShowPicker((v) => !v)}>
              {showPicker ? 'Hide map' : 'Place pin manually'}
            </button>
            {pin && (
              <button className="ghost danger" onClick={() => setPin(null)}>
                Remove pin
              </button>
            )}
          </div>
          {findError && <p className="error">{findError}</p>}
          {showPicker && (
            <>
              <MapView pins={pickerPins} onPick={(lat, lng) => setPin({ lat, lng })} height={220} />
              <p className="muted small">Tap the map to {pin ? 'move' : 'place'} the pin.</p>
            </>
          )}
        </div>
        {fields.length > 0 && (
          <div className="field">
            <span>Custom fields</span>
            <div className="going-row">
              {fields.map((f) => (
                <label key={f.id} className="chip person checkbox-chip">
                  <input
                    type="checkbox"
                    checked={!!customValues[f.id]}
                    onChange={(e) => setCustomValues({ ...customValues, [f.id]: e.target.checked })}
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        )}
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
