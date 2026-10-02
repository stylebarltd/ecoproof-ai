"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { PlaceSummary } from "@/lib/practices";

// Legend colours from the design: verified = sage-500, pledged = terracotta-500, no pledge yet = neutral-400.
const color = (p: PlaceSummary) => (p.ownerVerified || p.verifiedCount ? "#8fa073" : p.pledgedCount ? "#d67f48" : "#c0b6a5");

function FitBounds({ places, active }: { places: PlaceSummary[]; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active && places.length) map.fitBounds(places.map((p) => [p.lat, p.lng] as [number, number]), { padding: [60, 60], maxZoom: 15 });
  }, [map, places, active]);
  return null;
}

function FlyTo({ place }: { place: PlaceSummary | null }) {
  const map = useMap();
  useEffect(() => { if (place) map.setView([place.lat, place.lng], 16); }, [map, place]);
  return null;
}

export default function MapView({ places, selectedId, onSelect, fit = false, focus = null }: { places: PlaceSummary[]; selectedId: string | null; onSelect: (id: string) => void; fit?: boolean; focus?: PlaceSummary | null }) {
  return (
    <MapContainer center={[18.7945, 98.9858]} zoom={14} className="h-full w-full" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds places={places} active={fit} />
      <FlyTo place={focus} />
      {places.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={p.id === selectedId ? 13 : p.ownerVerified || p.verifiedCount || p.pledgedCount ? 10 : 7}
          pathOptions={{ color: p.id === selectedId ? "#201e1d" : "#ffffff", weight: p.id === selectedId ? 3 : 2, fillColor: color(p), fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onSelect(p.id) }}
        />
      ))}
    </MapContainer>
  );
}
