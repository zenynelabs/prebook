// Mirrors parseRegistration in apps/api/src/index.ts so people see problems before
// sending. The API stays the authority and re-checks every field.
import type { FormEvent } from "react";

export const registrationFields = ["name", "phone", "email", "address", "passengers"] as const;
export type RegistrationField = (typeof registrationFields)[number];
export type RegistrationValues = Record<RegistrationField, string>;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "+91 98765-43210" and "09876543210" both become "9876543210". */
export const mobileDigits = (value: string) =>
  value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");

/** What a mobile field may hold: at most 10 digits, so a pasted +91 or 0 is dropped first. */
export const phoneKeys = (value: string) => mobileDigits(value).slice(0, 10);

/** Shared by every uncontrolled mobile field. No maxLength: it would cut a pasted +91 number before cleaning. */
export const mobileInput = {
  type: "tel",
  inputMode: "numeric",
  autoComplete: "tel-national",
  pattern: "[6-9][0-9]{9}",
  title: "10-digit mobile number",
  onInput: (event: FormEvent<HTMLInputElement>) => {
    event.currentTarget.value = phoneKeys(event.currentTarget.value);
  },
} as const;

export function validateRegistration(values: RegistrationValues): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const name = values.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Enter your full name.";
  else if (name.length > 80) errors.name = "Keep your name under 80 characters.";
  else if (!NAME.test(name)) errors.name = "Use letters only, without numbers or symbols.";

  const phone = mobileDigits(values.phone);
  if (!phone) errors.phone = "Enter your mobile number.";
  else if (phone.length !== 10) errors.phone = "Enter a 10-digit mobile number.";
  else if (!/^[6-9]/.test(phone)) errors.phone = "Indian mobile numbers start with 6, 7, 8 or 9.";

  const email = values.email.trim();
  if (email && (email.length > 120 || !EMAIL.test(email)))
    errors.email = "Enter a valid email, like name@example.com, or leave it blank.";

  const address = values.address.trim();
  if (address.length < 10) errors.address = "Enter your full address with area and pincode.";
  else if (address.length > 300) errors.address = "Keep your address under 300 characters.";
  else if (!/\p{L}/u.test(address)) errors.address = "Include your street and area, not just numbers.";

  const passengers = Number(values.passengers);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 6)
    errors.passengers = "Choose between 1 and 6 passengers.";
  return errors;
}
