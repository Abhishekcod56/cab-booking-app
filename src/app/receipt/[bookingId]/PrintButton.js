
"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-yellow-400 px-5 py-3 font-bold hover:bg-yellow-500"
    >
      Print / Save as PDF
    </button>
  );
}
