export type Gateway = "paystack" | "flutterwave";
export type Source = "tenant_invoice" | "landlord_invoice" | "guest_booking";
export type PaymentMethod = "card" | "bank_transfer" | "mtn_momo" | "link";

export type PaymentErrorCode =
  | "bad_request"
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "gateway_error"
  | "internal_error";

export type ContractError = {
  code: PaymentErrorCode;
  message: string;
  status: number;
};

export type PaymentErrorEnvelope = {
  success: false;
  error: string;
  errorCode: PaymentErrorCode;
  correlationId?: string;
};

export type CheckoutPayload = {
  source: Source;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  gateway: Gateway | null;
  callbackUrl?: string;
  correlationId?: string;
  bookingToken?: string;
  invoiceId?: string;
  origin?: string;
};

export type VerifyPayload = {
  gateway: Gateway;
  reference: string;
  bookingToken?: string;
  invoiceId?: string;
  correlationId?: string;
  test_mode: boolean;
};

const validSources: Source[] = ["tenant_invoice", "landlord_invoice", "guest_booking"];
const validMethods: PaymentMethod[] = ["card", "bank_transfer", "mtn_momo", "link"];
const validGateways: Gateway[] = ["paystack", "flutterwave"];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toOptionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toNumber(value: unknown, defaultValue = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function parseCheckoutPayload(raw: unknown): { ok: true; value: CheckoutPayload } | { ok: false; error: ContractError } {
  const body = asRecord(raw);
  if (!body) {
    return {
      ok: false,
      error: { code: "bad_request", message: "Request body must be a JSON object", status: 400 },
    };
  }

  const source = toOptionalTrimmedString(body.source) as Source | undefined;
  if (!source || !validSources.includes(source)) {
    return {
      ok: false,
      error: {
        code: "validation_failed",
        message: "source is required and must be one of tenant_invoice, landlord_invoice, guest_booking",
        status: 400,
      },
    };
  }

  const rawMethod = toOptionalTrimmedString(body.paymentMethod) as PaymentMethod | undefined;
  const paymentMethod = rawMethod && validMethods.includes(rawMethod) ? rawMethod : "link";

  const amount = toNumber(body.amount, 0);
  const currency = toOptionalTrimmedString(body.currency) || "NGN";

  const rawGateway = toOptionalTrimmedString(body.gateway) as Gateway | undefined;
  const gateway = rawGateway && validGateways.includes(rawGateway) ? rawGateway : null;

  const callbackUrl = toOptionalTrimmedString(body.callbackUrl);
  const correlationId = toOptionalTrimmedString(body.correlationId);
  const bookingToken = toOptionalTrimmedString(body.bookingToken);
  const invoiceId = toOptionalTrimmedString(body.invoiceId);
  const origin = toOptionalTrimmedString(body.origin);

  return {
    ok: true,
    value: {
      source,
      paymentMethod,
      amount,
      currency,
      gateway,
      callbackUrl,
      correlationId,
      bookingToken,
      invoiceId,
      origin,
    },
  };
}

export function parseVerifyPayload(raw: unknown): { ok: true; value: VerifyPayload } | { ok: false; error: ContractError } {
  const body = asRecord(raw);
  if (!body) {
    return {
      ok: false,
      error: { code: "bad_request", message: "Request body must be a JSON object", status: 400 },
    };
  }

  const testMode = body.test_mode === true;

  const gateway = toOptionalTrimmedString(body.gateway) as Gateway | undefined;
  if (!gateway || !validGateways.includes(gateway)) {
    return {
      ok: false,
      error: {
        code: "validation_failed",
        message: "gateway is required and must be paystack or flutterwave",
        status: 400,
      },
    };
  }

  const reference = toOptionalTrimmedString(body.reference) || toOptionalTrimmedString(body.tx_ref);
  if (!testMode && !reference) {
    return {
      ok: false,
      error: {
        code: "validation_failed",
        message: "reference is required when test_mode is false",
        status: 400,
      },
    };
  }

  const bookingToken = toOptionalTrimmedString(body.bookingToken);
  const invoiceId = toOptionalTrimmedString(body.invoiceId);
  const correlationId = toOptionalTrimmedString(body.correlationId);

  if (!testMode && !bookingToken && !invoiceId) {
    return {
      ok: false,
      error: {
        code: "validation_failed",
        message: "Either bookingToken or invoiceId is required",
        status: 400,
      },
    };
  }

  return {
    ok: true,
    value: {
      gateway,
      reference: reference || "",
      bookingToken,
      invoiceId,
      correlationId,
      test_mode: testMode,
    },
  };
}

export function buildPaymentErrorEnvelope(error: ContractError, correlationId?: string): PaymentErrorEnvelope {
  return {
    success: false,
    error: error.message,
    errorCode: error.code,
    correlationId,
  };
}
