import {
  constantTimeEqual,
  generateOtp,
  generateSalt,
  hashOtp,
  sha256,
} from './otp';

describe('OTP utils', () => {
  it('generateOtp returns a zero-padded numeric string of requested length', () => {
    for (let i = 0; i < 200; i++) {
      const otp = generateOtp(6);
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it('hashOtp is deterministic given same salt and value', () => {
    const salt = generateSalt();
    expect(hashOtp('123456', salt)).toEqual(hashOtp('123456', salt));
  });

  it('hashOtp differs on different salts', () => {
    expect(hashOtp('123456', 'a')).not.toEqual(hashOtp('123456', 'b'));
  });

  it('sha256 is hex and 64 chars', () => {
    expect(sha256('hello')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('constantTimeEqual detects mismatch', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
