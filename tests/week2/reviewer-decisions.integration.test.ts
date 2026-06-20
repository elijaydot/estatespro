import { describe, expect, it } from 'vitest';
import {
  applyPublisherVerificationDecision,
  applyVerificationDocumentDecision,
  buildDecisionPayload,
} from '../../src/lib/reviewerDecisions';

type MockResult = {
  id: string;
  state: string;
};

function createMockClient(response: MockResult, error: unknown = null) {
  const calls: Array<{ table: string; payload: Record<string, unknown>; filters: Array<{ column: string; value: unknown }> }> = [];

  const client = {
    from: <T>(table: string) => ({
      update: (payload: Record<string, unknown>) => {
        const call = {
          table,
          payload,
          filters: [] as Array<{ column: string; value: unknown }>,
        };
        calls.push(call);

        const chain = {
          eq: (column: string, value: unknown) => {
            call.filters.push({ column, value });
            return chain;
          },
          select: (_columns: string) => ({
            single: async () => ({ data: response as unknown as T, error }),
          }),
        };

        return chain;
      },
    }),
  };

  return { client, calls };
}

describe('Week 2 - reviewer decision integration behavior', () => {
  it('builds rejection payload with trimmed reason', () => {
    expect(buildDecisionPayload('rejected', '  missing document  ')).toEqual({
      state: 'rejected',
      rejection_reason: 'missing document',
    });
  });

  it('builds non-rejection payload without reason', () => {
    expect(buildDecisionPayload('verified', 'ignored')).toEqual({
      state: 'verified',
      rejection_reason: null,
    });
  });

  it('updates publisher verification with id and company filters', async () => {
    const { client, calls } = createMockClient({ id: 'pv-1', state: 'verified' });

    const result = await applyPublisherVerificationDecision<{ id: string; state: string }>(client, {
      verificationId: 'pv-1',
      companyId: 'cmp-1',
      state: 'verified',
    });

    expect(result).toEqual({ id: 'pv-1', state: 'verified' });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('publisher_verifications');
    expect(calls[0].payload).toEqual({ state: 'verified', rejection_reason: null });
    expect(calls[0].filters).toEqual([
      { column: 'id', value: 'pv-1' },
      { column: 'company_id', value: 'cmp-1' },
    ]);
  });

  it('updates verification document with id and verification filters', async () => {
    const { client, calls } = createMockClient({ id: 'doc-1', state: 'approved' });

    const result = await applyVerificationDocumentDecision<{ id: string; state: string }>(client, {
      documentId: 'doc-1',
      verificationId: 'pv-1',
      state: 'approved',
    });

    expect(result).toEqual({ id: 'doc-1', state: 'approved' });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('verification_documents');
    expect(calls[0].payload).toEqual({ state: 'approved', rejection_reason: null });
    expect(calls[0].filters).toEqual([
      { column: 'id', value: 'doc-1' },
      { column: 'verification_id', value: 'pv-1' },
    ]);
  });

  it('throws when database returns error', async () => {
    const { client } = createMockClient({ id: 'pv-1', state: 'verified' }, new Error('db failed'));

    await expect(
      applyPublisherVerificationDecision(client, {
        verificationId: 'pv-1',
        state: 'verified',
      }),
    ).rejects.toThrow('db failed');
  });
});
