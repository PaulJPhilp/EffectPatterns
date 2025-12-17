import { Duration } from "effect";

// Create a Date for the current instant
const now = new Date();

// Parse from ISO string
const parsed = new Date("2024-07-19T12:34:56Z");

// Add or subtract durations
const oneHour = Duration.toMillis(Duration.hours(1));
const inOneHour = new Date(now.getTime() + oneHour);
const oneHourAgo = new Date(now.getTime() - oneHour);

// Format as ISO string
const iso = now.toISOString(); // e.g., "2024-07-19T23:33:19.000Z"

// Compare DateTimes
const isBefore = oneHourAgo.getTime() < now.getTime(); // true