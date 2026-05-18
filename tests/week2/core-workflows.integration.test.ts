import { describe, expect, it } from 'vitest';

type Booking = {
  id: string;
  totalAmount: number;
  cancelled: boolean;
};

type Invoice = {
  id: string;
  amount: number;
  paidAmount: number;
};

type WorkflowState = {
  booking: Booking;
  invoice: Invoice;
  references: Set<string>;
};

function initializeCheckout(state: WorkflowState) {
  if (state.booking.cancelled) {
    return { ok: false as const, reason: 'booking_cancelled' };
  }

  const remaining = Math.max(0, state.invoice.amount - state.invoice.paidAmount);
  if (remaining <= 0) {
    return { ok: false as const, reason: 'already_paid' };
  }

  return { ok: true as const, remaining };
}

function verifyAndApplyPayment(state: WorkflowState, reference: string, providerAmount: number) {
  if (state.references.has(reference)) {
    return { ok: true as const, alreadyProcessed: true, paidAmount: state.invoice.paidAmount };
  }

  const remaining = Math.max(0, state.invoice.amount - state.invoice.paidAmount);
  if (remaining <= 0) {
    return { ok: true as const, alreadyProcessed: true, paidAmount: state.invoice.paidAmount };
  }

  const amountToApply = Math.min(providerAmount, remaining);
  state.references.add(reference);
  state.invoice.paidAmount += amountToApply;

  return { ok: true as const, alreadyProcessed: false, paidAmount: state.invoice.paidAmount };
}

describe('Week 2 - core workflow integration tests', () => {
  it('guest booking checkout -> verify -> invoice paid flow works', () => {
    const state: WorkflowState = {
      booking: { id: 'b1', totalAmount: 1500, cancelled: false },
      invoice: { id: 'inv1', amount: 1500, paidAmount: 0 },
      references: new Set<string>(),
    };

    const checkout = initializeCheckout(state);
    expect(checkout.ok).toBe(true);
    if (checkout.ok) {
      expect(checkout.remaining).toBe(1500);
    }

    const verify = verifyAndApplyPayment(state, 'BOOK-ref-1', 1500);
    expect(verify.ok).toBe(true);
    expect(verify.alreadyProcessed).toBe(false);
    expect(state.invoice.paidAmount).toBe(1500);
  });

  it('duplicate verify call is idempotent and does not double charge', () => {
    const state: WorkflowState = {
      booking: { id: 'b2', totalAmount: 1000, cancelled: false },
      invoice: { id: 'inv2', amount: 1000, paidAmount: 0 },
      references: new Set<string>(),
    };

    const first = verifyAndApplyPayment(state, 'INV-ref-1', 1000);
    const second = verifyAndApplyPayment(state, 'INV-ref-1', 1000);

    expect(first.alreadyProcessed).toBe(false);
    expect(second.alreadyProcessed).toBe(true);
    expect(state.invoice.paidAmount).toBe(1000);
  });

  it('blocks checkout for cancelled booking', () => {
    const state: WorkflowState = {
      booking: { id: 'b3', totalAmount: 1200, cancelled: true },
      invoice: { id: 'inv3', amount: 1200, paidAmount: 0 },
      references: new Set<string>(),
    };

    const checkout = initializeCheckout(state);
    expect(checkout).toEqual({ ok: false, reason: 'booking_cancelled' });
  });
});
