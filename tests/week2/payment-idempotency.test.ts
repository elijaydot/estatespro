import { describe, expect, it } from 'vitest';

type ExistingPayment = { id: string; invoiceId: string; reference: string };

function isDuplicateReference(
  payments: ExistingPayment[],
  invoiceId: string,
  reference: string,
): ExistingPayment | null {
  return payments.find((payment) => payment.invoiceId === invoiceId && payment.reference === reference) ?? null;
}

function clampToRemaining(verifiedAmount: number, invoiceAmount: number, paidAmount: number): number {
  const remaining = Math.max(0, invoiceAmount - paidAmount);
  return Math.min(verifiedAmount, remaining);
}

describe('Week 2 - payment idempotency checks', () => {
  it('detects duplicate verification by invoice+reference', () => {
    const payments: ExistingPayment[] = [
      { id: 'p_1', invoiceId: 'inv_1', reference: 'INV-abc-123' },
    ];

    const duplicate = isDuplicateReference(payments, 'inv_1', 'INV-abc-123');
    expect(duplicate?.id).toBe('p_1');
  });

  it('does not treat same reference on different invoice as duplicate', () => {
    const payments: ExistingPayment[] = [
      { id: 'p_1', invoiceId: 'inv_1', reference: 'INV-abc-123' },
    ];

    const duplicate = isDuplicateReference(payments, 'inv_2', 'INV-abc-123');
    expect(duplicate).toBeNull();
  });

  it('clamps provider verified amount to invoice remaining balance', () => {
    const amountToRecord = clampToRemaining(1250, 1000, 200);
    expect(amountToRecord).toBe(800);
  });

  it('returns zero when invoice is already fully paid', () => {
    const amountToRecord = clampToRemaining(500, 1000, 1000);
    expect(amountToRecord).toBe(0);
  });
});
