import { BigDecimal } from "effect";

// Create BigDecimal values
const a = BigDecimal.make("0.1");
const b = BigDecimal.make("0.2");

// Add, subtract, multiply, divide
const sum = BigDecimal.add(a, b); // BigDecimal("0.3")
const product = BigDecimal.mul(a, b); // BigDecimal("0.02")

// Compare values
const isEqual = BigDecimal.equals(sum, BigDecimal.make("0.3")); // true

// Convert to string or number
const asString = BigDecimal.toString(sum); // "0.3"
const asNumber = BigDecimal.toNumber(sum); // 0.3