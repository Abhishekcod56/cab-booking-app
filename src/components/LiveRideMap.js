
"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

const DEFAULT_CENTER = [28.199, 76.619];

function MapUpdater({ points, driverLocation }) {
  const map = useMap();

  useEffect(() => {
    const validPoints = [
      ...points,
      ...(driverLocation
        ? [[driverLocation.latitude, driverLocation.longitude]]
        : []),
    ].filter(
      (point) =>
        Array.isArray(point) &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1])
    );

    if (validPoints.length === 1) {
      map.setView(validPoints[0], 15);
    } else if (validPoints.length > 1) {
      map.fitBounds(validPoints, { padding: [35, 35], maxZoom: 15 });
    }
  }, [map, points, driverLocation]);

  return null;
}

async function geocodeAddress(address) {
  if (!address) return null;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString());

    if (!response.ok) return null;

    const results = await response.json();

    if (!results.length) return null;

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return [latitude, longitude];
  } catch (error) {
    console.error("Address lookup failed:", error);
    return null;
  }
}

export default function LiveRideMap({
  pickup,
  destination,
  driverLocation,
}) {
  const [pickupPoint, setPickupPoint] = useState(null);
  const [destinationPoint, setDestinationPoint] = useState(null);
  const [route, setRoute] = useState([]);
  const [mapMessage, setMapMessage] = useState("Loading map locations...");

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      setPickupPoint(null);
      setDestinationPoint(null);
      setRoute([]);
      setMapMessage("Finding pickup and destination...");

      const pickupCoords = await geocodeAddress(pickup);

      // Avoid sending address searches too rapidly to the public geocoder.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const destinationCoords = await geocodeAddress(destination);

      if (cancelled) return;

      setPickupPoint(pickupCoords);
      setDestinationPoint(destinationCoords);

      if (!pickupCoords || !destinationCoords) {
        setMapMessage(
          "Could not locate one or both addresses. The driver location can still be shown."
        );
        return;
      }

      setMapMessage("Loading route...");
    }

    loadLocations();

    return () => {
      cancelled = true;
    };
  }, [pickup, destination]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      if (!pickupPoint || !destinationPoint) {
        setRoute([]);
        return;
      }

      try {
        const [startLat, startLon] = pickupPoint;
        const [endLat, endLon] = destinationPoint;

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${startLon},${startLat};${endLon},${endLat}` +
          "?overview=full&geometries=geojson";

        const response = await fetch(url);
        if (!response.ok) throw new Error("Route service unavailable");

        const data = await response.json();
        const coordinates = data.routes?.[0]?.geometry?.coordinates;

        if (!cancelled && coordinates) {
          setRoute(coordinates.map(([lon, lat]) => [lat, lon]));
          setMapMessage("Route loaded");
        } else if (!cancelled) {
          setMapMessage("No driving route was found.");
        }
      } catch (error) {
        if (!cancelled) {
          setMapMessage("Route unavailable. Map markers are still available.");
        }
      }
    }

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [pickupPoint, destinationPoint]);

  const points = [pickupPoint, destinationPoint].filter(Boolean);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200">
      <div className="flex flex-wrap gap-3 bg-white p-3 text-sm text-gray-700">
        <span>🟢 Pickup</span>
        <span>🔴 Destination</span>
        <span>🔵 Driver</span>
      </div>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom
        style={{ height: "420px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater points={points} driverLocation={driverLocation} />

        {pickupPoint && (
          <CircleMarker
            center={pickupPoint}
            radius={9}
            pathOptions={{ color: "#15803d", fillColor: "#22c55e", fillOpacity: 1 }}
          >
            <Popup>Pickup: {pickup}</Popup>
          </CircleMarker>
        )}

        {destinationPoint && (
          <CircleMarker
            center={destinationPoint}
            radius={9}
            pathOptions={{ color: "#b91c1c", fillColor: "#ef4444", fillOpacity: 1 }}
          >
            <Popup>Destination: {destination}</Popup>
          </CircleMarker>
        )}

        {route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.8 }}
          />
        )}

        {driverLocation &&
          Number.isFinite(driverLocation.latitude) &&
          Number.isFinite(driverLocation.longitude) && (
            <CircleMarker
              center={[
                driverLocation.latitude,
                driverLocation.longitude,
              ]}
              radius={10}
              pathOptions={{
                color: "#1d4ed8",
                fillColor: "#60a5fa",
                fillOpacity: 1,
              }}
            >
              <Popup>Your driver’s latest location</Popup>
            </CircleMarker>
          )}
      </MapContainer>

      <p className="bg-white px-3 py-2 text-sm text-gray-600">
        {mapMessage}
      </p>
    </div>
  );
}
