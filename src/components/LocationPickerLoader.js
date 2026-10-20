
"use client";

import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("./LocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-100 items-center justify-center rounded-xl border">
        Loading location picker...
      </div>
    ),
  }
);

export default function LocationPickerLoader(props) {
  return <LocationPicker {...props} />;
}
