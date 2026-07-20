import { useState } from 'react';
import type { Activity } from '../types';
import { CATEGORIES, SLOTS } from '../types';
import { goingNames } from '../lib/grouping';
import { linkInfo } from '../lib/linkinfo';
import { navUrl } from '../lib/geo';
import { MapView } from './MapView';
import { CommentThread } from './CommentThread';

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
  calendarUrl,
  onToggle,
  onComment,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  me: string;
  highlight: boolean;
  calendarUrl: string | null;
  onToggle: () => void;
  onComment: (text: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMap, setShowMap] = useState(false);
  const category = CATEGORIES[activity.category];
  const going = goingNames(activity);
  const imIn = me !== '' && going.includes(me);
  const hasPin = activity.lat != null && activity.lng != null;
  const map = hasPin ? 'pin' : embedUrl(activity);
  const link = linkInfo(activity.locationUrl);

  return (
    <article className={`card activity cat-${activity.category}${highlight ? ' popular' : ''}`}>
      <div className="activity-main">
        <span className="cat-emoji" title={category.label}>
          {category.emoji}
        </span>
        <div className="activity-body">
          <div className="activity-title-row">
            <strong>{activity.title}</strong>
            <span className="chip">
              {SLOTS[activity.slot]}
              {activity.time ? ` · ${activity.time}` : ''}
            </span>
            {going.length > 0 && (
              <span className="chip count" title={`${going.length} joining`}>
                👥 {going.length}
              </span>
            )}
          </div>
          {(activity.locationName || hasPin) && (
            <p className="muted small">
              📍 {activity.locationName || 'Pinned location'}
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
          <CommentThread comments={activity.comments ?? []} me={me} onPost={onComment} />
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

      {showMap &&
        (hasPin ? (
          <MapView
            pins={[{ id: activity.id, lat: activity.lat!, lng: activity.lng!, emoji: category.emoji }]}
            height={260}
          />
        ) : map ? (
          <div className="map-embed">
            <iframe src={map} title={`Map: ${activity.title}`} loading="lazy" allowFullScreen />
          </div>
        ) : null)}

      <div className="activity-actions">
        <button className={imIn ? 'joined' : 'primary'} disabled={me === ''} onClick={onToggle}>
          {imIn ? "✓ I'm in — tap to leave" : "I'm in"}
        </button>
        <span className="spacer" />
        {hasPin && (
          <a className="linkbtn" href={navUrl(activity.lat!, activity.lng!)} title="Navigate there">
            🧭
          </a>
        )}
        {calendarUrl && (
          <a
            className="linkbtn"
            href={calendarUrl}
            target="_blank"
            rel="noreferrer noopener"
            title="Add to Google Calendar"
          >
            📅
          </a>
        )}
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
