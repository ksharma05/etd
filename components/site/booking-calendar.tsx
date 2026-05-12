"use client";

import { useMemo } from "react";

type BookingCalendarProps = {
  preferredDate: string;
  preferredTime: string;
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
  takenSlots?: Set<string>;
  isLoadingAvailability?: boolean;
};

const timeSlots = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prettyDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(date);
}

export function BookingCalendar({
  preferredDate,
  preferredTime,
  onDateSelect,
  onTimeSelect,
  takenSlots,
  isLoadingAvailability,
}: BookingCalendarProps) {
  const nextDates = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index + 1);
      return toDateString(date);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive-700 dark:text-olive-300">Select Date</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {nextDates.map((date) => {
            const isSelected = preferredDate === date;
            const allTaken = takenSlots ? timeSlots.every((s) => takenSlots.has(`${date}|${s}`)) : false;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onDateSelect(date)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "border-olive-600 bg-olive-100 text-olive-950 dark:border-olive-400 dark:bg-olive-900 dark:text-white"
                    : allTaken
                      ? "border-stone-200 bg-stone-50 text-stone-400 dark:border-stone-800 dark:bg-stone-900/30 dark:text-stone-500"
                      : "border-olive-300/70 bg-white text-olive-700 hover:bg-olive-100/70 dark:border-olive-800 dark:bg-olive-950/40 dark:text-olive-200 dark:hover:bg-olive-900/60"
                }`}
              >
                <span>{prettyDate(date)}</span>
                {allTaken ? (
                  <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">Fully booked</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive-700 dark:text-olive-300">Select Time</p>
          {isLoadingAvailability ? (
            <span className="animate-pulse text-xs text-olive-500 dark:text-olive-400">Checking availability…</span>
          ) : null}
        </div>
        <div
          className={`mt-2 grid grid-cols-2 gap-2 transition-opacity sm:grid-cols-4 ${isLoadingAvailability ? "pointer-events-none opacity-40" : ""}`}
        >
          {timeSlots.map((slot) => {
            const isSelected = preferredTime === slot;
            const slotKey = preferredDate ? `${preferredDate}|${slot}` : null;
            const isTaken = slotKey ? (takenSlots?.has(slotKey) ?? false) : false;
            return (
              <button
                key={slot}
                type="button"
                disabled={isTaken}
                onClick={() => onTimeSelect(slot)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  isTaken
                    ? "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400 line-through decoration-stone-400 dark:border-stone-800 dark:bg-stone-900/30 dark:text-stone-600 dark:decoration-stone-600"
                    : isSelected
                      ? "border-olive-600 bg-olive-100 text-olive-950 dark:border-olive-400 dark:bg-olive-900 dark:text-white"
                      : "border-olive-300/70 bg-white text-olive-700 hover:bg-olive-100/70 dark:border-olive-800 dark:bg-olive-950/40 dark:text-olive-200 dark:hover:bg-olive-900/60"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
