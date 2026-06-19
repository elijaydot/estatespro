export type WebhookSignatureOptions = {
  secret: string;
  payload: string;
  timestamp: string;
};

export type VerifyWebhookSignatureOptions = WebhookSignatureOptions & {
  signature: string;
  toleranceSeconds?: number;
};

export function shouldRetryWebhookDelivery(statusCode: number | null, attempt: number, maxAttempts: number) {
  if (attempt >= maxAttempts) return false;
  if (statusCode === null) return true;
  if (statusCode >= 500) return true;
  if (statusCode === 408 || statusCode === 429) return true;
  return false;
}

export function computeWebhookBackoffMs(attempt: number, baseMs = 1000, maxMs = 60000) {
  const safeAttempt = Math.max(1, attempt);
  const exponential = baseMs * (2 ** (safeAttempt - 1));
  return Math.min(maxMs, exponential);
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildWebhookSignature(options: WebhookSignatureOptions) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(options.secret);
  const message = `${options.timestamp}.${options.payload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return toHex(new Uint8Array(digest));
}

function timingSafeEquals(a: string, b: string) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}

export async function verifyWebhookSignature(options: VerifyWebhookSignatureOptions) {
  const tolerance = options.toleranceSeconds ?? 300;
  const timestamp = Number(options.timestamp);
  if (!Number.isFinite(timestamp)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > tolerance) return false;

  const expected = await buildWebhookSignature(options);
  return timingSafeEquals(expected, options.signature.toLowerCase());
}
