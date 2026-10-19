"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { kindOf } from "@/lib/placeKinds";
import type { MapPlace } from "@/lib/stampPlaces";

const HONEY = "#e8a317";

/** A round pin in the kind's colour; cafés, restaurants and hotels with stars carry a badge ("4★"). */
function pinIcon(p: MapPlace, selected: boolean) {
  const d = selected ? 30 : 22;
  const badge = p.stars && p.stars.stars > 0
    ? `<span style="position:absolute;left:${d - 8}px;top:-9px;padding:1px 5px;border-radius:999px;background:#201e1d;color:${HONEY};font:800 11px/16px Figtree,system-ui,sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${p.stars.stars}★</span>`
    : "";
  return L.divIcon({
    className: "",
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
    html: `<span style="position:relative;display:block;width:${d}px;height:${d}px"><span style="display:block;width:100%;height:100%;border-radius:999px;background:${kindOf(p.kind)?.colour ?? HONEY};border:${selected ? "3px solid #201e1d" : "2.5px solid #fff"};box-shadow:0 2px 6px rgba(0,0,0,.3);box-sizing:border-box"></span>${badge}</span>`,
  });
}

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
          <Marker
            key={key}
            position={[p.lat, p.lng]}
            icon={pinIcon(p, key === selectedId)}
            zIndexOffset={key === selectedId ? 1000 : 0}
            title={p.stars?.stars ? `${p.name}, ${p.stars.stars} eco stars` : p.name}
            eventHandlers={{ click: () => onSelect(key) }}
          />
        );
      })}
    </MapContainer>
  );
}
