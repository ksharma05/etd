import { NextResponse } from "next/server";
import { z } from "zod";

import { EMAIL_VERIFIED_TTL_SECONDS, MAX_OTP_ATTEMPTS, otpKey, type OtpRecord, verifiedKey } from "@/lib/otp";
import { redis } from "@/lib/redis";

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
});

function jsonResponse(status: number, message: string, extras?: Record<string, unknown>) {
  return NextResponse.json({ success: status < 400, message, ...extras }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, "Invalid JSON payload.");
  }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, "A valid email and 6-digit numeric code are required.");
  }

  const { email, code } = parsed.data;

  const record = await redis.get<OtpRecord>(otpKey(email));

  if (!record) {
    return jsonResponse(410, "Verification code has expired. Please request a new one.");
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await redis.del(otpKey(email));
    return jsonResponse(429, "Too many failed attempts. Please request a new code.");
  }

  if (record.code !== code) {
    const ttl = await redis.ttl(otpKey(email));
    await redis.set(otpKey(email), { ...record, attempts: record.attempts + 1 }, { ex: Math.max(ttl, 1) });

    const remaining = MAX_OTP_ATTEMPTS - (record.attempts + 1);
    return jsonResponse(400, `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`, {
      remaining,
    });
  }

  // Code is correct — delete OTP record, mark email as verified for 30 min
  await redis.del(otpKey(email));
  await redis.set(verifiedKey(email), "1", { ex: EMAIL_VERIFIED_TTL_SECONDS });

  return jsonResponse(200, "Email verified successfully.");
}

export function GET() {
  return jsonResponse(405, "Method not allowed.");
}
