type QueryResult<T> = Promise<{ data: T | null; error: unknown }>;

type QueryChain<T> = {
  eq: (column: string, value: unknown) => QueryChain<T>;
  select: (columns: string) => {
    single: () => QueryResult<T>;
  };
};

type SupabaseLike = {
  from: <T>(table: string) => {
    update: (payload: Record<string, unknown>) => QueryChain<T>;
  };
};

export type PublisherDecisionState = 'pending' | 'verified' | 'rejected' | 'needs_review';
export type DocumentDecisionState = 'pending' | 'approved' | 'rejected';

export function buildDecisionPayload(state: string, rejectionReason?: string | null) {
  return {
    state,
    rejection_reason: state === 'rejected' ? (rejectionReason?.trim() || null) : null,
  };
}

export async function applyPublisherVerificationDecision<T>(
  client: SupabaseLike,
  params: {
    verificationId: string;
    state: PublisherDecisionState;
    rejectionReason?: string | null;
    companyId?: string | null;
  },
): Promise<T> {
  const payload = buildDecisionPayload(params.state, params.rejectionReason);

  let query = client
    .from<T>('publisher_verifications')
    .update(payload)
    .eq('id', params.verificationId);

  if (params.companyId) {
    query = query.eq('company_id', params.companyId);
  }

  const { data, error } = await query
    .select('id, company_id, state, verified_by, verified_at, rejection_reason, last_submitted_at, created_at, updated_at')
    .single();

  if (error) throw error;
  if (!data) throw new Error('No publisher verification row returned');
  return data;
}

export async function applyVerificationDocumentDecision<T>(
  client: SupabaseLike,
  params: {
    documentId: string;
    state: DocumentDecisionState;
    rejectionReason?: string | null;
    verificationId?: string | null;
  },
): Promise<T> {
  const payload = buildDecisionPayload(params.state, params.rejectionReason);

  let query = client
    .from<T>('verification_documents')
    .update(payload)
    .eq('id', params.documentId);

  if (params.verificationId) {
    query = query.eq('verification_id', params.verificationId);
  }

  const { data, error } = await query
    .select('id, verification_id, document_type, storage_path, state, reviewed_by, reviewed_at, rejection_reason, created_at')
    .single();

  if (error) throw error;
  if (!data) throw new Error('No verification document row returned');
  return data;
}
