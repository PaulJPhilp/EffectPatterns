import { Brand } from "effect";

// Define a branded type for Email
type Email = Brand.Brand<string & { readonly __brand: "Email" }>;

// Function that only accepts Email, not any string
function sendWelcome(email: Email) {
  console.log("Sending welcome to:", email);
}

// Constructing an Email value (unsafe, see next pattern for validation)
const email = ("user@example.com" as unknown) as Email;

sendWelcome(email); // OK