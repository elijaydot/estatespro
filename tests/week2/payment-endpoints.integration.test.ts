import { describe, expect, it } from 'vitest';

import {
  buildPaymentErrorEnvelope,
  parseCheckoutPayload,
  parseVerifyPayload,
  type PaymentErrorCode,
} from '../../supabase/functions/_shared/payment-contract';

type Booking = {
  id: string;
  token: string;
  cancelled: boolean;
  totalAmount: number;
};

type Invoice = {
  id: string;
  amount: number;
  paidAmount: number;
};

type Payment = {
  invoiceId: string;
  reference: string;
  amount: number;
};

type CheckoutRequest = {
  source: 'guest_booking' | 'tenant_invoice';
  amount: number;
  bookingToken?: string;
  invoiceId?: string;
  gateway?: 'paystack' | 'flutterwave';
};

type VerifyRequest = {
  gateway: 'paystack' | 'flutterwave';
  reference: string;
  bookingToken?: string;
  invoiceId?: string;
  test_mode?: boolean;
};

type EndpointError = {
  success: false;
  errorCode: PaymentErrorCode;
  error: string;
  correlationId?: string;
};

type CheckoutResult = {
  success: true;
  reference: string;
  gateway: 'paystack' | 'flutterwave';
  amount: number;
  invoiceId: string;
};

type VerifyResult = {
  success: true;
  verified: true;
  alreadyProcessed: boolean;
  amount: number;
  invoiceId: string;
};

type MockState = {
  booking: Booking;
  invoice: Invoice;
  payments: Payment[];
};

function errorResult(code: PaymentErrorCode, message: string): EndpointError {
  return buildPaymentErrorEnvelope({ code, message, status: 400 });
}

function checkoutEndpoint(request: CheckoutRequest, state: MockState): CheckoutResult | EndpointError {
  const parsed = parseCheckoutPayload({
    source: request.source,
    amount: request.amount,
    bookingToken: request.bookingToken,
    invoiceId: request.invoiceId,
    gateway: request.gateway,
    paymentMethod: 'card',
  });

  if (!parsed.ok) return buildPaymentErrorEnvelope(parsed.error);

  if (parsed.value.source === 'guest_booking') {
    if (!parsed.value.bookingToken) return errorResult('validation_failed', 'bookingToken is required');
    if (state.booking.cancelled) return errorResult('validation_failed', 'Booking is cancelled');

    const remaining = Math.max(0, state.invoice.amount - state.invoice.paidAmount);
    if (remaining <= 0) return errorResult('validation_failed', 'Booking is already fully paid');

    const amount = parsed.value.amount > 0 ? parsed.value.amount : remaining;
    return {
      success: true,
      reference: `BOOK-${state.booking.id}-ref`,
      gateway: parsed.value.gateway || 'paystack',
      amount,
      invoiceId: state.invoice.id,
    };
  }

  if (!parsed.value.invoiceId) return errorResult('validation_failed', 'invoiceId is required');

  const remaining = Math.max(0, state.invoice.amount - state.invoice.paidAmount);
  if (remaining <= 0) return errorResult('validation_failed', 'Invoice is already fully paid');

  const amount = parsed.value.amount > 0 ? parsed.value.amount : remaining;
  return {
    success: true,
    reference: `INV-${state.invoice.id}-ref`,
    gateway: parsed.value.gateway || 'paystack',
    amount,
    invoiceId: state.invoice.id,
  };
}

function verifyEndpoint(request: VerifyRequest, state: MockState, providerAmount: number): VerifyResult | EndpointError {
  const parsed = parseVerifyPayload(request);
  if (!parsed.ok) return buildPaymentErrorEnvelope(parsed.error);

  if (parsed.value.bookingToken && state.booking.cancelled) {
    return errorResult('validation_failed', 'Booking is cancelled');
  }

  const invoiceId = parsed.value.invoiceId || state.invoice.id;

  const duplicate = state.payments.find((payment) => payment.invoiceId === invoiceId && payment.reference === parsed.value.reference);
  if (duplicate) {
    return {
      success: true,
      verified: true,
      alreadyProcessed: true,
      amount: duplicate.amount,
      invoiceId,
    };
  }

  const remaining = Math.max(0, state.invoice.amount - state.invoice.paidAmount);
  if (remaining <= 0) {
    return {
      success: true,
      verified: true,
      alreadyProcessed: true,
      amount: 0,
      invoiceId,
    };
  }

  const amountToApply = Math.min(providerAmount, remaining);
  state.invoice.paidAmount += amountToApply;
  state.payments.push({
    invoiceId,
    reference: parsed.value.reference,
    amount: amountToApply,
  });

  return {
    success: true,
    verified: true,
    alreadyProcessed: false,
    amount: amountToApply,
    invoiceId,
  };
}

describe('Week 2 - payment endpoint integration behavior', () => {
  it('guest checkout then verify applies full payment and marks next verify as duplicate', () => {
    const state: MockState = {
      booking: { id: 'b1', token: 'tok_1', cancelled: false, totalAmount: 1500 },
      invoice: { id: 'inv_1', amount: 1500, paidAmount: 0 },
      payments: [],
    };

    const checkout = checkoutEndpoint({
      source: 'guest_booking',
      amount: 1500,
      bookingToken: state.booking.token,
      gateway: 'paystack',
    }, state);

    expect(checkout.success).toBe(true);
    if (!checkout.success) return;

    const verifyFirst = verifyEndpoint({
      gateway: checkout.gateway,
      reference: checkout.reference,
      bookingToken: state.booking.token,
      test_mode: false,
    }, state, checkout.amount);

    expect(verifyFirst.success).toBe(true);
    if (!verifyFirst.success) return;
    expect(verifyFirst.alreadyProcessed).toBe(false);
    expect(state.invoice.paidAmount).toBe(1500);

    const verifyDuplicate = verifyEndpoint({
      gateway: checkout.gateway,
      reference: checkout.reference,
      bookingToken: state.booking.token,
      test_mode: false,
    }, state, checkout.amount);

    expect(verifyDuplicate.success).toBe(true);
    if (!verifyDuplicate.success) return;
    expect(verifyDuplicate.alreadyProcessed).toBe(true);
    expect(state.invoice.paidAmount).toBe(1500);
  });

  it('returns standardized validation error envelope for cancelled booking checkout', () => {
    const state: MockState = {
      booking: { id: 'b2', token: 'tok_2', cancelled: true, totalAmount: 900 },
      invoice: { id: 'inv_2', amount: 900, paidAmount: 0 },
      payments: [],
    };

    const checkout = checkoutEndpoint({
      source: 'guest_booking',
      amount: 900,
      bookingToken: state.booking.token,
      gateway: 'flutterwave',
    }, state);

    expect(checkout.success).toBe(false);
    if (checkout.success) return;
    expect(checkout.errorCode).toBe('validation_failed');
    expect(checkout.error).toContain('cancelled');
  });

  it('clamps verify amount to remaining balance for partial reconciliation', () => {
    const state: MockState = {
      booking: { id: 'b3', token: 'tok_3', cancelled: false, totalAmount: 1000 },
      invoice: { id: 'inv_3', amount: 1000, paidAmount: 700 },
      payments: [],
    };

    const verify = verifyEndpoint({
      gateway: 'paystack',
      reference: 'INV-ref-3',
      invoiceId: state.invoice.id,
      test_mode: false,
    }, state, 600);

    expect(verify.success).toBe(true);
    if (!verify.success) return;
    expect(verify.amount).toBe(300);
    expect(state.invoice.paidAmount).toBe(1000);
  });

  it('returns standardized validation error for invalid verify payload', () => {
    const state: MockState = {
      booking: { id: 'b4', token: 'tok_4', cancelled: false, totalAmount: 500 },
      invoice: { id: 'inv_4', amount: 500, paidAmount: 0 },
      payments: [],
    };

    const verify = verifyEndpoint({
      gateway: 'paystack',
      reference: '',
      invoiceId: state.invoice.id,
      test_mode: false,
    }, state, 100);

    expect(verify.success).toBe(false);
    if (verify.success) return;
    expect(verify.errorCode).toBe('validation_failed');
  });

  it('prevents guest verify apply when booking gets cancelled after checkout initialization', () => {
    const state: MockState = {
      booking: { id: 'b5', token: 'tok_5', cancelled: false, totalAmount: 1100 },
      invoice: { id: 'inv_5', amount: 1100, paidAmount: 0 },
      payments: [],
    };

    const checkout = checkoutEndpoint({
      source: 'guest_booking',
      amount: 1100,
      bookingToken: state.booking.token,
      gateway: 'paystack',
    }, state);

    expect(checkout.success).toBe(true);
    if (!checkout.success) return;

    state.booking.cancelled = true;

    const verify = verifyEndpoint({
      gateway: 'paystack',
      reference: checkout.reference,
      bookingToken: state.booking.token,
      test_mode: false,
    }, state, 1100);

    expect(verify.success).toBe(false);
    if (verify.success) return;
    expect(verify.errorCode).toBe('validation_failed');
    expect(state.invoice.paidAmount).toBe(0);
  });
});
