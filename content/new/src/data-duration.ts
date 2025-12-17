import { Duration } from "effect";

// Create durations using helpers
const oneSecond = Duration.seconds(1);
const fiveMinutes = Duration.minutes(5);
const twoHours = Duration.hours(2);

// Add durations
const total = oneSecond < fiveMinutes ? fiveMinutes : oneSecond; // Comparison

// Compare durations
const isLonger = Duration.greaterThan(twoHours, fiveMinutes); // true

// Convert to milliseconds
const ms = Duration.toMillis(fiveMinutes); // 300000