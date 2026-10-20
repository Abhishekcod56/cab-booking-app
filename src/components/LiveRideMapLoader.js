
"use client";

import dynamic from "next/dynamic";

const LiveRideMap = dynamic(() => import("./LiveRideMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-105 items-center justify-center rounded-xl border">
      Loading ride map...
    </div>
  ),
});

export default function LiveRideMapLoader(props) {
  return <LiveRideMap {...props} />;
}
