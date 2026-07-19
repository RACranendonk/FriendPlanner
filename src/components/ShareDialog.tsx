import { useEffect, useState } from 'react';
import type { Trip } from '../types';
import { extractToken, inviteToken, shareUrl, tokenToTrip, tripToToken } from '../lib/share';
import { mergeTrips } from '../lib/merge';
import { getPassphrase } from '../lib/storage';

function CopyBox({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="share-box">
      <input readOnly value={value || 'Preparing…'} onFocus={(e) => e.target.select()} />
      <button className="primary" disabled={!value} onClick={copy}>
        {copied ? '✓ Copied' : label}
      </button>
    </div>
  );
}

export function ShareDialog({
  trip,
  onMerged,
  onEnsurePublished,
  onClose,
}: {
  trip: Trip;
  onMerged: (merged: Trip) => void;
  onEnsurePublished: () => void;
  onClose: () => void;
}) {
  const passphrase = getPassphrase(trip.id);
  const [backupUrl, setBackupUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [importMsg, setImportMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const inviteUrl = shareUrl(inviteToken(trip.id));

  useEffect(() => {
    // The invite link only works if the relays hold the current plan — make sure they do.
    onEnsurePublished();
    let alive = true;
    tripToToken(trip, passphrase).then((token) => {
      if (alive) setBackupUrl(shareUrl(token));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, passphrase]);

  const importUpdate = async () => {
    const token = extractToken(pasteText);
    if (!token || !token.startsWith('FP1_')) {
      setImportMsg({ kind: 'error', text: 'No full FriendPlanner backup link found in that text.' });
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
          Share this link <strong>once</strong>, plus the passphrase. Friends who open it get the current plan
          from the encrypted sync, and everything stays in sync automatically afterwards.
        </p>
        <CopyBox value={inviteUrl} label="Copy invite" />

        <details className="share-details">
          <summary>Backup link (full plan)</summary>
          <p className="muted small">
            This longer link carries the entire encrypted plan inside it — it works even when the sync relays
            don't. Drop one in the group chat now and then as a safety copy.
          </p>
          <CopyBox value={backupUrl} label="Copy backup" />
          <h3>Got a backup link from a friend?</h3>
          <p className="muted small">Paste it here to merge their changes manually.</p>
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
          <button disabled={!pasteText.trim()} onClick={importUpdate}>
            Merge update
          </button>
        </details>

        <div className="row">
          <span className="spacer" />
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
