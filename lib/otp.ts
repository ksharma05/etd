export const OTP_TTL_SECONDS = 600; // 10 minutes
export const EMAIL_VERIFIED_TTL_SECONDS = 1800; // 30 minutes
export const RESEND_COOLDOWN_SECONDS = 60; // 1 minute between resend requests
export const MAX_OTP_ATTEMPTS = 5;

export type OtpRecord = {
  code: string;
  attempts: number;
};

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function otpKey(email: string): string {
  return `otp:${email.toLowerCase().trim()}`;
}

export function verifiedKey(email: string): string {
  return `email-verified:${email.toLowerCase().trim()}`;
}

export function cooldownKey(email: string): string {
  return `otp-cooldown:${email.toLowerCase().trim()}`;
}
