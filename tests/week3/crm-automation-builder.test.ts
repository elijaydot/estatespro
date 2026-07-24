import { describe, expect, it } from 'vitest';
import {
  deserializeConditionRows,
  serializeActionRows,
  serializeConditionRows,
  type ActionBuilderRow,
  type ConditionBuilderRow,
} from '../../src/lib/crmAutomationBuilder';

describe('crm automation builder serializers', () => {
  it('serializes condition rows to crm_conditions_match shape', () => {
    const rows: ConditionBuilderRow[] = [
      { id: '1', field: 'lead_id', operator: 'required', value: '' },
      { id: '2', field: 'to_stage', operator: 'equals', value: 'closed_won' },
    ];

    expect(serializeConditionRows(rows)).toEqual({
      required_fields: ['lead_id'],
      equals: { to_stage: 'closed_won' },
    });
  });

  it('serializes supported action rows to crm_execute_automation_rule shape', () => {
    const rows: ActionBuilderRow[] = [
      {
        id: '1',
        type: 'create_task',
        taskType: 'call_follow_up',
        dueInHours: '12',
        ownerUserId: '00000000-0000-0000-0000-000000000001',
        notes: 'Follow up',
        eventType: '',
        severity: 'info',
        status: 'ready',
        recipientUserId: '',
        notificationTitle: '',
        notificationMessage: '',
        notificationLink: '',
        messageSubject: '',
        messageContent: '',
        leadStage: 'qualified',
      },
      {
        id: '2',
        type: 'audit_event',
        taskType: '',
        dueInHours: '24',
        ownerUserId: '',
        notes: '',
        eventType: 'crm.test',
        severity: 'warning',
        status: 'ready',
        recipientUserId: '',
        notificationTitle: '',
        notificationMessage: '',
        notificationLink: '',
        messageSubject: '',
        messageContent: '',
        leadStage: 'qualified',
      },
      {
        id: '3',
        type: 'set_handoff_status',
        taskType: '',
        dueInHours: '24',
        ownerUserId: '',
        notes: '',
        eventType: '',
        severity: 'info',
        status: 'in_progress',
        recipientUserId: '',
        notificationTitle: '',
        notificationMessage: '',
        notificationLink: '',
        messageSubject: '',
        messageContent: '',
        leadStage: 'qualified',
      },
      {
        id: '4',
        type: 'send_notification',
        taskType: '',
        dueInHours: '24',
        ownerUserId: '',
        notes: '',
        eventType: '',
        severity: 'info',
        status: 'ready',
        recipientUserId: '00000000-0000-0000-0000-000000000002',
        notificationTitle: 'Escalation',
        notificationMessage: 'A lead needs your review.',
        notificationLink: '/marketplace/manage',
        messageSubject: '',
        messageContent: '',
        leadStage: 'qualified',
      },
      {
        id: '5',
        type: 'send_message',
        taskType: '',
        dueInHours: '24',
        ownerUserId: '',
        notes: '',
        eventType: '',
        severity: 'info',
        status: 'ready',
        recipientUserId: '00000000-0000-0000-0000-000000000003',
        notificationTitle: '',
        notificationMessage: '',
        notificationLink: '',
        messageSubject: 'Follow up needed',
        messageContent: 'Please call this lead today.',
        leadStage: 'qualified',
      },
      {
        id: '6',
        type: 'update_lead_stage',
        taskType: '',
        dueInHours: '24',
        ownerUserId: '',
        notes: 'Auto-qualified after workflow gate.',
        eventType: '',
        severity: 'info',
        status: 'ready',
        recipientUserId: '',
        notificationTitle: '',
        notificationMessage: '',
        notificationLink: '',
        messageSubject: '',
        messageContent: '',
        leadStage: 'qualified',
      },
      {
        id: '7',
        type: 'reassign_lead',
        taskType: '',
        dueInHours: '24',
        ownerUserId: '',
        notes: '',
        eventType: '',
        severity: 'info',
        status: 'ready',
        recipientUserId: '00000000-0000-0000-0000-000000000004',
        notificationTitle: '',
        notificationMessage: '',
        notificationLink: '',
        messageSubject: '',
        messageContent: '',
        leadStage: 'qualified',
      },
    ];

    expect(serializeActionRows(rows)).toEqual([
      {
        type: 'create_task',
        task_type: 'call_follow_up',
        due_in_hours: 12,
        owner_user_id: '00000000-0000-0000-0000-000000000001',
        notes: 'Follow up',
      },
      {
        type: 'audit_event',
        event_type: 'crm.test',
        severity: 'warning',
      },
      {
        type: 'set_handoff_status',
        status: 'in_progress',
      },
      {
        type: 'send_notification',
        recipient_user_id: '00000000-0000-0000-0000-000000000002',
        title: 'Escalation',
        message: 'A lead needs your review.',
        link: '/marketplace/manage',
      },
      {
        type: 'send_message',
        recipient_user_id: '00000000-0000-0000-0000-000000000003',
        subject: 'Follow up needed',
        content: 'Please call this lead today.',
      },
      {
        type: 'update_lead_stage',
        stage: 'qualified',
        reason: 'Auto-qualified after workflow gate.',
      },
      {
        type: 'reassign_lead',
        assignee_user_id: '00000000-0000-0000-0000-000000000004',
      },
    ]);
  });

  it('deserializes conditions for editing existing rules', () => {
    const rows = deserializeConditionRows({
      required_fields: ['lead_id'],
      equals: { to_stage: 'closed_won' },
    });

    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row.operator === 'required' && row.field === 'lead_id')).toBe(true);
    expect(rows.some((row) => row.operator === 'equals' && row.field === 'to_stage' && row.value === 'closed_won')).toBe(true);
  });
});
