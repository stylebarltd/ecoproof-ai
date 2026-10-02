"use client";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import type { PlaceSummary } from "@/lib/places";

const color = (p: PlaceSummary) => (p.verifiedCount ? "#22c55e" : p.pledgedCount ? "#f59e0b" : "#94a3b8");

export default function MapView({ places, selectedId, onSelect }: { places: PlaceSummary[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <MapContainer center={[18.7945, 98.9858]} zoom={14} className="h-full w-full" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={p.id === selectedId ? 13 : p.verifiedCount || p.pledgedCount ? 10 : 7}
          pathOptions={{ color: p.id === selectedId ? "#fff" : "#064e3b", weight: p.id === selectedId ? 3 : 1.5, fillColor: color(p), fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onSelect(p.id) }}
        />
      ))}
    </MapContainer>
  );
}
