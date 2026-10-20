
"use client";

export default function MapView({
  latitude,
  longitude,
  title = "Map location",
}) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return (
      <div className="rounded-xl border bg-gray-50 p-6 text-gray-600">
        Map coordinates are not available yet.
      </div>
    );
  }

  const bbox = [
    lon - 0.01,
    lat - 0.01,
    lon + 0.01,
    lat + 0.01,
  ].join("%2C");

  const mapUrl =
    `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
    `&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <section className="overflow-hidden rounded-xl border">
      <h2 className="bg-white p-3 font-semibold">{title}</h2>

      <iframe
        title={title}
        src={mapUrl}
        width="100%"
        height="350"
        style={{ border: 0 }}
        loading="lazy"
      />

      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`}
        target="_blank"
        rel="noreferrer"
        className="block bg-white p-3 text-sm text-blue-700 underline"
      >
        Open full map
      </a>
    </section>
  );
}
