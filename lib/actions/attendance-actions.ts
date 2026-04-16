"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clearSession, requireUserForAction } from "@/lib/auth";
import { canMarkAttendance } from "@/lib/permissions";
import { reverseGeocodeCity } from "@/lib/geo";
import { getAttendanceWorkDateKey, getDayBoundsUtcFromIstDateKey, isMarkInWindow, isMarkOutWindow } from "@/lib/ist";

function toNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function markAttendanceAction(formData: FormData) {
  const user = await requireUserForAction();

  if (!canMarkAttendance(user)) {
    throw new Error("You do not have permission to mark attendance.");
  }

  const actionType = String(formData.get("actionType") || "");
  const latitude = toNumber(formData.get("latitude"));
  const longitude = toNumber(formData.get("longitude"));

  if (!latitude || !longitude) {
    await clearSession();
    throw new Error("Browser geolocation is required. You have been signed out. Please enable geolocation and sign in again.");
  }

  const workDateKey = getAttendanceWorkDateKey();
  const { startUtc, endUtc } = getDayBoundsUtcFromIstDateKey(workDateKey);
  const existing = await db.attendanceLog.findMany({
    where: {
      userId: user.id,
      attendanceDate: { gte: startUtc, lt: endUtc },
    },
    orderBy: { markedAt: "asc" },
  });

  if (actionType === "MARK_IN") {
    if (!isMarkInWindow()) throw new Error("Mark-In is allowed only between 8:30 AM and 3:00 PM IST.");
    if (existing.some((row) => row.type === "MARK_IN")) throw new Error("Mark-In is already recorded for this attendance day.");
  } else if (actionType === "MARK_OUT") {
    if (!isMarkOutWindow()) throw new Error("Mark-Out is allowed only between 12:00 PM IST and 8:29 AM IST next day.");
    if (!existing.some((row) => row.type === "MARK_IN")) throw new Error("Mark-In must be recorded before Mark-Out.");
    if (existing.some((row) => row.type === "MARK_OUT")) throw new Error("Mark-Out is already recorded for this attendance day.");
  } else {
    throw new Error("Invalid attendance action.");
  }

  const city = await reverseGeocodeCity(latitude, longitude);

  await db.attendanceLog.create({
    data: {
      userId: user.id,
      attendanceDate: startUtc,
      type: actionType,
      latitude,
      longitude,
      city,
    },
  });

  revalidatePath("/dashboard");
}
