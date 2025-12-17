import { BigDecimal } from "effect";

// Create BigDecimal values
const a = BigDecimal.fromNumber(0.1);
const b = BigDecimal.fromNumber(0.2);

// Add, subtract, multiply, divide
const sum = a.pipe(BigDecimal.sum(b)); // BigDecimal with 0.3
const product = a.pipe(BigDecimal.multiply(b)); // BigDecimal with 0.02

// Compare values
const isEqual = BigDecimal.equals(sum, BigDecimal.fromNumber(0.3)); // boolean

// Convert to string
const asString = a.toString(); // "0.1"