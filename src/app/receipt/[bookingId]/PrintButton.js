
"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";

export default function PrintButton({ booking }) {
  const [error, setError] = useState("");

  function downloadReceipt() {
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 55;

      pdf.setFillColor(29, 78, 216);
      pdf.rect(0, 0, pageWidth, 42, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("CabGo", margin, 19);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Ride payment receipt", margin, 29);
      pdf.text("PAID", pageWidth - margin, 29, { align: "right" });

      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(10);

      function addField(label, value) {
        pdf.setFont("helvetica", "bold");
        pdf.text(label, margin, y);
        y += 6;

        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(String(value || "—"), contentWidth);
        const lineHeight = 5;

        if (y + lines.length * lineHeight > 275) {
          pdf.addPage();
          y = 20;
        }

        pdf.text(lines, margin, y);
        y += lines.length * lineHeight + 8;
      }

      addField("Booking ID", booking.id);
      addField("Booking date", booking.createdAt);
      addField("Pickup", booking.pickup);
      addField("Destination", booking.destination);
      addField(
        "Ride fare paid",
        `INR ${Number(booking.fareAmount).toFixed(2)}`
      );
      addField("Payment status", "Paid");

      if (booking.paymentIntentId) {
        addField("Stripe payment reference", booking.paymentIntentId);
      }

      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(9);
      pdf.text(
        "Thank you for riding with CabGo!",
        pageWidth / 2,
        Math.min(y + 5, 285),
        { align: "center" }
      );

      const fileId = String(booking.id).replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`CabGo-receipt-${fileId}.pdf`);
      setError("");
    } catch (downloadError) {
      console.error("Receipt download failed:", downloadError);
      setError("Could not download the receipt. Please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={downloadReceipt}
        className="w-full rounded-xl bg-yellow-400 px-5 py-3 font-bold hover:bg-yellow-500"
      >
        Download Receipt (PDF)
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </>
  );
}
