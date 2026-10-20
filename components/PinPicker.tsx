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
  html: `<span style="display:block;width:22px;height:22px;border-radius:999px;background:#e8a317;border:3px solid #201e1d;box-shadow:0 2px 6px rgba(0,0,0,.3);box-sizing:border-box"></span>`,
});

function Clicks({ onPick }: { onPick: (p: Pin) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: Math.round(e.latlng.lat * 1e5) / 1e5, lng: Math.round(e.latlng.lng * 1e5) / 1e5 }) });
  return null;
}

function Follow({ pin }: { pin: Pin | null }) {
  const map = useMap();
  useEffect(() => { if (pin) map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 9)); }, [map, pin]);
  return null;
}

/** Tap the map to set a pin (where an online shop ships from). Opens on Thailand when there is no pin yet. */
export default function PinPicker({ pin, onPick, disabled = false }: { pin: Pin | null; onPick: (p: Pin) => void; disabled?: boolean }) {
  return (
    <MapContainer center={pin ? [pin.lat, pin.lng] : [15.5, 101]} zoom={pin ? 9 : 5} className="isolate h-56 w-full rounded-2xl" zoomControl={false} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {!disabled && <Clicks onPick={onPick} />}
      <Follow pin={pin} />
      {pin && <Marker position={[pin.lat, pin.lng]} icon={icon} />}
    </MapContainer>
  );
}
