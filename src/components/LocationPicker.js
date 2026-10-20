
"use client";

import dynamic from "next/dynamic";

const LocationPickerMap = dynamic(
  () => import("./LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">
          Choose your locations
        </h2>
        <div className="flex h-100 items-center justify-center rounded-lg bg-gray-100">
          <p className="text-sm text-gray-600">
            Loading map...
          </p>
        </div>
      </section>
    ),
  }
);

export default function LocationPicker(props) {
  return <LocationPickerMap {...props} />;
}
