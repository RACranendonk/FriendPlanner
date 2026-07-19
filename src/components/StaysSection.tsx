import { useState } from 'react';
import type { Stay, Trip } from '../types';
import { linkInfo } from '../lib/linkinfo';
import { CommentThread } from './CommentThread';
import { RATING_LEVELS, averageRating, effectiveRatings, ratingEmoji } from '../lib/rating';

/**
 * Accommodation candidates: share options, vote, argue in comments, crown a
 * winner. Votes reuse the per-person {in, ts} records; comments are
 * append-only (see merge.ts). Vote toggles and comment adds deliberately don't
 * bump the stay's updatedAt — both merge on their own and must not clobber
 * concurrent edits of the stay's fields.
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

  const stays = (trip.stays ?? [])
    .filter((s) => !s.deleted)
    .sort(
      (a, b) =>
        (b.decided ? 1 : 0) - (a.decided ? 1 : 0) ||
        (averageRating(b) ?? -1) - (averageRating(a) ?? -1) ||
        Object.keys(effectiveRatings(b)).length - Object.keys(effectiveRatings(a)).length ||
        a.title.localeCompare(b.title),
    );
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
    // Ratings merge per person like votes — no updatedAt bump.
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

  return (
    <section className="card">
      <div className="section-head">
        <h2>Where we stay</h2>
        <button className="ghost" onClick={() => setEditing('new')}>
          ＋ Add option
        </button>
      </div>
      {stays.length === 0 ? (
        <p className="muted small">
          Found a nice place? Add it here so the group can compare, discuss, and vote.
        </p>
      ) : (
        stays.map((stay) => (
          <StayCard
            key={stay.id}
            stay={stay}
            me={me}
            highlight={!anyDecided && topIsUnique && !stay.decided && averageRating(stay) === topAverage}
            onRate={(score) => rate(stay, score)}
            onComment={(text) => addComment(stay, text)}
            onDecide={() => decide(stay)}
            onEdit={() => setEditing(stay)}
            onDelete={() => remove(stay)}
          />
        ))
      )}
      {editing && (
        <StayForm
          initial={editing === 'new' ? null : editing}
          me={me}
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

function StayCard({
  stay,
  me,
  highlight,
  onRate,
  onComment,
  onDecide,
  onEdit,
  onDelete,
}: {
  stay: Stay;
  me: string;
  highlight: boolean;
  onRate: (score: number) => void;
  onComment: (text: string) => void;
  onDecide: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const link = linkInfo(stay.url);
  const ratings = effectiveRatings(stay);
  const raters = Object.keys(ratings).sort((a, b) => a.localeCompare(b));
  const average = averageRating(stay);
  const myScore = me ? ratings[me] : undefined;

  return (
    <article className={`card stay${stay.decided ? ' decided' : highlight ? ' popular' : ''}`}>
      <div className="activity-title-row">
        {stay.decided && <span title="The group's choice">🏆</span>}
        <strong>{stay.title}</strong>
        {average !== null && (
          <span className="chip count" title={`Average of ${raters.length} ${raters.length === 1 ? 'rating' : 'ratings'}`}>
            {ratingEmoji(average)} {average.toFixed(1)}
          </span>
        )}
      </div>
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
              title={level.label}
              disabled={!me}
              onClick={() => onRate(level.score)}
            >
              {level.emoji}
            </button>
          ))}
        </div>
        <span className="spacer" />
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
    </article>
  );
}

function StayForm({
  initial,
  me,
  onSave,
  onCancel,
}: {
  initial: Stay | null;
  me: string;
  onSave: (stay: Stay) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [details, setDetails] = useState(initial?.details ?? '');

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      url: url.trim(),
      details: details.trim(),
      votes: initial?.votes ?? (me ? { [me]: { in: true, ts: Date.now() } } : {}),
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
        <label className="field">
          <span>Link (Airbnb, Booking, …)</span>
          <input value={url} placeholder="https://…" inputMode="url" onChange={(e) => setUrl(e.target.value)} />
        </label>
        <label className="field">
          <span>The facts</span>
          <textarea
            rows={3}
            value={details}
            placeholder="Price per night, beds, distance to town…"
            onChange={(e) => setDetails(e.target.value)}
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
