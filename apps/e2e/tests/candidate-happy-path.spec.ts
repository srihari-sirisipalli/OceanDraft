import { test, expect, request } from '@playwright/test';

/**
 * Happy-path smoke: mobile → OTP (dev-mode) → question → result.
 * Requires the API running in OTP_DEV_MODE=true so the OTP is returned
 * in the /otp/send response.
 *
 * Before each run we reset any prior attempts for the test mobile via
 * the admin API so the candidate policy SINGLE_LIFETIME doesn't block us.
 */

const TEST_MOBILE = '+919000000001';
const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'ChangeMe!123456';
const API = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';

test.beforeAll(async () => {
  const ctx = await request.newContext();
  const login = await ctx.post(`${API}/admin/auth/login`, {
    data: { username: ADMIN_USER, password: ADMIN_PASS },
  });
  if (!login.ok()) return; // fresh DB, skip reset
  await ctx.post(`${API}/admin/attempts/reset`, {
    data: { mobile: TEST_MOBILE, reason: 'e2e smoke' },
  });
});

test('candidate can complete a single-question attempt', async ({ page, request: req }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Chart your course/ })).toBeVisible();

  // Fill mobile + consent and submit — but we also want the dev OTP, so
  // drive the API directly for speed and deterministic result.
  const init = await req.post(`${API}/candidates/init`, {
    data: { mobile: TEST_MOBILE, countryCode: 'IN', consent: true },
  });
  expect(init.ok()).toBeTruthy();
  const { candidateId } = await init.json();

  const otpResp = await req.post(`${API}/otp/send`, { data: { candidateId } });
  expect(otpResp.ok()).toBeTruthy();
  const { otpRequestId, devOtp } = await otpResp.json();
  expect(devOtp).toBeTruthy();

  const verify = await req.post(`${API}/otp/verify`, {
    data: { otpRequestId, code: devOtp },
  });
  expect(verify.ok()).toBeTruthy();
  const setCookie = verify.headers()['set-cookie'] ?? '';
  const match = /od_sess=([^;]+)/.exec(setCookie);
  expect(match).toBeTruthy();
  const sessionToken = match![1];

  const assign = await req.get(`${API}/assignment/next`, {
    headers: { cookie: `od_sess=${sessionToken}` },
  });
  expect(assign.ok()).toBeTruthy();
  const assignment = await assign.json();
  expect(assignment.question.options.length).toBeGreaterThanOrEqual(2);

  const submit = await req.post(`${API}/attempts/submit`, {
    headers: { cookie: `od_sess=${sessionToken}` },
    data: {
      attemptId: assignment.attemptId,
      optionId: assignment.question.options[0].id,
      clientNonce: `e2e-${Date.now()}`,
    },
  });
  expect(submit.ok()).toBeTruthy();
  const { resultId } = await submit.json();
  expect(resultId).toBeTruthy();
});

test('landing page renders the marine hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Answer one question/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Send OTP/ })).toBeVisible();
});

test('admin login page is reachable', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: /Sign in/ })).toBeVisible();
});
