"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

type Pin = { lat: number; lng: number };

const icon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<span style="display:block;width:22px;height:22px;border-radius:999px;background:#e08a2e;border:3px solid #3a2a1c;box-shadow:0 2px 6px rgba(58,42,28,.3);box-sizing:border-box"></span>`,
});

function Clicks({ onPick }: { onPick: (p: Pin) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: Math.round(e.latlng.lat * 1e5) / 1e5, lng: Math.round(e.latlng.lng * 1e5) / 1e5 }) });
  return null;
}

function Follow({ pin, zoom }: { pin: Pin | null; zoom: number }) {
  const map = useMap();
  useEffect(() => { if (pin) map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), zoom)); }, [map, pin, zoom]);
  return null;
}

/** Tap the map to set a pin (where an online shop ships from). Opens on Thailand when there is no pin yet. `precise` is for a place's own
 *  location (the GPS check works within 150 m of it): zoom buttons, and a tap zooms to street level so the pin can be moved onto the door. */
export default function PinPicker({ pin, onPick, disabled = false, precise = false, start = null, className = "h-56 rounded-2xl" }: { pin: Pin | null; onPick: (p: Pin) => void; disabled?: boolean; precise?: boolean; start?: Pin | null; className?: string }) {
  // Without a pin: the visitor's approximate city when known (`start`); else, for a place's own pin, the whole world (a global launch),
  // and for shipping origins, Thailand as before.
  const center: [number, number] = pin ? [pin.lat, pin.lng] : start ? [start.lat, start.lng] : precise ? [20, 10] : [15.5, 101];
  const zoom = pin ? (precise ? 17 : 9) : start ? 12 : precise ? 2 : 5;
  return (
    <MapContainer center={center} zoom={zoom} className={`isolate w-full ${className}`} zoomControl={precise} attributionControl>
      {/* OpenStreetMap's tile licence asks for the credit on the map. */}
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      {!disabled && <Clicks onPick={onPick} />}
      <Follow pin={pin} zoom={precise ? 17 : 9} />
      {pin && <Marker position={[pin.lat, pin.lng]} icon={icon} />}
    </MapContainer>
  );
}
