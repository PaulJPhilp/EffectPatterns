import { DateTime, Duration } from "effect";

// Create a DateTime for the current instant
const now = DateTime.now(); // DateTime

// Parse from ISO string
const parsed = DateTime.fromISOString("2024-07-19T12:34:56Z"); // DateTime

// Add or subtract durations
const inOneHour = DateTime.plus(now, Duration.hours(1));
const oneHourAgo = DateTime.minus(now, Duration.hours(1));

// Format as ISO string
const iso = DateTime.toISOString(now); // e.g., "2024-07-19T23:33:19.000Z"

// Compare DateTimes
const isBefore = DateTime.before(oneHourAgo, now); // true