import { z } from "zod";

export const bookingConfig = {
  timezone: "Asia/Kolkata",
  capacity: 3,
  daysAhead: 14,
  // Confirmed Monday–Saturday hours; Sunday is closed. Edit these windows to change the schedule.
  // Lunch is blocked from 13:00 to 14:00. No daily slot records are stored.
  workingHours: [1, 2, 3, 4, 5, 6].flatMap(day => [
    { day, start: "09:00", end: "13:00" },
    { day, start: "14:00", end: "21:00" },
  ]),
  services: {
    men: ["Haircut", "Beard", "Hair + Beard", "Hair Styling", "Hair Colour"],
    women: ["Women's Haircut", "Women's Hair Colour", "Women's Hair Styling", "Hair Transformation", "Hair Treatment Result"],
  },
};

export type Gender = "men" | "women";
export type BookingStatus = "CONFIRMED" | "CANCELLED" | "EXPIRED";
export type Booking = {
  id: string; booking_reference: string; appointment_date: string;
  slot_start: string; slot_end: string; customer_name: string;
  gender: Gender; mobile_number: string; service: string; status: BookingStatus;
  created_at: string; updated_at: string;
};
export type Slot = { start: string; end: string; remaining: number };
export type AvailabilityResponse = {
  ready: boolean; message?: string; today: string;
  dates: { date: string; closed: boolean; reason?: string }[];
  selectedDate: string; slots: Slot[]; announcements: string[];
};

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Choose a valid date.");
export const detailsSchema = z.object({
  date: dateSchema,
  start: z.string().regex(/^(?:[01]\d|2[0-3]):00$/),
  name: z.string().trim().min(2, "Enter your full name.").max(100).refine(v => !/[\u0000-\u001f\u007f]/.test(v)),
  gender: z.enum(["men", "women"]),
  mobile: z.string().transform(v => v.replace(/[\s()-]/g, "").replace(/^(?:\+91|91)(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."))
    .transform(v => `+91${v}`),
  service: z.string().min(1).max(100),
}).strict().refine(v => bookingConfig.services[v.gender].includes(v.service), {
  path: ["service"], message: "Choose an available service for the selected gender.",
});
export type BookingDetails = z.output<typeof detailsSchema>;

export function indiaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: bookingConfig.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function dateRange(today = indiaToday()) {
  return Array.from({ length: bookingConfig.daysAhead + 1 }, (_, i) => {
    const day = new Date(`${today}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + i);
    return day.toISOString().slice(0, 10);
  });
}
export function generateSlots(date: string, now = new Date(), hours = bookingConfig.workingHours): Slot[] {
  if (!dateRange(indiaToday(now)).includes(date)) return [];
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const result = new Map<string, Slot>();
  const minutes = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5));
  const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:00`;
  for (const window of hours.filter(h => h.day === weekday)) {
    if (!/^(?:[01]\d|2[0-3]):00$/.test(window.start) || !/^(?:[01]\d|2[0-4]):00$/.test(window.end)) continue;
    for (let start = minutes(window.start); start + 60 <= Math.min(minutes(window.end), 1440); start += 60) {
      if (new Date(`${date}T${clock(start)}:00+05:30`).valueOf() <= now.valueOf()) continue;
      result.set(clock(start), { start: clock(start), end: clock(start + 60), remaining: bookingConfig.capacity });
    }
  }
  return [...result.values()].sort((a, b) => a.start.localeCompare(b.start));
}
export function formatDate(date: string, short = false) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: short ? "short" : "long", ...(short ? {} : { year: "numeric" }), timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
export function formatTime(time: string) {
  const hour = Number(time.slice(0, 2));
  return `${String(hour % 12 || 12).padStart(2, "0")}:00 ${hour >= 12 && hour < 24 ? "PM" : "AM"}`;
}
export function slotLabel(start: string, end: string) { return `${formatTime(start)} — ${formatTime(end)}`; }

// Derive the public hours from exactly the same windows used by booking validation.
export function studioHours() {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const groups: { first: number; last: number; time: string }[] = [];
  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    const time = bookingConfig.workingHours.filter(w => w.day === day).map(w => slotLabel(w.start, w.end)).join(" · ") || "Closed";
    const previous = groups.at(-1);
    if (previous && previous.time === time) previous.last = day;
    else groups.push({ first: day, last: day, time });
  }
  return groups.map(g => ({ days: g.first === g.last ? names[g.first] : names[g.first] + "–" + names[g.last], time: g.time }));
}