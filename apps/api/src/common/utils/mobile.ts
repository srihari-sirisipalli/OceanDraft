import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizeMobile(raw: string, defaultCountry = 'IN'): string | null {
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(
    raw,
    defaultCountry as Parameters<typeof parsePhoneNumberFromString>[1],
  );
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164
}

export function maskMobile(e164: string): string {
  if (!e164 || e164.length < 6) return e164;
  const last4 = e164.slice(-4);
  return `${e164.slice(0, 3)}******${last4}`;
}
