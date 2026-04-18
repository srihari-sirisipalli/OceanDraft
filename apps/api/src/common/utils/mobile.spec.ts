import { maskMobile, normalizeMobile } from './mobile';

describe('mobile utils', () => {
  it('normalizes an Indian mobile with + prefix', () => {
    expect(normalizeMobile('+919876543210', 'IN')).toBe('+919876543210');
  });

  it('normalizes a national Indian number using default country', () => {
    expect(normalizeMobile('9876543210', 'IN')).toBe('+919876543210');
  });

  it('rejects malformed input', () => {
    expect(normalizeMobile('abc', 'IN')).toBeNull();
    expect(normalizeMobile('', 'IN')).toBeNull();
  });

  it('maskMobile reveals only first 3 and last 4 digits', () => {
    expect(maskMobile('+919876543210')).toBe('+91******3210');
  });

  it('maskMobile tolerates very short inputs', () => {
    expect(maskMobile('123')).toBe('123');
  });
});
