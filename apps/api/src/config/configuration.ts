export const configuration = () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  corsOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),
  cookieSecret: process.env.SESSION_COOKIE_SECRET ?? 'dev-cookie-secret',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
  candidateSessionTtlSeconds: Number(process.env.CANDIDATE_SESSION_TTL_SECONDS ?? 900),
  adminSessionIdleMinutes: Number(process.env.ADMIN_SESSION_IDLE_MINUTES ?? 30),
  otp: {
    provider: process.env.SMS_PROVIDER ?? 'dev',
    devMode: (process.env.OTP_DEV_MODE ?? 'true') === 'true',
    length: Number(process.env.OTP_LENGTH ?? 6),
    expirySeconds: Number(process.env.OTP_EXPIRY_SECONDS ?? 300),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60),
    maxResendsPer15m: Number(process.env.OTP_MAX_RESENDS_PER_15M ?? 3),
    maxVerifyAttempts: Number(process.env.OTP_MAX_VERIFY_ATTEMPTS ?? 5),
  },
  business: {
    captchaEnabled: (process.env.CAPTCHA_ENABLED ?? 'false') === 'true',
    attemptPolicy: (process.env.ATTEMPT_POLICY ?? 'SINGLE_LIFETIME') as
      | 'SINGLE_LIFETIME'
      | 'SINGLE_PER_DAY'
      | 'UNLIMITED',
    assignmentMode: (process.env.ASSIGNMENT_MODE ?? 'RANDOM_ACTIVE') as
      | 'ALL_SAME'
      | 'RANDOM_ACTIVE'
      | 'RANDOM_BY_CATEGORY'
      | 'MANUAL_BY_MOBILE'
      | 'ONE_TIME_USE_POOL',
    revealCorrectOnFail:
      (process.env.RESULT_REVEAL_CORRECT_ON_FAIL ?? 'false') === 'true',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
