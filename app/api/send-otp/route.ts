import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { cooldownKey, generateOtpCode, OTP_TTL_SECONDS, otpKey, RESEND_COOLDOWN_SECONDS, type OtpRecord } from "@/lib/otp";
import { redis } from "@/lib/redis";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpSchema = z.object({
  email: z.string().email(),
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

  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, "A valid email address is required.");
  }

  const { email } = parsed.data;

  // Rate-limit: block resend until cooldown expires
  const hasCooldown = await redis.get(cooldownKey(email));
  if (hasCooldown) {
    const ttl = await redis.ttl(cooldownKey(email));
    return jsonResponse(429, `Please wait ${ttl} second${ttl === 1 ? "" : "s"} before requesting a new code.`, {
      cooldownSeconds: ttl,
    });
  }

  const code = generateOtpCode();
  const record: OtpRecord = { code, attempts: 0 };

  await redis.set(otpKey(email), record, { ex: OTP_TTL_SECONDS });
  await redis.set(cooldownKey(email), "1", { ex: RESEND_COOLDOWN_SECONDS });

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from: `Exponent Tech and Digital <${fromEmail}>`,
    to: email,
    subject: "Your verification code",
    html: buildOtpEmailHtml(code),
  });

  if (error) {
    console.error("send_otp_resend_error", error);
    await redis.del(otpKey(email));
    await redis.del(cooldownKey(email));
    return jsonResponse(502, "Failed to send verification email. Please try again.");
  }

  return jsonResponse(200, "Verification code sent.");
}

export function GET() {
  return jsonResponse(405, "Method not allowed.");
}

function buildOtpEmailHtml(code: string): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;color:#111827;">
      <h2 style="margin:0 0 12px;font-size:20px;">Verify your email</h2>
      <p style="margin:0 0 16px;color:#374151;">Use the code below to confirm your email address for your consultation booking with Exponent Tech and Digital.</p>
      <div style="margin:24px 0;text-align:center;">
        <span style="display:inline-block;background:#f3f4f6;border-radius:12px;padding:16px 40px;font-size:36px;font-weight:700;letter-spacing:0.25em;color:#111827;font-family:monospace;">${code}</span>
      </div>
      <p style="margin:0;color:#6b7280;font-size:13px;">This code expires in 10 minutes. If you didn&rsquo;t request this, you can safely ignore this email.</p>
    </div>
  `;
}
