import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  emoji: string;
  title?: string;
  subtitle?: string;
}

/**
 * Thin Leaflet wrapper: OpenStreetMap tiles, emoji pins, optional tap-to-pick.
 * Popup content is built via DOM textContent — pin titles are user input and
 * must never be interpolated into HTML.
 */
export function MapView({
  pins,
  onPick,
  height = 320,
  center,
}: {
  pins: MapPin[];
  onPick?: (lat: number, lng: number) => void;
  height?: number;
  center?: { lat: number; lng: number; zoom?: number };
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!divRef.current) return;
    const map = L.map(divRef.current, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    map.setView([30, 10], 2);
    map.on('click', (e: L.LeafletMouseEvent) => onPickRef.current?.(e.latlng.lat, e.latlng.lng));
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const pin of pins) {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: L.divIcon({
          className: 'map-pin',
          html: `<span>${pin.emoji}</span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      });
      if (pin.title) {
        const popup = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = pin.title;
        popup.appendChild(title);
        if (pin.subtitle) {
          const sub = document.createElement('div');
          sub.textContent = pin.subtitle;
          popup.appendChild(sub);
        }
        marker.bindPopup(popup);
      }
      marker.addTo(layer);
    }
    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.25), { maxZoom: 15 });
    } else if (center) {
      map.setView([center.lat, center.lng], center.zoom ?? 12);
    }
  }, [pins, center]);

  return <div ref={divRef} className="map-view" style={{ height }} />;
}
