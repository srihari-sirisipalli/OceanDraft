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

export function maskMobile(value: string): string {
  if (!value) return value;
  if (value.startsWith('GUEST-')) {
    return `Guest · ${value.slice(6, 10).toUpperCase()}`;
  }
  if (value.length < 6) return value;
  const last4 = value.slice(-4);
  return `${value.slice(0, 3)}******${last4}`;
}
