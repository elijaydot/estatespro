import { describe, expect, it, vi } from 'vitest';

type RetryResult<T> = {
  value: T;
  attempts: number;
};

async function retryGateway<T>(
  task: () => Promise<T>,
  maxAttempts: number,
): Promise<RetryResult<T>> {
  let attempts = 0;
  let lastError: unknown;

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const value = await task();
      return { value, attempts };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gateway retry exhausted');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Gateway timeout')), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

type BookingStatus = 'pending' | 'cancelled';
type PaymentStatus = 'pending' | 'partial' | 'paid';

type BookingRaceState = {
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  invoiceAmount: number;
};

function applyVerificationToBooking(state: BookingRaceState, verifiedAmount: number): BookingRaceState {
  if (state.bookingStatus === 'cancelled') {
    return state;
  }

  const remaining = Math.max(0, state.invoiceAmount - state.paidAmount);
  const amountToApply = Math.min(verifiedAmount, remaining);
  const newPaidAmount = state.paidAmount + amountToApply;

  const paymentStatus: PaymentStatus = newPaidAmount >= state.invoiceAmount ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'pending');

  return {
    ...state,
    paidAmount: newPaidAmount,
    paymentStatus,
  };
}

describe('Week 2 - payment reliability checks', () => {
  it('retries transient gateway failures and eventually succeeds', async () => {
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Temporary upstream 502'))
      .mockRejectedValueOnce(new Error('Temporary upstream 502'))
      .mockResolvedValue('ok');

    const result = await retryGateway(task, 3);

    expect(result.value).toBe('ok');
    expect(result.attempts).toBe(3);
    expect(task).toHaveBeenCalledTimes(3);
  });

  it('fails after maximum retry attempts', async () => {
    const task = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('Permanent failure'));

    await expect(retryGateway(task, 2)).rejects.toThrow('Permanent failure');
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('times out slow gateway request', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('too-late'), 50);
    });

    await expect(withTimeout(slowPromise, 10)).rejects.toThrow('Gateway timeout');
  });

  it('applies only remaining amount for partial reconciliation', () => {
    const state: BookingRaceState = {
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      paidAmount: 700,
      invoiceAmount: 1000,
    };

    const next = applyVerificationToBooking(state, 600);

    expect(next.paidAmount).toBe(1000);
    expect(next.paymentStatus).toBe('paid');
  });

  it('ignores payment verification when booking is already cancelled', () => {
    const state: BookingRaceState = {
      bookingStatus: 'cancelled',
      paymentStatus: 'pending',
      paidAmount: 0,
      invoiceAmount: 800,
    };

    const next = applyVerificationToBooking(state, 500);

    expect(next).toEqual(state);
  });
});
