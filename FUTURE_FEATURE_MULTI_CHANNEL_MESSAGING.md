# Multi-Channel Messaging Implementation Guide

## Overview
Implement multi-channel communication (Email, SMS, WhatsApp) for tenant notifications and landlord communications across the property management platform.

## Providers & Credentials Required

### 1. Email (Resend) - Already Configured ✓
- API Key: `RESEND_API_KEY` (already set)
- Use for: Tenant invites, payment confirmations, lease documents, maintenance updates

### 2. SMS (Africa's Talking)
- **Credentials needed:**
  - `AFRICASTALKING_API_KEY`
  - `AFRICASTALKING_USERNAME` (sandbox or production)
- **Use for:** Quick payment reminders, maintenance alerts, urgent lease notifications
- **Documentation:** https://africastalking.com/

### 3. WhatsApp (Twilio)
- **Credentials needed:**
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_FROM` (format: `whatsapp:+14155238886`)
- **Use for:** Rich notifications with images, payment receipts, inspection reports
- **Documentation:** https://www.twilio.com/docs/whatsapp

## Database Schema Changes

### Add channel preference to tenants table
```sql
-- Add preferred communication channel to tenants
ALTER TABLE public.tenants 
ADD COLUMN preferred_channel TEXT DEFAULT 'email' 
CHECK (preferred_channel IN ('email', 'sms', 'whatsapp'));

-- Add phone number validation (E.164 format recommended)
ALTER TABLE public.tenants 
ADD CONSTRAINT valid_phone_format 
CHECK (phone ~ '^\+[1-9]\d{1,14}$');
```

### Create notification logs table for audit trail
```sql
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  notification_type TEXT NOT NULL, -- 'payment', 'maintenance', 'lease', 'invite'
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notification logs"
ON public.notification_logs FOR SELECT
USING (auth.uid() = user_id);
```

## Edge Function: Unified Notification Router

### Create `send-notification` edge function
```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const AFRICASTALKING_API_KEY = Deno.env.get('AFRICASTALKING_API_KEY');
const AFRICASTALKING_USERNAME = Deno.env.get('AFRICASTALKING_USERNAME');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM');

interface NotificationPayload {
  tenantId: string;
  type: 'payment' | 'maintenance' | 'lease' | 'invite' | 'exit_summary';
  subject: string;
  message: string;
  data?: Record<string, any>;
  forceChannel?: 'email' | 'sms' | 'whatsapp'; // Override tenant preference
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: NotificationPayload = await req.json();

    // 1. Fetch tenant details and preferred channel
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('name, email, phone, preferred_channel')
      .eq('id', payload.tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found');
    }

    const channel = payload.forceChannel || tenant.preferred_channel;

    // 2. Route to appropriate provider
    let result;
    switch (channel) {
      case 'email':
        result = await sendEmail(tenant, payload);
        break;
      case 'sms':
        result = await sendSMS(tenant, payload);
        break;
      case 'whatsapp':
        result = await sendWhatsApp(tenant, payload);
        break;
      default:
        result = await sendEmail(tenant, payload); // Fallback
    }

    // 3. Log the notification
    await supabaseClient.from('notification_logs').insert({
      user_id: req.headers.get('x-user-id'),
      tenant_id: payload.tenantId,
      channel,
      notification_type: payload.type,
      recipient: channel === 'email' ? tenant.email : tenant.phone,
      subject: payload.subject,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error,
      metadata: payload.data
    });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: result.success ? 200 : 500
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function sendEmail(tenant: any, payload: NotificationPayload) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'notifications@yourdomain.com',
        to: tenant.email,
        subject: payload.subject,
        html: payload.message
      })
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    return { success: true, channel: 'email' };
  } catch (error) {
    return { success: false, error: error.message, channel: 'email' };
  }
}

async function sendSMS(tenant: any, payload: NotificationPayload) {
  if (!AFRICASTALKING_API_KEY || !AFRICASTALKING_USERNAME) {
    return { success: false, error: 'SMS credentials not configured', channel: 'sms' };
  }

  try {
    const response = await fetch(
      `https://api.africastalking.com/version1/messaging`,
      {
        method: 'POST',
        headers: {
          'ApiKey': AFRICASTALKING_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          username: AFRICASTALKING_USERNAME,
          to: tenant.phone,
          message: `${payload.subject}\n\n${payload.message}`.substring(0, 160)
        })
      }
    );

    const result = await response.json();
    return { success: response.ok, channel: 'sms', data: result };
  } catch (error) {
    return { success: false, error: error.message, channel: 'sms' };
  }
}

async function sendWhatsApp(tenant: any, payload: NotificationPayload) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return { success: false, error: 'WhatsApp credentials not configured', channel: 'whatsapp' };
  }

  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: TWILIO_WHATSAPP_FROM,
          To: `whatsapp:${tenant.phone}`,
          Body: `*${payload.subject}*\n\n${payload.message}`
        })
      }
    );

    const result = await response.json();
    return { success: response.ok, channel: 'whatsapp', data: result };
  } catch (error) {
    return { success: false, error: error.message, channel: 'whatsapp' };
  }
}
```

## Settings UI: Channel Preferences

### Add to Settings page
```typescript
// In src/pages/Settings.tsx - Add new tab
{ id: 'messaging', label: 'Messaging', icon: MessageSquare, description: 'Communication channels' }
```

### Create MessagingSettings component
```typescript
// src/components/settings/MessagingSettings.tsx
export function MessagingSettings() {
  // 1. Display current provider status (configured/not configured)
  // 2. Allow setting default channel for tenant communications
  // 3. Show notification logs table
  // 4. Test notification buttons for each channel
}
```

### Update TenantDetail page
```typescript
// Add channel preference selector to tenant profile
<Select value={tenant.preferred_channel} onValueChange={...}>
  <SelectItem value="email">Email</SelectItem>
  <SelectItem value="sms">SMS</SelectItem>
  <SelectItem value="whatsapp">WhatsApp</SelectItem>
</Select>
```

## Integration Points

### Update existing notification edge functions
Replace direct Resend calls with unified router:

1. **send-tenant-invite** → Call `send-notification` with type: 'invite'
2. **send-payment-confirmation** → Call `send-notification` with type: 'payment'
3. **send-maintenance-notification** → Call `send-notification` with type: 'maintenance'
4. **send-lease-email** → Call `send-notification` with type: 'lease'
5. **send-exit-summary** → Call `send-notification` with type: 'exit_summary'

Example refactor:
```typescript
// Before
await fetch('https://api.resend.com/emails', {...});

// After
await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tenantId: tenant.id,
    type: 'payment',
    subject: 'Payment Received',
    message: emailHtml,
    data: { amount, receiptNumber }
  })
});
```

## Testing Checklist

- [ ] Add secrets via Lovable Cloud secrets manager
- [ ] Deploy send-notification edge function
- [ ] Test email delivery (should work immediately)
- [ ] Test SMS with Africa's Talking sandbox
- [ ] Test WhatsApp with Twilio sandbox number
- [ ] Verify notification logs are being created
- [ ] Test channel preferences on tenant profile
- [ ] Verify fallback to email when SMS/WhatsApp fail
- [ ] Check phone number format validation
- [ ] Test all notification types (invite, payment, maintenance, lease, exit)

## Cost Considerations

### Email (Resend)
- Free tier: 100 emails/day, 3,000/month
- Paid: $20/month for 50,000 emails

### SMS (Africa's Talking)
- ~$0.01-0.05 per SMS (varies by country)
- Requires phone number verification

### WhatsApp (Twilio)
- Free tier: 1,000 conversations/month
- Paid: $0.005-0.01 per conversation
- Requires WhatsApp Business approval

## Security Notes

1. **Input Validation**: Always validate and sanitize tenant phone numbers and email addresses
2. **Rate Limiting**: Implement rate limits on notification edge function to prevent abuse
3. **PII Protection**: Don't log sensitive content in notification_logs, only metadata
4. **Credential Storage**: All API keys must be stored in Supabase secrets (never in code)

## Future Enhancements

- **In-app notifications**: Real-time push notifications via Supabase Realtime
- **Notification preferences**: Let tenants opt-out of specific notification types per channel
- **Template management**: UI for managing email/SMS templates
- **Delivery analytics**: Dashboard showing delivery rates, open rates, click rates
- **Retry logic**: Automatic retry for failed notifications with exponential backoff
- **Multi-language support**: Send notifications in tenant's preferred language
