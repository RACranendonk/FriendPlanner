import { useEffect, useState } from 'react';
import type { Trip } from '../types';
import { extractToken, shareUrl, tokenToTrip, tripToToken } from '../lib/share';
import { mergeTrips } from '../lib/merge';
import { getPassphrase } from '../lib/storage';

export function ShareDialog({
  trip,
  onMerged,
  onClose,
}: {
  trip: Trip;
  onMerged: (merged: Trip) => void;
  onClose: () => void;
}) {
  const passphrase = getPassphrase(trip.id);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importMsg, setImportMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    tripToToken(trip, passphrase).then((token) => {
      if (alive) setUrl(shareUrl(token));
    });
    return () => {
      alive = false;
    };
  }, [trip, passphrase]);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const importUpdate = async () => {
    const token = extractToken(pasteText);
    if (!token) {
      setImportMsg({ kind: 'error', text: "No FriendPlanner link found in that text." });
      return;
    }
    try {
      const incoming = await tokenToTrip(token, passphrase);
      if (incoming.id !== trip.id) {
        setImportMsg({ kind: 'error', text: 'That link is for a different trip — open it from the home screen instead.' });
        return;
      }
      onMerged(mergeTrips(trip, incoming));
      setPasteText('');
      setImportMsg({ kind: 'ok', text: 'Merged! Your plan now includes their changes.' });
    } catch {
      setImportMsg({ kind: 'error', text: "Couldn't decrypt that link with this trip's passphrase." });
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Invite friends</h2>
        <p className="muted small">
          Friends only need this link <strong>once</strong>: it contains the plan, encrypted with your group
          passphrase. After they unlock it, changes sync automatically between everyone (still encrypted —
          the relay servers only ever see unreadable ciphertext).
        </p>
        <div className="share-box">
          <input readOnly value={url || 'Encrypting…'} onFocus={(e) => e.target.select()} />
          <button className="primary" disabled={!url} onClick={copy}>
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
        </div>

        <h3>Got an update link from a friend?</h3>
        <p className="muted small">
          Normally unnecessary — changes sync on their own. If the relays are ever unreachable, paste a
          friend's link here to merge their changes manually.
        </p>
        <textarea
          rows={2}
          value={pasteText}
          placeholder="Paste their link or message…"
          onChange={(e) => {
            setPasteText(e.target.value);
            setImportMsg(null);
          }}
        />
        {importMsg && <p className={importMsg.kind === 'ok' ? 'success' : 'error'}>{importMsg.text}</p>}
        <div className="row">
          <button disabled={!pasteText.trim()} onClick={importUpdate}>
            Merge update
          </button>
          <span className="spacer" />
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
