import { digitsOnly } from "./document";

/** E.164 BR without '+'. Null when the input is not DDD + number. */
export function normalizeWhatsapp(raw: string): string | null {
  const digits = digitsOnly(raw);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits;
  }
  return null;
}
