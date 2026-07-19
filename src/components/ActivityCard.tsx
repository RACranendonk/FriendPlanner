import { useState } from 'react';
import type { Activity } from '../types';
import { CATEGORIES, SLOTS } from '../types';
import { goingNames } from '../lib/grouping';
import { linkInfo } from '../lib/linkinfo';

/**
 * Only a named place gets an inline map snippet. Pasted links (Komoot, venue
 * sites, …) stay plain hyperlinks — many of them refuse to render inside an
 * iframe (Komoot's embed is blocked by Firefox, most sites send
 * X-Frame-Options), so a link that always works beats a snippet that
 * sometimes shows an error box.
 */
function embedUrl(act: Activity): string | null {
  if (act.locationName) return `https://maps.google.com/maps?q=${encodeURIComponent(act.locationName)}&output=embed`;
  return null;
}

export function ActivityCard({
  activity,
  me,
  highlight,
  onToggle,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  me: string;
  highlight: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMap, setShowMap] = useState(false);
  const category = CATEGORIES[activity.category];
  const going = goingNames(activity);
  const imIn = me !== '' && going.includes(me);
  const map = embedUrl(activity);
  const link = linkInfo(activity.locationUrl);

  return (
    <article className={`card activity${highlight ? ' popular' : ''}`}>
      <div className="activity-main">
        <span className="cat-emoji" title={category.label}>
          {category.emoji}
        </span>
        <div className="activity-body">
          <div className="activity-title-row">
            <strong>{activity.title}</strong>
            <span className="chip">{SLOTS[activity.slot]}</span>
            {going.length > 0 && (
              <span className="chip count" title={`${going.length} joining`}>
                👥 {going.length}
              </span>
            )}
          </div>
          {activity.locationName && (
            <p className="muted small">
              📍 {activity.locationName}
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
          {link && (
            <p className="muted small">
              🔗{' '}
              <a href={link.href} target="_blank" rel="noreferrer noopener">
                {link.label}
              </a>
              {link.label !== link.host && <span> ({link.host})</span>}
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
