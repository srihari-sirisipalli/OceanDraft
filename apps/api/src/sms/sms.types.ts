export interface SmsSendRequest {
  to: string; // E.164
  text: string;
  templateId?: string;
  context?: Record<string, string>;
}

export interface SmsSendResult {
  provider: string;
  ok: boolean;
  providerMessageId?: string;
  latencyMs: number;
  raw?: unknown;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(req: SmsSendRequest): Promise<SmsSendResult>;
  isHealthy(): Promise<boolean>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
