export const CRM_CHANNELS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
] as const;

export type CrmChannel = typeof CRM_CHANNELS[number]['value'];

export function isCrmChannel(value: string): value is CrmChannel {
  return CRM_CHANNELS.some((channel) => channel.value === value);
}