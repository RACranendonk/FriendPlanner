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

  constructor(
    private readonly tripId: string,
    private readonly passphrase: string,
    private readonly onRemote: (trip: Trip) => void,
    private readonly onStatus: (connected: number, total: number) => void,
  ) {}

  async start(): Promise<void> {
    this.keys = await deriveTripKeys(this.tripId, this.passphrase);
    if (this.closed) return;
    for (const url of RELAYS) this.connect(url);
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
    ws.onmessage = (msg) => void this.handleMessage(String(msg.data));
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

  private async handleMessage(raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(parsed) || parsed[0] !== 'EVENT' || parsed[1] !== SUB_ID) return;
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
}
