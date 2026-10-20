"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [28.199, 76.619];

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="background:#16a34a;width:18px;height:18px;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #555"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationIcon = L.divIcon({
  className: "",
  html: `<div style="background:#dc2626;width:18px;height:18px;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #555"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function parseCoordinates(value) {
  if (value && typeof value === "object") {
    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return [latitude, longitude];
    }
  }

  if (typeof value === "string") {
    const match = value.trim().match(
      /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/
    );

    if (match) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);

      if (
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        return [latitude, longitude];
      }
    }
  }

  return null;
}

async function reverseGeocode(latitude, longitude) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");

  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("Could not look up this place name.");
  }

  const data = await response.json();

  return (
    data.name && data.display_name
      ? `${data.name}, ${data.display_name}`
      : data.display_name
  ) || "Selected map location";
}

async function searchPlace(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");

  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("The place search service is unavailable.");
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error("Place not found. Try a more specific address.");
  }

  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);

  return {
    latitude,
    longitude,
    name: results[0].display_name || query,
  };
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

export default function LocationPickerMap({
  pickup = "",
  destination = "",
  onPickupChange,
  onDestinationChange,
  onPickupCoordinatesChange,
  onDestinationCoordinatesChange,
}) {
  const [mode, setMode] = useState("pickup");
  const [pickupPoint, setPickupPoint] = useState(null);
  const [destinationPoint, setDestinationPoint] = useState(null);
  const [pickupName, setPickupName] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function coordinatesText(point) {
    if (!point) return "";

    return `${point[0].toFixed(6)}, ${point[1].toFixed(6)}`;
  }

  async function selectLocation(point, suppliedName = "") {
    const [latitude, longitude] = point;
    const coordinates = { latitude, longitude };

    setMessage("");
    setBusy(true);

    try {
      let name = suppliedName;

      if (!name) {
        try {
          name = await reverseGeocode(latitude, longitude);
        } catch {
          name = "Selected map location";
          setMessage(
            "The coordinates were selected, but the place name could not be loaded."
          );
        }
      }

      if (mode === "pickup") {
        setPickupPoint(point);
        setPickupName(name);
        onPickupChange?.(name);
        onPickupCoordinatesChange?.(coordinates);

        if (!message) {
          setMessage("Pickup location selected.");
        }
      } else {
        setDestinationPoint(point);
        setDestinationName(name);
        onDestinationChange?.(name);
        onDestinationCoordinatesChange?.(coordinates);

        if (!message) {
          setMessage("Destination selected.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    if (!search.trim()) {
      setMessage("Enter a place or address to search.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const result = await searchPlace(search.trim());

      await selectLocation(
        [result.latitude, result.longitude],
        result.name
      );

      setSearch("");
    } catch (error) {
      setMessage(error.message || "Could not find that place.");
      setBusy(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Your browser does not support location access.");
      return;
    }

    setBusy(true);
    setMessage("Getting your current location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await selectLocation(
          [
            position.coords.latitude,
            position.coords.longitude,
          ]
        );
      },
      (error) => {
        setBusy(false);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access or search for a place."
            : "Could not get your current location."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Restore existing location values when the component opens.
  useEffect(() => {
    let cancelled = false;

    async function restoreLocation(value, type) {
      if (!value || typeof value !== "string") return;

      const point = parseCoordinates(value);

      if (point) {
        if (cancelled) return;

        if (type === "pickup") {
          setPickupPoint(point);
          setPickupName("");
        } else {
          setDestinationPoint(point);
          setDestinationName("");
        }

        try {
          const name = await reverseGeocode(point[0], point[1]);

          if (cancelled) return;

          if (type === "pickup") {
            setPickupName(name);
          } else {
            setDestinationName(name);
          }
        } catch {
          // Keep the coordinates visible if reverse lookup fails.
        }

        return;
      }

      // For an existing readable address, find its map coordinates.
      try {
        const result = await searchPlace(value);

        if (cancelled) return;

        const restoredPoint = [
          result.latitude,
          result.longitude,
        ];

        if (type === "pickup") {
          setPickupPoint(restoredPoint);
          setPickupName(value);
        } else {
          setDestinationPoint(restoredPoint);
          setDestinationName(value);
        }
      } catch {
        // Keep the existing address in the form if lookup fails.
        if (!cancelled) {
          if (type === "pickup") setPickupName(value);
          else setDestinationName(value);
        }
      }
    }

    restoreLocation(pickup, "pickup");
    restoreLocation(destination, "destination");

    return () => {
      cancelled = true;
    };
  }, [pickup, destination]);

  const pickupCoordinates = coordinatesText(pickupPoint);
  const destinationCoordinates = coordinatesText(destinationPoint);

  return (
    <section className="space-y-4 rounded-xl border p-4">
      <h2 className="text-lg font-semibold">
        Choose your locations
      </h2>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("pickup")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "pickup"
              ? "bg-green-600 text-white"
              : "border"
          }`}
        >
          Select pickup
        </button>

        <button
          type="button"
          onClick={() => setMode("destination")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "destination"
              ? "bg-red-600 text-white"
              : "border"
          }`}
        >
          Select destination
        </button>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={busy}
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
        >
          Use my location
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search a place or address"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2"
        />

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Search
        </button>
      </form>

      <p className="text-sm text-gray-600">
        {mode === "pickup"
          ? "Click the map to select your pickup."
          : "Click the map to select your destination."}
      </p>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom
        className="z-0 h-[400px] w-full rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onPick={(point) => selectLocation(point)} />

        {pickupPoint && (
          <Marker position={pickupPoint} icon={pickupIcon}>
            <Popup>
              <strong>Pickup</strong>
              <br />
              {pickupName || "Selected pickup"}
              <br />
              {pickupCoordinates}
            </Popup>
          </Marker>
        )}

        {destinationPoint && (
          <Marker
            position={destinationPoint}
            icon={destinationIcon}
          >
            <Popup>
              <strong>Destination</strong>
              <br />
              {destinationName || "Selected destination"}
              <br />
              {destinationCoordinates}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="grid gap-3">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm font-semibold text-green-700">
            Pickup location
          </p>
          <p className="mt-1 break-words text-sm">
            {pickupName || pickup || "Not selected"}
          </p>
          <p className="mt-1 break-words font-mono text-xs text-gray-600">
            {pickupCoordinates || (parseCoordinates(pickup) ? pickup : "Coordinates not selected")}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm font-semibold text-red-700">
            Destination
          </p>
          <p className="mt-1 break-words text-sm">
            {destinationName || destination || "Not selected"}
          </p>
          <p className="mt-1 break-words font-mono text-xs text-gray-600">
            {destinationCoordinates || (parseCoordinates(destination) ? destination : "Coordinates not selected")}
          </p>
        </div>
      </div>

      {busy && (
        <p className="text-sm text-gray-600">
          Looking up location...
        </p>
      )}

      {message && (
        <p role="status" className="text-sm text-blue-700">
          {message}
        </p>
      )}
    </section>
  );
}
