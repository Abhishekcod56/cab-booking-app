
import { Suspense } from "react";
import ShareLocationClient from "./ShareLocationClient";

export default function ShareLocationPage() {
  return (
    <Suspense fallback={<main className="p-6">Loading location sharing...</main>}>
      <ShareLocationClient />
    </Suspense>
  );
}
