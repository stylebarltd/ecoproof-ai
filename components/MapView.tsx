"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { MapPlace } from "@/lib/stampPlaces";

const HONEY = "#e8a317", SAGE = "#8fa073";

function FitBounds({ places }: { places: MapPlace[] }) {
  const map = useMap();
  useEffect(() => {
    if (places.length) map.fitBounds(places.map((p) => [p.lat, p.lng] as [number, number]), { padding: [60, 60], maxZoom: 15 });
  }, [map, places]);
  return null;
}

function FlyTo({ place }: { place: MapPlace | null }) {
  const map = useMap();
  useEffect(() => { if (place) map.setView([place.lat, place.lng], 16); }, [map, place]);
  return null;
}

export default function MapView({ places, selectedId, onSelect, focus = null }: { places: MapPlace[]; selectedId: string | null; onSelect: (key: string) => void; focus?: MapPlace | null }) {
  return (
    <MapContainer center={[18.7945, 98.9858]} zoom={13} className="h-full w-full" zoomControl={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds places={places} />
      <FlyTo place={focus} />
      {places.map((p) => {
        const key = `${p.id}:${p.locationId}`;
        return (
          <CircleMarker
            key={key}
            center={[p.lat, p.lng]}
            radius={key === selectedId ? 15 : 11}
            pathOptions={{ color: key === selectedId ? "#201e1d" : "#ffffff", weight: key === selectedId ? 3 : 2.5, fillColor: p.kind === "cafe" ? "#d67f48" : p.kind === "market" ? SAGE : HONEY, fillOpacity: 0.95 }}
            eventHandlers={{ click: () => onSelect(key) }}
          />
        );
      })}
    </MapContainer>
  );
}
