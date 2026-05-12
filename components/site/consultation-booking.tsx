"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { BookingCalendar } from "@/components/site/booking-calendar";
import { BookingStepper } from "@/components/site/booking-stepper";
import { TurnstileWidget } from "@/components/site/turnstile-widget";
import {
  apiBookingResponseSchema,
  bookingSchema,
  budgetRangeSchema,
  serviceTypeSchema,
  timelineSchema,
  type BookingPayload,
} from "@/lib/booking-schema";

type BookingState = BookingPayload;
type OtpStep = "idle" | "pending" | "verified";

const stepLabels = ["Service", "Scope", "Schedule"];

const initialState: BookingState = {
  service: "web-development",
  budgetRange: "100k-300k-inr",
  timeline: "2-6-weeks",
  preferredDate: "",
  preferredTime: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  name: "",
  email: "",
  phone: "",
  projectGoals: "",
};

function getBookingErrorMessage(
  status: number,
  data?: {
    success?: boolean;
    code?: string;
    message?: string;
  },
) {
  const code = data?.code;

  if (status === 403 && code === "TURNSTILE_FAILED") {
    return "Bot verification failed. Please refresh the page and try again.";
  }

  if (status === 403 && code === "EMAIL_NOT_VERIFIED") {
    return "Your email session expired. Please go back and verify your email again.";
  }

  if (status === 409 && code === "SLOT_UNAVAILABLE") {
    return "That time slot was just booked. Please choose another date or time.";
  }

  if (status === 409 && code === "DUPLICATE_REQUEST") {
    return "This request looks like a duplicate. Check your email for the existing confirmation.";
  }

  if (status === 400) {
    return "Some booking details are invalid. Please review the form and try again.";
  }

  if (status === 502) {
    return "Booking service is temporarily unavailable. Please retry in a moment.";
  }

  return data?.message || "Something went wrong while booking. Please try again.";
}

export function ConsultationBooking() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BookingState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Consultation booked successfully.");

  // Slot availability (step 3)
  const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set());
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // OTP verification (step 2 sub-state)
  const [otpStep, setOtpStep] = useState<OtpStep>("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);

  // Turnstile bot protection (step 3)
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  const serviceOptions = useMemo(() => serviceTypeSchema.options, []);
  const budgetOptions = useMemo(() => budgetRangeSchema.options, []);
  const timelineOptions = useMemo(() => timelineSchema.options, []);

  // Fetch slot availability when step 3 is reached
  useEffect(() => {
    if (step !== 3) return;

    let cancelled = false;

    async function fetchAvailability() {
      setIsLoadingAvailability(true);
      try {
        const res = await fetch("/api/slot-availability");
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { success?: boolean; takenSlots?: unknown };
        if (cancelled) return;
        if (data.success && Array.isArray(data.takenSlots)) {
          setTakenSlots(new Set(data.takenSlots as string[]));
        }
      } catch {
        // Silently fail — server-side SLOT_UNAVAILABLE is the authority
      } finally {
        if (!cancelled) setIsLoadingAvailability(false);
      }
    }

    void fetchAvailability();
    return () => {
      cancelled = true;
    };
  }, [step]);

  // OTP resend countdown
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendCooldown]);

  function setField<K extends keyof BookingState>(field: K, value: BookingState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    // Invalidate OTP verification if email changes
    if (field === "email") {
      setOtpStep("idle");
      setOtpCode("");
      setOtpError("");
    }
  }

  function validateCurrentStep() {
    const fieldsByStep: Record<number, (keyof BookingState)[]> = {
      1: ["service"],
      2: ["budgetRange", "timeline", "name", "email", "phone", "projectGoals"],
      3: ["preferredDate", "preferredTime", "timezone"],
    };

    const currentFields = fieldsByStep[step];
    const partial = bookingSchema.pick(
      Object.fromEntries(currentFields.map((field) => [field, true])) as Record<(typeof currentFields)[number], true>,
    );
    const result = partial.safeParse(form);
    if (result.success) return true;

    const nextErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string") nextErrors[path] = issue.message;
    }
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return false;
  }

  async function sendOtp() {
    setIsSendingOtp(true);
    setOtpError("");
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = (await res.json()) as { success: boolean; message: string; cooldownSeconds?: number };

      if (!res.ok) {
        setOtpError(data.message ?? "Failed to send code. Please try again.");
        return;
      }

      setOtpStep("pending");
      setOtpCode("");
      setOtpResendCooldown(60);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function verifyOtp() {
    if (otpCode.length !== 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code: otpCode }),
      });
      const data = (await res.json()) as { success: boolean; message: string };

      if (!res.ok) {
        setOtpError(data.message ?? "Incorrect code. Please try again.");
        // Expired or locked — let user request a fresh code
        if (res.status === 410 || res.status === 429) {
          setOtpStep("idle");
          setOtpCode("");
        }
        return;
      }

      setOtpStep("verified");
      setOtpError("");
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    setIsSuccess(false);

    const validation = bookingSchema.safeParse(form);
    if (!validation.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string") nextErrors[path] = issue.message;
      }
      setErrors(nextErrors);
      setStep(1);
      if (nextErrors.budgetRange || nextErrors.timeline || nextErrors.name || nextErrors.email || nextErrors.projectGoals) {
        setStep(2);
      }
      if (nextErrors.preferredDate || nextErrors.preferredTime || nextErrors.timezone) {
        setStep(3);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/book-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validation.data, turnstileToken }),
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      const parsed = apiBookingResponseSchema.safeParse(body);
      if (!response.ok || !parsed.success || !parsed.data.success) {
        setServerError(getBookingErrorMessage(response.status, parsed.success ? parsed.data : undefined));

        if (response.status === 409 && parsed.success && parsed.data.code === "SLOT_UNAVAILABLE") {
          setTakenSlots((prev) => {
            const next = new Set(prev);
            next.add(`${form.preferredDate}|${form.preferredTime}`);
            return next;
          });
        }

        if (response.status === 403 && parsed.success && parsed.data.code === "EMAIL_NOT_VERIFIED") {
          setOtpStep("idle");
          setOtpCode("");
          setStep(2);
        }

        if (response.status === 403 && parsed.success && parsed.data.code === "TURNSTILE_FAILED") {
          setTurnstileToken("");
        }

        return;
      }

      setSuccessMessage(parsed.data.message);
      setIsSuccess(true);
      setErrors({});
      setForm(initialState);
      setStep(1);
      setOtpStep("idle");
      setOtpCode("");
      setTurnstileToken("");
    } catch {
      setServerError("Network issue while submitting. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function goNext() {
    if (step === 2) {
      if (!validateCurrentStep()) return;
      if (otpStep === "idle") {
        void sendOtp();
        return;
      }
      if (otpStep === "pending") {
        // User must verify OTP before continuing
        return;
      }
      // otpStep === "verified" — advance to step 3
      setStep(3);
      return;
    }
    if (!validateCurrentStep()) return;
    setStep((prev) => Math.min(prev + 1, 3));
  }

  function goBack() {
    // If OTP is pending, cancel verification and return to form-filling sub-state
    if (step === 2 && otpStep === "pending") {
      setOtpStep("idle");
      setOtpCode("");
      setOtpError("");
      return;
    }
    setStep((prev) => Math.max(prev - 1, 1));
  }

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);

  return (
    <section
      id="book-consultation"
      className="mx-auto my-16 w-full max-w-7xl rounded-3xl border border-olive-300/80 bg-white/70 p-6 shadow-sm lg:p-10 dark:border-olive-800 dark:bg-olive-950/45"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olive-700 dark:text-olive-300">Book Consultation</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-olive-950 dark:text-white">Plan your project in 3 quick steps</h2>
        </div>
        {isSubmitting ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-olive-300 px-3 py-1 text-xs text-olive-800 dark:border-olive-700 dark:text-olive-200">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-olive-600 dark:bg-olive-400" />
            Sending
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <BookingStepper currentStep={step} labels={stepLabels} />
      </div>

      <form className="mt-6 space-y-6" onSubmit={submitForm} noValidate>
        {/* ── Step 1: Service ── */}
        {step === 1 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {serviceOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setField("service", option)}
                className={`rounded-2xl border p-4 text-left transition ${
                  form.service === option
                    ? "border-olive-600 bg-olive-100 dark:border-olive-400 dark:bg-olive-900/80"
                    : "border-olive-300/70 bg-white hover:bg-olive-100/60 dark:border-olive-800 dark:bg-olive-950/40 dark:hover:bg-olive-900/60"
                }`}
              >
                <p className="text-sm font-semibold capitalize text-olive-950 dark:text-white">{option.replace("-", " ")}</p>
              </button>
            ))}
          </div>
        ) : null}

        {/* ── Step 2: Scope + OTP verification ── */}
        {step === 2 ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-900 dark:text-olive-100">Budget Range</span>
                <select
                  value={form.budgetRange}
                  onChange={(event) => setField("budgetRange", event.target.value as BookingState["budgetRange"])}
                  className="w-full rounded-xl border border-olive-300 bg-white px-3 py-2 text-sm text-olive-900 dark:border-olive-800 dark:bg-olive-950/40 dark:text-olive-100"
                >
                  {budgetOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("-", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-900 dark:text-olive-100">Timeline</span>
                <select
                  value={form.timeline}
                  onChange={(event) => setField("timeline", event.target.value as BookingState["timeline"])}
                  className="w-full rounded-xl border border-olive-300 bg-white px-3 py-2 text-sm text-olive-900 dark:border-olive-800 dark:bg-olive-950/40 dark:text-olive-100"
                >
                  {timelineOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("-", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-900 dark:text-olive-100">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  className="w-full rounded-xl border border-olive-300 bg-white px-3 py-2 text-sm text-olive-900 dark:border-olive-800 dark:bg-olive-950/40 dark:text-olive-100"
                />
                {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-900 dark:text-olive-100">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                  disabled={otpStep !== "idle"}
                  className="w-full rounded-xl border border-olive-300 bg-white px-3 py-2 text-sm text-olive-900 disabled:opacity-60 dark:border-olive-800 dark:bg-olive-950/40 dark:text-olive-100"
                />
                {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-900 dark:text-olive-100">Phone (optional)</span>
                <input
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  className="w-full rounded-xl border border-olive-300 bg-white px-3 py-2 text-sm text-olive-900 dark:border-olive-800 dark:bg-olive-950/40 dark:text-olive-100"
                />
                {errors.phone ? <p className="text-xs text-red-600">{errors.phone}</p> : null}
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-olive-900 dark:text-olive-100">Project goals</span>
                <textarea
                  value={form.projectGoals}
                  onChange={(event) => setField("projectGoals", event.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-olive-300 bg-white px-3 py-2 text-sm text-olive-900 dark:border-olive-800 dark:bg-olive-950/40 dark:text-olive-100"
                />
                {errors.projectGoals ? <p className="text-xs text-red-600">{errors.projectGoals}</p> : null}
              </label>
            </div>

            {/* OTP verification section */}
            {otpStep === "pending" ? (
              <div className="rounded-2xl border border-olive-200 bg-olive-50/60 p-5 dark:border-olive-800 dark:bg-olive-950/40">
                <p className="text-sm font-medium text-olive-900 dark:text-olive-100">Verify your email</p>
                <p className="mt-1 text-sm text-olive-600 dark:text-olive-400">
                  Enter the 6-digit code sent to <span className="font-semibold text-olive-800 dark:text-olive-200">{form.email}</span>
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className="w-36 rounded-xl border border-olive-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-[0.2em] text-olive-900 dark:border-olive-700 dark:bg-olive-950/60 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void verifyOtp()}
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                    className="rounded-xl bg-olive-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-olive-200 dark:text-olive-950"
                  >
                    {isVerifyingOtp ? "Verifying…" : "Verify Code"}
                  </button>
                </div>
                {otpError ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{otpError}</p> : null}
                <button
                  type="button"
                  onClick={() => void sendOtp()}
                  disabled={otpResendCooldown > 0 || isSendingOtp}
                  className="mt-3 text-xs text-olive-600 underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:text-olive-400 dark:text-olive-400"
                >
                  {isSendingOtp ? "Sending…" : otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : "Resend code"}
                </button>
              </div>
            ) : null}

            {otpStep === "verified" ? (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                Email verified — <span className="font-medium">{form.email}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Step 3: Schedule ── */}
        {step === 3 ? (
          <div className="space-y-4">
            <BookingCalendar
              preferredDate={form.preferredDate}
              preferredTime={form.preferredTime}
              onDateSelect={(value) => setField("preferredDate", value)}
              onTimeSelect={(value) => setField("preferredTime", value)}
              takenSlots={takenSlots}
              isLoadingAvailability={isLoadingAvailability}
            />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-olive-900 dark:text-olive-100">Timezone</span>
              <input
                value={form.timezone}
                onChange={(event) => setField("timezone", event.target.value)}
                className="w-full rounded-xl border border-olive-300 bg-white px-3 py-2 text-sm text-olive-900 dark:border-olive-800 dark:bg-olive-950/40 dark:text-olive-100"
              />
            </label>
            {errors.preferredDate ? <p className="text-xs text-red-600">{errors.preferredDate}</p> : null}
            {errors.preferredTime ? <p className="text-xs text-red-600">{errors.preferredTime}</p> : null}

            {turnstileSiteKey ? (
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onVerify={handleTurnstileVerify}
                onExpire={handleTurnstileExpire}
              />
            ) : null}
          </div>
        ) : null}

        {serverError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30">{serverError}</p> : null}

        {isSuccess ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <span className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-300" />
            {successMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || isSubmitting}
            className="rounded-full border border-olive-300 px-4 py-2 text-sm font-semibold text-olive-800 disabled:opacity-50 dark:border-olive-700 dark:text-olive-200"
          >
            Back
          </button>

          {step < 3 ? (
            otpStep === "pending" ? (
              <p className="text-xs text-olive-500 dark:text-olive-400">Verify your email above to continue</p>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={isSubmitting || isSendingOtp}
                className="rounded-full bg-olive-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-olive-200 dark:text-olive-950"
              >
                {isSendingOtp ? "Sending code…" : otpStep === "verified" ? "Continue to Schedule" : "Continue"}
              </button>
            )
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-olive-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-olive-200 dark:text-olive-950"
            >
              {isSubmitting ? "Submitting…" : "Confirm Consultation"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
