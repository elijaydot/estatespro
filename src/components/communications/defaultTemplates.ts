import { CommunicationTemplate } from './types';

export const DEFAULT_COMMUNICATION_TEMPLATES: CommunicationTemplate[] = [
  {
    id: 'rent-reminder-gentle',
    title: 'Monthly Rent Reminder (Upcoming)',
    category: 'finance',
    subject: 'Friendly Reminder: Upcoming Rent Due for Unit {{unit_number}}',
    content: `Dear {{tenant_name}},

This is a friendly reminder that your monthly rent of {{rent_amount}} for Unit {{unit_number}} at {{property_name}} is due on {{due_date}}.

You can settle your payment seamlessly via MTN Mobile Money (*182*8*1#) or direct bank transfer. If you have already initiated this transaction, please disregard this notice.

Thank you for being a valued resident with us!

Warm regards,
{{property_manager}}
Property Asset Management`,
    tags: ['rent', 'reminder', 'upcoming', 'finance'],
  },
  {
    id: 'rent-overdue-notice',
    title: 'Overdue Rent Notice',
    category: 'finance',
    subject: 'Urgent: Overdue Rent Settlement - Unit {{unit_number}}',
    content: `Dear {{tenant_name}},

Our financial records indicate that your rental payment of {{rent_amount}} for Unit {{unit_number}} at {{property_name}} is currently overdue.

Please settle the outstanding balance at your earliest convenience to maintain your account in good standing. If you are experiencing unexpected circumstances, please reply to this message directly so we can discuss a suitable payment arrangement.

Thank you for your prompt cooperation.

Sincerely,
{{property_manager}}
Management Office`,
    tags: ['rent', 'overdue', 'urgent', 'finance'],
  },
  {
    id: 'payment-receipt-confirmed',
    title: 'Payment Receipt Confirmation',
    category: 'finance',
    subject: 'Receipt Confirmed: Payment for Unit {{unit_number}}',
    content: `Dear {{tenant_name}},

We have successfully received and verified your rental payment of {{rent_amount}} for Unit {{unit_number}} at {{property_name}}.

Your account is fully up to date. You can view and download your official stamped digital receipt directly from your resident portal at any time.

Thank you for your timely settlement!

Warm regards,
{{property_manager}}`,
    tags: ['receipt', 'confirmed', 'payment', 'finance'],
  },
  {
    id: 'lease-renewal-discussion',
    title: 'Lease Renewal Invitation',
    category: 'leasing',
    subject: 'Upcoming Lease Renewal - Unit {{unit_number}} at {{property_name}}',
    content: `Dear {{tenant_name}},

We hope you are enjoying your residency at {{property_name}}. Your current lease agreement for Unit {{unit_number}} is scheduled to expire on {{lease_end_date}}.

We value you as a resident and would be delighted to welcome you for another term. Please let us know if you would like to renew your tenancy agreement so we can prepare your updated renewal contract.

Kindly reply to this message or contact our office by {{reply_deadline}} to discuss renewal terms.

Best regards,
{{property_manager}}`,
    tags: ['lease', 'renewal', 'agreement', 'leasing'],
  },
  {
    id: 'move-in-welcome',
    title: 'Move-In Welcome & Orientation',
    category: 'leasing',
    subject: 'Welcome to {{property_name}}! Move-In Details for Unit {{unit_number}}',
    content: `Dear {{tenant_name}},

Welcome to {{property_name}}! We are thrilled to welcome you to our community.

Here are a few quick notes to ensure a seamless move-in experience:
• Unit Key Handover & Baseline Inventory: Scheduled with property staff.
• Utility Meters (Electricity & Water): Handover readings will be documented upon check-in.
• Waste Collection: Daily disposal points are located on the ground floor.
• Security & Gate Access: Please provide vehicle details for gate registration.

If you need any assistance during your move, please reach out to us right here on this communication thread.

Warm welcome,
{{property_manager}}`,
    tags: ['welcome', 'move-in', 'onboarding', 'leasing'],
  },
  {
    id: 'move-out-instructions',
    title: 'Move-Out Procedures & Exit Inspection',
    category: 'leasing',
    subject: 'Move-Out Procedures & Final Inspection for Unit {{unit_number}}',
    content: `Dear {{tenant_name}},

As your move-out date approaches on {{move_out_date}}, please review the checklist below for a smooth departure and full security deposit return:
1. Thorough cleaning and removal of all personal possessions.
2. Rectification of any tenant-caused damage beyond fair wear and tear.
3. Clearing of all utility accounts (water, electricity, internet).
4. Joint move-out condition inspection and key return.

Please confirm your preferred time on {{move_out_date}} for the final walk-through inspection.

Thank you for residing with us, and we wish you all the best in your next home!

Sincerely,
{{property_manager}}`,
    tags: ['move-out', 'exit', 'inspection', 'leasing'],
  },
  {
    id: 'maintenance-scheduled',
    title: 'Maintenance Visit Scheduled',
    category: 'maintenance',
    subject: 'Update: Maintenance Visit Scheduled for Unit {{unit_number}}',
    content: `Dear {{tenant_name}},

Thank you for reporting your maintenance request regarding "{{maintenance_issue}}".

Our maintenance technician has been scheduled to attend to your unit on {{service_date}} between {{service_time_window}}.

Please ensure an adult resident is present, or reply to authorize staff entry if you will be away. If you need to reschedule, please notify us immediately on this thread.

Thank you for your cooperation!

Best regards,
{{property_manager}}
Maintenance Operations`,
    tags: ['maintenance', 'schedule', 'repairs'],
  },
  {
    id: 'routine-inspection-notice',
    title: 'Routine Property Inspection Notice',
    category: 'general',
    subject: 'Statutory Notice: Upcoming Routine Inspection - Unit {{unit_number}}',
    content: `Dear {{tenant_name}},

In accordance with statutory property management standards and your lease agreement, a routine preventive inspection is scheduled for Unit {{unit_number}} at {{property_name}} on {{inspection_date}}.

The inspection will take approximately 15 minutes and will focus on safety fixtures, plumbing lines, electrical integrity, and general premises maintenance.

If you have any questions or specific concerns you would like our team to look at during the visit, please let us know.

Thank you for your cooperation!

Sincerely,
{{property_manager}}`,
    tags: ['inspection', 'routine', 'compliance', 'general'],
  },
  {
    id: 'utility-interruption-notice',
    title: 'Utility Interruption Advisory',
    category: 'general',
    subject: 'Advisory: Temporary Utility Service Interruption at {{property_name}}',
    content: `Dear Residents of {{property_name}},

Please be advised that essential maintenance work on the main {{utility_type}} supply line will take place on {{maintenance_date}} between {{start_time}} and {{end_time}}.

During this period, there will be a temporary interruption to {{utility_type}} services across the building. We recommend storing necessary reserves in advance.

Our technical crew will work swiftly to restore service as quickly as possible. We sincerely apologize for any inconvenience caused.

Management Office
{{property_manager}}`,
    tags: ['utility', 'water', 'power', 'advisory', 'general'],
  },
];
