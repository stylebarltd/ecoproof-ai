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

function Follow({ pin, zoom }: { pin: Pin | null; zoom: number }) {
  const map = useMap();
  useEffect(() => { if (pin) map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), zoom)); }, [map, pin, zoom]);
  return null;
}

/** Tap the map to set a pin (where an online shop ships from). Opens on Thailand when there is no pin yet. `precise` is for a place's own
 *  location (the GPS check works within 150 m of it): zoom buttons, and a tap zooms to street level so the pin can be moved onto the door. */
export default function PinPicker({ pin, onPick, disabled = false, precise = false, className = "h-56 rounded-2xl" }: { pin: Pin | null; onPick: (p: Pin) => void; disabled?: boolean; precise?: boolean; className?: string }) {
  return (
    <MapContainer center={pin ? [pin.lat, pin.lng] : [15.5, 101]} zoom={pin ? (precise ? 17 : 9) : 5} className={`isolate w-full ${className}`} zoomControl={precise} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {!disabled && <Clicks onPick={onPick} />}
      <Follow pin={pin} zoom={precise ? 17 : 9} />
      {pin && <Marker position={[pin.lat, pin.lng]} icon={icon} />}
    </MapContainer>
  );
}
