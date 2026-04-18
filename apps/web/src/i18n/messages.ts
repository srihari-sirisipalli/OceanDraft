/**
 * i18n scaffold: single-file dictionary, English default.
 * When you're ready for more locales, add another object under a locale key
 * and wrap the root layout with a provider that picks by cookie/header.
 */
export const en = {
  brand: 'OceanDraft',
  nav: {
    adminBridge: 'Admin Bridge',
  },
  landing: {
    eyebrow: '⚓ Single-question assessment',
    title1: 'Chart your course.',
    title2: 'Answer one question.',
    lede:
      "Verify by mobile. Receive exactly one marine & naval architecture question. Submit your answer and see your result instantly — themed in the language of shipyards and blueprints.",
    formTitle: 'Set sail',
    formHelp: "We'll send a 6-digit code to your mobile to verify you.",
    code: 'Code',
    mobile: 'Mobile number',
    consent:
      'I consent to receive a one-time SMS code and to the processing of my mobile number per the privacy notice.',
    sendOtp: 'Send OTP →',
    sending: 'Sending code…',
    invalidMobile: 'Enter a valid mobile number (digits only).',
    needConsent: 'Please accept the consent to continue.',
    features: { verified: 'OTP-verified', one: 'One question', instant: 'Instant result' },
  },
  otp: {
    step: 'Step 2 of 3 · Verification',
    title: 'Enter your code',
    lede: "We sent a 6-digit code to {mobile}. It's valid for 5 minutes.",
    resendIn: 'Resend in {s}s',
    resend: 'Resend code',
    verify: 'Verify & Continue →',
    verifying: 'Verifying…',
    invalid: 'Invalid code.',
    changeMobile: '← Change mobile number',
  },
  result: {
    correctHead: 'Hooray!',
    wrongHead: 'Rough seas',
    returnShore: 'Return to shore',
  },
  dryDock: {
    status: 'Status · Dry dock',
    title: 'The dry dock is empty',
    lede:
      'No active questions right now — the crew is refitting the hull. Please come back soon.',
    cta: 'Back to shore',
  },
  blocked: {
    eyebrow: 'Already sailed',
    title: 'This log is complete',
    lede:
      'This mobile number has already completed an attempt. Attempts are limited per the current policy.',
    cta: 'Return to harbour',
  },
} as const;

export type Messages = typeof en;
export const messages = { en };
export type Locale = keyof typeof messages;
export const DEFAULT_LOCALE: Locale = 'en';

export function t<K extends keyof Messages>(key: K, locale: Locale = DEFAULT_LOCALE): Messages[K] {
  return messages[locale][key];
}

export function format(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
