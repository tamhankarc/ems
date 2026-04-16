"use client";

import { useState, useTransition } from "react";
import { markAttendanceAction } from "@/lib/actions/attendance-actions";

type Props = {
  canMarkIn: boolean;
  canMarkOut: boolean;
  markInAt?: string | null;
  markOutAt?: string | null;
  city?: string | null;
};

export function AttendanceActionsCard({ canMarkIn, canMarkOut, markInAt, markOutAt, city }: Props) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(actionType: "MARK_IN" | "MARK_OUT") {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Browser geolocation is required.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const formData = new FormData();
        formData.set("actionType", actionType);
        formData.set("latitude", String(position.coords.latitude));
        formData.set("longitude", String(position.coords.longitude));

        startTransition(async () => {
          try {
            await markAttendanceAction(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to mark attendance.");
            if ((err instanceof Error ? err.message : "").includes("signed out")) {
              window.location.href = "/login";
            }
          }
        });
      },
      (geoError) => {
        setError(geoError.message || "Please enable browser geolocation.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="section-title">Attendance</h2>
          <p className="section-subtitle">
            Mark-In: 8:30 AM to 3:00 PM IST. Mark-Out: 12:00 PM IST to 8:29 AM IST next day.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`btn ${canMarkIn ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"}`}
            disabled={!canMarkIn || pending}
            onClick={() => submit("MARK_IN")}
          >
            {pending ? "Processing..." : "Mark-In"}
          </button>
          <button
            type="button"
            className={`btn ${canMarkOut ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"}`}
            disabled={!canMarkOut || pending}
            onClick={() => submit("MARK_OUT")}
          >
            {pending ? "Processing..." : "Mark-Out"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In-Time</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{markInAt || "Not marked"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Out-Time</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{markOutAt || "Not marked"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">City</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{city || "—"}</p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
    </section>
  );
}
