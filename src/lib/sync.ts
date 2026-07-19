import type { Trip } from '../types';
import { tokenToTrip, tripToToken } from './share';
import {
  RELAYS,
  buildTripEvent,
  deriveTripKeys,
  tripSubscription,
  verifyTripEvent,
  type NostrEvent,
  type TripKeys,
} from './nostr';

const SUB_ID = 'trip';
const PUBLISH_DEBOUNCE_MS = 1200;
const MAX_RECONNECT_MS = 30_000;
const STALE_SETTLE_MS = 6000;

/** Re-seed threshold: one week. A weekly-active group never triggers it; a dormant trip refreshes at most once per open. */
export const STALE_RESEED_SECONDS = 7 * 24 * 3600;

/** Whether the newest relay event is old enough (or missing) to warrant a re-seed. */
export function isStale(newestCreatedAtSeconds: number, nowMs: number): boolean {
  if (newestCreatedAtSeconds === 0) return true;
  return nowMs / 1000 - newestCreatedAtSeconds > STALE_RESEED_SECONDS;
}

/**
 * One-shot fetch of a trip's latest state from the relays — the invite-link
 * join path. Collects verified events from every relay until each has sent
 * EOSE (or the timeout hits), keeps the newest, and decrypts it. Null means
 * "nothing usable": possibly no data, possibly a wrong passphrase — a wrong
 * passphrase derives a different pubkey, which simply finds no events, so the
 * two are indistinguishable by design and the caller's error copy must cover
 * both.
 */
export function fetchLatestTrip(tripId: string, passphrase: string, timeoutMs = 8000): Promise<Trip | null> {
  return new Promise((resolve) => {
    let best: NostrEvent | null = null;
    let pending = RELAYS.length;
    let done = false;
    const sockets: WebSocket[] = [];

    const finish = async () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (const ws of sockets) ws.close();
      if (!best) return resolve(null);
      try {
        const trip = await tokenToTrip(best.content, passphrase);
        resolve(trip.id === tripId ? trip : null);
      } catch {
        resolve(null);
      }
    };
    const timer = setTimeout(() => void finish(), timeoutMs);
    const settle = () => {
      pending--;
      if (pending <= 0) void finish();
    };

    void deriveTripKeys(tripId, passphrase).then((keys) => {
      if (done) return;
      for (const url of RELAYS) {
        let ws: WebSocket;
        try {
          ws = new WebSocket(url);
        } catch {
          settle();
          continue;
        }
        sockets.push(ws);
        ws.onopen = () => ws.send(JSON.stringify(tripSubscription('fetch', keys.pubkey)));
        ws.onerror = () => ws.close();
        ws.onclose = () => settle();
        ws.onmessage = async (msg) => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(String(msg.data));
          } catch {
            return;
          }
          if (!Array.isArray(parsed) || parsed[1] !== 'fetch') return;
          if (parsed[0] === 'EOSE') {
            ws.close();
            return;
          }
          if (parsed[0] !== 'EVENT') return;
          const event = parsed[2] as NostrEvent;
          if (await verifyTripEvent(event, keys.pubkey)) {
            if (!best || event.created_at > best.created_at) best = event;
          }
        };
      }
    });
  });
}

/**
 * Keeps one trip in sync through the public relays: subscribes for the latest
 * encrypted event, hands verified+decrypted trips to `onRemote`, and publishes
 * local changes (debounced, to every connected relay). Reconnects with backoff.
 */
export class TripSync {
  private keys: TripKeys | null = null;
  private sockets = new Map<string, WebSocket>();
  private connected = new Set<string>();
  private reconnectDelay = new Map<string, number>();
  private closed = false;
  private lastCreatedAt = 0;
  private lastEvent: NostrEvent | null = null;
  private pendingTrip: Trip | null = null;
  private publishTimer: ReturnType<typeof setTimeout> | null = null;
  private eoseSeen = new Set<string>();
  private staleChecked = false;
  private hasPublished = false;

  constructor(
    private readonly tripId: string,
    private readonly passphrase: string,
    private readonly onRemote: (trip: Trip) => void,
    private readonly onStatus: (connected: number, total: number) => void,
    /** Called once per session when the relays' copy is missing or older than the re-seed threshold. */
    private readonly onStale?: () => void,
  ) {}

  async start(): Promise<void> {
    this.keys = await deriveTripKeys(this.tripId, this.passphrase);
    if (this.closed) return;
    for (const url of RELAYS) this.connect(url);
    // Fallback: evaluate staleness even if some relay never sends EOSE.
    setTimeout(() => this.maybeReseed(), STALE_SETTLE_MS);
  }

  close(): void {
    this.closed = true;
    if (this.publishTimer) clearTimeout(this.publishTimer);
    for (const ws of this.sockets.values()) ws.close();
    this.sockets.clear();
    this.connected.clear();
  }

  /** Debounced: rapid consecutive edits collapse into one relay event. */
  publish(trip: Trip): void {
    this.hasPublished = true;
    this.pendingTrip = trip;
    if (this.publishTimer) clearTimeout(this.publishTimer);
    this.publishTimer = setTimeout(() => void this.flush(), PUBLISH_DEBOUNCE_MS);
  }

  private async flush(): Promise<void> {
    if (this.closed || !this.keys || !this.pendingTrip) return;
    const trip = this.pendingTrip;
    this.pendingTrip = null;
    const token = await tripToToken(trip, this.passphrase);
    // Replaceable events: relays keep the highest created_at, so ours must
    // outrank the last one we've seen even within the same wall-clock second.
    const createdAt = Math.max(Math.floor(Date.now() / 1000), this.lastCreatedAt + 1);
    this.lastCreatedAt = createdAt;
    const event = await buildTripEvent(this.keys, token, createdAt);
    this.lastEvent = event;
    if (this.closed) return;
    const message = JSON.stringify(['EVENT', event]);
    for (const url of this.connected) this.sockets.get(url)?.send(message);
  }

  private connect(url: string): void {
    if (this.closed || !this.keys) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect(url);
      return;
    }
    this.sockets.set(url, ws);
    ws.onopen = () => {
      this.reconnectDelay.set(url, 0);
      this.connected.add(url);
      this.emitStatus();
      ws.send(JSON.stringify(tripSubscription(SUB_ID, this.keys!.pubkey)));
      // A relay that was down while we published still gets the newest state.
      if (this.lastEvent) ws.send(JSON.stringify(['EVENT', this.lastEvent]));
    };
    ws.onmessage = (msg) => void this.handleMessage(url, String(msg.data));
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      this.connected.delete(url);
      this.sockets.delete(url);
      this.emitStatus();
      this.scheduleReconnect(url);
    };
  }

  private scheduleReconnect(url: string): void {
    if (this.closed) return;
    const delay = Math.min(MAX_RECONNECT_MS, (this.reconnectDelay.get(url) ?? 500) * 2);
    this.reconnectDelay.set(url, delay);
    setTimeout(() => this.connect(url), delay);
  }

  private async handleMessage(url: string, raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) return;
    if (parsed[0] === 'EOSE' && parsed[1] === SUB_ID) {
      this.eoseSeen.add(url);
      // Initial sync settled on every connected relay — safe to judge staleness.
      if (this.eoseSeen.size >= this.connected.size && this.connected.size > 0) this.maybeReseed();
      return;
    }
    if (parsed[0] !== 'EVENT' || parsed[1] !== SUB_ID) return;
    const event = parsed[2] as NostrEvent;
    if (!this.keys || !(await verifyTripEvent(event, this.keys.pubkey))) return;
    if (event.created_at > this.lastCreatedAt) this.lastCreatedAt = event.created_at;
    try {
      const trip = await tokenToTrip(event.content, this.passphrase);
      if (trip.id === this.tripId && !this.closed) this.onRemote(trip);
    } catch {
      // Undecryptable content under a valid signature shouldn't happen; ignore.
    }
  }

  private emitStatus(): void {
    if (!this.closed) this.onStatus(this.connected.size, RELAYS.length);
  }

  /**
   * At most once per session, and only when nothing was published anyway:
   * if the relays' newest copy is missing or a week old, push the local state
   * so short invite links keep working through dormant months. Deliberately
   * not eager — an active group never triggers this.
   */
  private maybeReseed(): void {
    if (this.staleChecked || this.closed || this.connected.size === 0) return;
    this.staleChecked = true;
    if (!this.hasPublished && isStale(this.lastCreatedAt, Date.now())) this.onStale?.();
  }
}
