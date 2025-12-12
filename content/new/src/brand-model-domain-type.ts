import { Brand } from "effect";

// Define a branded type for Email
type Email = Brand.Branded<string, "Email">;

// Function that only accepts Email, not any string
function sendWelcome(email: Email) {
  // ...
}

// Constructing an Email value (unsafe, see next pattern for validation)
const email = "user@example.com" as Email;

sendWelcome(email); // OK
sendWelcome("not-an-email"); // Type error!