import { useEffect, useRef, useState } from 'react';
import type { Trip } from '../types';
import { TripSync } from './sync';

export interface SyncStatus {
  connected: number;
  total: number;
}

/**
 * Relay sync for one trip. `onRemote` receives verified, decrypted trips from
 * the relays; `publish` pushes local changes out. No-op when the passphrase is
 * unknown (nothing to derive keys or decrypt with).
 */
export function useTripSync(
  tripId: string,
  passphrase: string,
  onRemote: (incoming: Trip) => void,
): SyncStatus & { publish: (trip: Trip) => void } {
  const [status, setStatus] = useState<SyncStatus>({ connected: 0, total: 0 });
  const syncRef = useRef<TripSync | null>(null);
  const onRemoteRef = useRef(onRemote);
  onRemoteRef.current = onRemote;

  useEffect(() => {
    if (!passphrase) return;
    const sync = new TripSync(
      tripId,
      passphrase,
      (trip) => onRemoteRef.current(trip),
      (connected, total) => setStatus({ connected, total }),
    );
    syncRef.current = sync;
    void sync.start();
    return () => {
      syncRef.current = null;
      sync.close();
      setStatus({ connected: 0, total: 0 });
    };
  }, [tripId, passphrase]);

  return { ...status, publish: (trip) => syncRef.current?.publish(trip) };
}
