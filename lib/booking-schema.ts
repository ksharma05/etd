import { z } from "zod";

export const serviceTypeSchema = z.enum(["web-development", "digital-media", "graphic-design"]);

export const budgetRangeSchema = z.enum([
  "under-100k-inr",
  "100k-300k-inr",
  "300k-700k-inr",
  "700k-plus-inr",
]);

export const timelineSchema = z.enum(["within-2-weeks", "2-6-weeks", "6-12-weeks", "flexible"]);

export const bookingSchema = z.object({
  service: serviceTypeSchema,
  budgetRange: budgetRangeSchema,
  timeline: timelineSchema,
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use date format YYYY-MM-DD"),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, "Use time format HH:MM"),
  timezone: z.string().min(2).max(64),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(24).optional().or(z.literal("")),
  projectGoals: z.string().trim().min(20).max(1200),
});

export const apiBookingResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  code: z.string().optional(),
  meetingLink: z.string().url().optional(),
  leadId: z.string().optional(),
  eventId: z.string().optional(),
  leadEmail: z.string().email().optional(),
  raw: z.unknown().optional(),
});

export type ServiceType = z.infer<typeof serviceTypeSchema>;
export type BudgetRange = z.infer<typeof budgetRangeSchema>;
export type Timeline = z.infer<typeof timelineSchema>;
export type BookingPayload = z.infer<typeof bookingSchema>;
export type ApiBookingResponse = z.infer<typeof apiBookingResponseSchema>;
