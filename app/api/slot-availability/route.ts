import { NextResponse } from "next/server";
import { z } from "zod";

const TIME_SLOTS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

const gasAvailabilityResponseSchema = z.object({
  ok: z.boolean(),
  code: z.string(),
  message: z.string(),
  data: z
    .object({
      takenSlots: z.array(z.string()),
    })
    .nullable()
    .optional(),
});

function buildWindowIso(daysAhead: number): { startIso: string; endIso: string } {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(end.getDate() + daysAhead + 1);
  end.setHours(23, 59, 59, 999);

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * Converts a Google Calendar event start ISO string to a "YYYY-MM-DD|HH:MM" slot key.
 * Returns null if the time doesn't align to a known time slot.
 */
function isoToSlotKey(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const time = `${hours}:${minutes}`;

  if (!TIME_SLOTS.includes(time)) return null;
  return `${year}-${month}-${day}|${time}`;
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET() {
  const gasUrl = process.env.GAS_WEB_APP_URL;
  const timeoutMs = Number(process.env.BOOKING_PROXY_TIMEOUT_MS ?? 12000);

  if (!gasUrl) {
    return jsonError(500, "Booking service is not configured.");
  }

  const { startIso, endIso } = buildWindowIso(12);
  const url = `${gasUrl}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const gasResponse = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    let gasJson: unknown = null;
    try {
      gasJson = await gasResponse.json();
    } catch {
      gasJson = null;
    }

    if (!gasResponse.ok) {
      console.error("slot_availability_gas_http_error", {
        status: gasResponse.status,
        statusText: gasResponse.statusText,
      });
      return jsonError(502, "Availability service unavailable.");
    }

    const parsed = gasAvailabilityResponseSchema.safeParse(gasJson);
    if (!parsed.success || !parsed.data.ok || !parsed.data.data) {
      console.error("slot_availability_invalid_response", { gasJson });
      return jsonError(502, "Availability service returned an unexpected response.");
    }

    const takenSlots = parsed.data.data.takenSlots
      .map(isoToSlotKey)
      .filter((key): key is string => key !== null);

    return NextResponse.json(
      { success: true, takenSlots },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error("slot_availability_request_error", { isTimeout });
    return jsonError(502, isTimeout ? "Availability check timed out." : "Failed to fetch slot availability.");
  } finally {
    clearTimeout(timeoutId);
  }
}

export function POST() {
  return jsonError(405, "Method not allowed.");
}
