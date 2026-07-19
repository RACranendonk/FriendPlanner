import { useState } from 'react';
import { tokenToTrip } from '../lib/share';
import { mergeTrips } from '../lib/merge';
import { getName, loadTrip, saveTrip, setName, setPassphrase } from '../lib/storage';

export function JoinGate({
  token,
  onDone,
  onCancel,
}: {
  token: string;
  onDone: (tripId: string) => void;
  onCancel: () => void;
}) {
  const [passphrase, setPassphraseState] = useState('');
  const [name, setNameState] = useState(getName());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const incoming = await tokenToTrip(token, passphrase);
      const local = loadTrip(incoming.id);
      const merged = local ? mergeTrips(local, incoming) : incoming;
      saveTrip(merged);
      setPassphrase(merged.id, passphrase);
      if (name.trim()) setName(name);
      onDone(merged.id);
    } catch {
      setError("Couldn't unlock this plan — check the passphrase and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <header className="hero">
        <h1>🧭 FriendPlanner</h1>
        <p className="muted">A friend shared a trip plan with you. Unlock it with your group's passphrase.</p>
      </header>
      <section className="card form">
        <label className="field">
          <span>Your name (how friends will see you)</span>
          <input value={name} placeholder="e.g. Anna" onChange={(e) => setNameState(e.target.value)} />
        </label>
        <label className="field">
          <span>Group passphrase</span>
          <input
            value={passphrase}
            autoFocus
            onChange={(e) => setPassphraseState(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && passphrase && submit()}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button className="primary" disabled={!passphrase || busy} onClick={submit}>
            {busy ? 'Unlocking…' : 'Unlock plan'}
          </button>
          <button className="ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
