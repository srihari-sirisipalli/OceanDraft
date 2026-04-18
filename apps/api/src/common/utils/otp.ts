import { randomInt, randomBytes, createHash, timingSafeEqual } from 'crypto';

export function generateOtp(length = 6): string {
  const max = 10 ** length;
  const n = randomInt(0, max);
  return n.toString().padStart(length, '0');
}

export function hashOtp(otp: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${otp}`).digest('hex');
}

export function generateSalt(bytes = 16): string {
  return randomBytes(bytes).toString('hex');
}

export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
