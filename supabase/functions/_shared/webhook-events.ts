export type WebhookEventEnvelopeV1<TPayload = Record<string, unknown>> = {
  version: 'v1.0';
  event_id: string;
  event_type: string;
  emitted_at: string;
  correlation_id?: string;
  actor_user_id?: string;
  company_id?: string;
  payload: TPayload;
};

export function buildWebhookEventEnvelope<TPayload>(options: {
  eventType: string;
  payload: TPayload;
  correlationId?: string;
  actorUserId?: string;
  companyId?: string;
  eventId?: string;
  emittedAt?: string;
}): WebhookEventEnvelopeV1<TPayload> {
  return {
    version: 'v1.0',
    event_id: options.eventId ?? crypto.randomUUID(),
    event_type: options.eventType,
    emitted_at: options.emittedAt ?? new Date().toISOString(),
    correlation_id: options.correlationId,
    actor_user_id: options.actorUserId,
    company_id: options.companyId,
    payload: options.payload,
  };
}
