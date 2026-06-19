export const CONTRACT_SENSITIVE_FILES = new Set([
  'supabase/functions/payment-checkout/index.ts',
  'supabase/functions/verify-payment/index.ts',
  'supabase/functions/send-payment-confirmation/index.ts',
  'supabase/functions/shortlet-booking-email/index.ts',
  'supabase/functions/send-tenant-invite/index.ts',
  'supabase/functions/accept-tenant-invite/index.ts',
  'supabase/functions/invite-token/index.ts',
  'supabase/functions/marketplace-public/index.ts',
  'supabase/functions/send-broadcast/index.ts',
  'supabase/functions/generate-invoice-pdf/index.ts',
  'supabase/functions/generate-lease-pdf/index.ts',
  'supabase/functions/send-lease-email/index.ts',
  'supabase/functions/send-maintenance-notification/index.ts',
  'supabase/functions/send-exit-summary/index.ts',
  'supabase/functions/ai-chat/index.ts',
  'supabase/functions/ai-document-intelligence/index.ts',
  'supabase/functions/ai-predictive-analytics/index.ts',
  'supabase/functions/ai-smart-search/index.ts',
  'supabase/functions/ai-suggest-reply/index.ts',
  'supabase/functions/ai-tenant-chatbot/index.ts',
]);

export const REQUIRED_DOC = 'docs/parity/API_CONTRACT_INVENTORY.md';
export const REQUIRED_POLICY_DOC = 'docs/parity/API_VERSIONING_POLICY.md';

export const WEBHOOK_CAPABLE_FILES = new Set([
  'supabase/functions/payment-checkout/index.ts',
  'supabase/functions/verify-payment/index.ts',
  'supabase/functions/send-payment-confirmation/index.ts',
  'supabase/functions/send-tenant-invite/index.ts',
  'supabase/functions/send-broadcast/index.ts',
  'supabase/functions/send-lease-email/index.ts',
  'supabase/functions/send-maintenance-notification/index.ts',
  'supabase/functions/send-exit-summary/index.ts',
]);

export function requiresInventoryUpdate(changedFiles) {
  const touchedContract = changedFiles.some((path) => CONTRACT_SENSITIVE_FILES.has(path));
  const touchedInventory = changedFiles.includes(REQUIRED_DOC);
  const touchedWebhookCapable = changedFiles.some((path) => WEBHOOK_CAPABLE_FILES.has(path));
  const touchedPolicy = changedFiles.includes(REQUIRED_POLICY_DOC);

  return {
    touchedContract,
    touchedInventory,
    touchedWebhookCapable,
    touchedPolicy,
    shouldFail: touchedContract && !touchedInventory,
    shouldFailPolicy: touchedWebhookCapable && !touchedPolicy,
  };
}
