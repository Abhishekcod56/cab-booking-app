
const BASE_FARE = 50;
const PRICE_PER_KM = 15;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCoordinates(value) {
  // Accept { latitude, longitude } objects.
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
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
      return { latitude, longitude };
    }

    return null;
  }

  // Accept coordinate strings such as "28.199000, 76.619000".
  if (typeof value === "string") {
    const match = value.trim().match(
      /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/
    );

    if (match) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        return { latitude, longitude };
      }
    }
  }

  return null;
}

async function getCoordinates(address) {
  const directCoordinates = parseCoordinates(address);

  if (directCoordinates) {
    return directCoordinates;
  }

  if (typeof address !== "string" || !address.trim()) {
    throw new Error("Please provide a valid address or map location.");
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");

  url.searchParams.set("q", address.trim());
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "CabGoRideApp/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Address lookup service is unavailable.");
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error(`Address not found: ${address}`);
  }

  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("The address lookup returned invalid coordinates.");
  }

  return { latitude, longitude };
}

export async function calculateFare(pickup, destination) {
  if (
    pickup === undefined ||
    pickup === null ||
    destination === undefined ||
    destination === null
  ) {
    throw new Error("Pickup and destination are required.");
  }

  const start = await getCoordinates(pickup);

  // Avoid rapidly submitting two address searches to public Nominatim.
  // Coordinate-based selections don't require a geocoding request.
  if (!parseCoordinates(pickup) && !parseCoordinates(destination)) {
    await wait(1100);
  }

  const end = await getCoordinates(destination);

  const routeUrl =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.longitude},${start.latitude};` +
    `${end.longitude},${end.latitude}` +
    "?overview=false&alternatives=false&steps=false";

  const response = await fetch(routeUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Driving route service is unavailable.");
  }

  const result = await response.json();
  const route = result.routes?.[0];

  if (
    result.code !== "Ok" ||
    !route ||
    !Number.isFinite(route.distance) ||
    route.distance <= 0
  ) {
    throw new Error("No driving route was found.");
  }

  const distanceKm = Math.round((route.distance / 1000) * 100) / 100;

  const fareAmount =
    Math.round((BASE_FARE + distanceKm * PRICE_PER_KM) * 100) / 100;

  return {
    distanceKm,
    fareAmount,
    baseFare: BASE_FARE,
    pricePerKm: PRICE_PER_KM,
    pickupCoordinates: start,
    destinationCoordinates: end,
  };
}
