import { NextResponse } from "next/server";
import { z } from "zod";

import { bookingSchema } from "@/lib/booking-schema";
import { verifiedKey } from "@/lib/otp";
import { redis } from "@/lib/redis";

const bookingRequestSchema = bookingSchema.extend({
  turnstileToken: z.string().min(1),
});

async function verifyTurnstileToken(token: string, remoteIp?: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn("TURNSTILE_SECRET_KEY not set — skipping Turnstile verification.");
    return true;
  }
  const form = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

const budgetMap: Record<z.infer<typeof bookingSchema>["budgetRange"], string> = {
  "under-100k-inr": "Under INR 1L",
  "100k-300k-inr": "INR 1L - 3L",
  "300k-700k-inr": "INR 3L - 7L",
  "700k-plus-inr": "INR 7L+",
};

const timelineMap: Record<z.infer<typeof bookingSchema>["timeline"], string> = {
  "within-2-weeks": "Within 2 weeks",
  "2-6-weeks": "2-6 weeks",
  "6-12-weeks": "6-12 weeks",
  flexible: "Flexible",
};

const gasPayloadSchema = z.object({
  service: z.enum(["web-development", "digital-media", "graphic-design"]),
  budget: z.string().min(1),
  timeline: z.string().min(1),
  goals: z.string().min(1),
  notes: z.string().optional(),
  slot: z.object({
    startIso: z.string().datetime(),
    endIso: z.string().datetime(),
  }),
  contact: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    company: z.string().min(1),
    phone: z.string().optional(),
  }),
});

const gasResponseSchema = z.object({
  ok: z.boolean(),
  code: z.string(),
  message: z.string(),
  data: z
    .object({
      eventId: z.string().optional(),
      meetUrl: z.string().url().optional(),
      slotStartIso: z.string().datetime().optional(),
      slotEndIso: z.string().datetime().optional(),
      leadEmail: z.string().email().optional(),
      calendarId: z.string().optional(),
    })
    .nullable()
    .optional(),
  timestamp: z.string().datetime().optional(),
});

const normalizedApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  code: z.string(),
  meetingLink: z.string().url().optional(),
  eventId: z.string().optional(),
  leadEmail: z.string().email().optional(),
  raw: z.unknown().optional(),
});

function statusFromProviderCode(code: string, success: boolean) {
  if (success) return 200;
  if (code === "DUPLICATE_REQUEST" || code === "SLOT_UNAVAILABLE") return 409;
  if (code === "VALIDATION_ERROR" || code === "INVALID_JSON") return 400;
  if (code === "CONFIG_ERROR" || code === "INTERNAL_ERROR") return 502;
  if (code === "CALENDAR_ERROR" || code === "SHEET_ERROR" || code === "EMAIL_ERROR") return 502;
  return 502;
}

function jsonResponse(status: number, message: string, extras?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: status >= 200 && status < 300,
      message,
      ...extras,
    },
    { status },
  );
}

function buildSlotIsoStrings(preferredDate: string, preferredTime: string) {
  const start = new Date(`${preferredDate}T${preferredTime}:00`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function POST(request: Request) {
  const gasUrl = process.env.GAS_WEB_APP_URL;
  const timeoutMs = Number(process.env.BOOKING_PROXY_TIMEOUT_MS ?? 12000);

  if (!gasUrl) {
    return jsonResponse(500, "Booking service is not configured.");
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return jsonResponse(400, "Invalid JSON payload.");
  }

  const parsedPayload = bookingRequestSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return jsonResponse(400, "Booking form data is invalid.", {
      validationErrors: parsedPayload.error.flatten(),
    });
  }

  const { turnstileToken } = parsedPayload.data;

  // Guard 1: Turnstile bot verification
  const remoteIp = (request as Request & { headers: Headers }).headers.get("CF-Connecting-IP");
  const turnstileOk = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!turnstileOk) {
    return jsonResponse(403, "Bot verification failed. Please refresh the page and try again.", {
      code: "TURNSTILE_FAILED",
    });
  }

  // Guard 2: Email OTP verification
  const emailVerified = await redis.get(verifiedKey(parsedPayload.data.email));
  if (!emailVerified) {
    return jsonResponse(403, "Email not verified. Please go back and complete the OTP verification.", {
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  const slot = buildSlotIsoStrings(parsedPayload.data.preferredDate, parsedPayload.data.preferredTime);
  if (!slot) {
    return jsonResponse(400, "Invalid preferred date/time values.");
  }

  const proxyPayload = gasPayloadSchema.parse({
    service: parsedPayload.data.service,
    budget: budgetMap[parsedPayload.data.budgetRange],
    timeline: timelineMap[parsedPayload.data.timeline],
    goals: parsedPayload.data.projectGoals,
    notes: "",
    slot,
    contact: {
      name: parsedPayload.data.name,
      email: parsedPayload.data.email,
      company: parsedPayload.data.name, // phase-4 payload has no company field; use name as fallback
      phone: parsedPayload.data.phone || "",
    },
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const gasResponse = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proxyPayload),
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
      console.error("consultation_proxy_gas_http_error", {
        status: gasResponse.status,
        statusText: gasResponse.statusText,
      });
      return jsonResponse(502, "Booking provider failed to process request.");
    }

    const parsedGas = gasResponseSchema.safeParse(gasJson);
    if (!parsedGas.success) {
      return jsonResponse(502, "Booking provider returned an invalid response contract.", {
        providerResponse: gasJson,
      });
    }

    const normalized = normalizedApiResponseSchema.parse({
      success: parsedGas.data.ok,
      code: parsedGas.data.code,
      message: parsedGas.data.message,
      meetingLink: parsedGas.data.data?.meetUrl,
      eventId: parsedGas.data.data?.eventId,
      leadEmail: parsedGas.data.data?.leadEmail,
      raw: parsedGas.data,
    });

    const status = statusFromProviderCode(normalized.code, normalized.success);
    return NextResponse.json(normalized, { status });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const isTimeout = errorName === "AbortError";

    console.error("consultation_proxy_request_error", {
      errorName,
      timedOut: isTimeout,
    });

    if (isTimeout) {
      return jsonResponse(502, "Booking request timed out. Please try again.");
    }

    return jsonResponse(500, "Unexpected booking error. Please retry.");
  } finally {
    clearTimeout(timeoutId);
  }
}

export function GET() {
  return jsonResponse(405, "Method not allowed.");
}
