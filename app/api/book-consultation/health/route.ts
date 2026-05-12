import { NextResponse } from "next/server";

export function GET() {
  const gasConfigured = Boolean(process.env.GAS_WEB_APP_URL);
  const timeoutMs = Number(process.env.BOOKING_PROXY_TIMEOUT_MS ?? 12000);

  return NextResponse.json(
    {
      success: gasConfigured,
      service: "book-consultation-proxy",
      message: gasConfigured ? "Booking proxy is configured." : "Missing GAS_WEB_APP_URL.",
      checks: {
        gasWebAppUrlConfigured: gasConfigured,
        timeoutMs,
      },
    },
    { status: gasConfigured ? 200 : 503 },
  );
}
