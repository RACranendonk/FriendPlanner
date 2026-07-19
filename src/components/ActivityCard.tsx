import { useState } from 'react';
import type { Activity } from '../types';
import { CATEGORIES, SLOTS } from '../types';

/** Komoot tours and named places can be shown inline; other links just open in a new tab. */
function embedUrl(act: Activity): string | null {
  const komoot = act.locationUrl.match(/komoot\.[a-z.]+\/(?:[a-z-]+\/)?tour\/(\d+)/);
  if (komoot) return `https://www.komoot.com/tour/${komoot[1]}/embed?profile=1`;
  if (act.locationName) return `https://maps.google.com/maps?q=${encodeURIComponent(act.locationName)}&output=embed`;
  return null;
}

export function ActivityCard({
  activity,
  me,
  onToggle,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  me: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMap, setShowMap] = useState(false);
  const category = CATEGORIES[activity.category];
  const going = Object.entries(activity.votes)
    .filter(([, vote]) => vote.in)
    .map(([person]) => person)
    .sort((a, b) => a.localeCompare(b));
  const imIn = me !== '' && going.includes(me);
  const map = embedUrl(activity);

  return (
    <article className="card activity">
      <div className="activity-main">
        <span className="cat-emoji" title={category.label}>
          {category.emoji}
        </span>
        <div className="activity-body">
          <div className="activity-title-row">
            <strong>{activity.title}</strong>
            <span className="chip">{SLOTS[activity.slot]}</span>
          </div>
          {(activity.locationName || activity.locationUrl) && (
            <p className="muted small">
              📍{' '}
              {activity.locationUrl ? (
                <a href={activity.locationUrl} target="_blank" rel="noreferrer noopener">
                  {activity.locationName || activity.locationUrl.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
                </a>
              ) : (
                activity.locationName
              )}
              {map && (
                <>
                  {' · '}
                  <button className="linklike" onClick={() => setShowMap((v) => !v)}>
                    {showMap ? 'hide map' : 'show map'}
                  </button>
                </>
              )}
            </p>
          )}
          {activity.notes && <p className="small notes">{activity.notes}</p>}
          <div className="going-row">
            {going.length > 0 ? (
              going.map((person) => (
                <span key={person} className={`chip person ${person === me ? 'is-me' : ''}`}>
                  {person}
                </span>
              ))
            ) : (
              <span className="muted small">No one has joined yet</span>
            )}
          </div>
        </div>
      </div>

      {showMap && map && (
        <div className="map-embed">
          <iframe src={map} title={`Map: ${activity.title}`} loading="lazy" allowFullScreen />
        </div>
      )}

      <div className="activity-actions">
        <button className={imIn ? 'joined' : 'primary'} disabled={me === ''} onClick={onToggle}>
          {imIn ? "✓ I'm in — tap to leave" : "I'm in"}
        </button>
        <span className="spacer" />
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
