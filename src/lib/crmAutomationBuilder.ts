export type AutomationEventType = 'deal.stage_changed' | 'call.logged' | 'meeting.completed' | 'visit.completed';

export interface ConditionBuilderRow {
  id: string;
  field: string;
  operator: 'equals' | 'required';
  value: string;
}

export type ActionBuilderType =
  | 'create_task'
  | 'audit_event'
  | 'set_handoff_status'
  | 'send_notification'
  | 'send_message'
  | 'update_lead_stage'
  | 'reassign_lead';

export interface ActionBuilderRow {
  id: string;
  type: ActionBuilderType;
  taskType: string;
  dueInHours: string;
  ownerUserId: string;
  notes: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  status: string;
  recipientUserId: string;
  notificationTitle: string;
  notificationMessage: string;
  notificationLink: string;
  messageSubject: string;
  messageContent: string;
  leadStage: string;
}

export interface EventDefinition {
  value: AutomationEventType;
  label: string;
  defaultConditionRows: ConditionBuilderRow[];
  defaultActionRows: ActionBuilderRow[];
  samplePayload: Record<string, unknown>;
}

export const CRM_AUTOMATION_EVENT_DEFINITIONS: EventDefinition[] = [
  {
    value: 'deal.stage_changed',
    label: 'Deal Stage Changed',
    defaultConditionRows: [
      { id: 'condition-1', field: 'to_stage', operator: 'equals', value: 'closed_won' },
    ],
    defaultActionRows: [
      {
        id: 'action-1',
        type: 'create_task',
        taskType: 'handoff_prep',
        dueInHours: '24',
        ownerUserId: '',
        notes: 'Prepare handoff tasks for closed-won deal.',
        eventType: 'crm.deal.handoff_preparation',
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
    ],
    samplePayload: {
      deal_id: '00000000-0000-0000-0000-000000000001',
      lead_id: '00000000-0000-0000-0000-000000000002',
      to_stage: 'closed_won',
      owner_user_id: '00000000-0000-0000-0000-000000000003',
    },
  },
  {
    value: 'call.logged',
    label: 'Call Logged',
    defaultConditionRows: [
      { id: 'condition-1', field: 'lead_id', operator: 'required', value: '' },
    ],
    defaultActionRows: [
      {
        id: 'action-1',
        type: 'create_task',
        taskType: 'call_follow_up',
        dueInHours: '24',
        ownerUserId: '',
        notes: 'Follow up after call.',
        eventType: 'crm.call.follow_up',
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
    ],
    samplePayload: {
      call_id: '00000000-0000-0000-0000-000000000001',
      lead_id: '00000000-0000-0000-0000-000000000002',
      owner_user_id: '00000000-0000-0000-0000-000000000003',
    },
  },
  {
    value: 'meeting.completed',
    label: 'Meeting Completed',
    defaultConditionRows: [
      { id: 'condition-1', field: 'lead_id', operator: 'required', value: '' },
    ],
    defaultActionRows: [
      {
        id: 'action-1',
        type: 'create_task',
        taskType: 'meeting_follow_up',
        dueInHours: '48',
        ownerUserId: '',
        notes: 'Follow up after meeting completion.',
        eventType: 'crm.meeting.follow_up',
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
    ],
    samplePayload: {
      meeting_id: '00000000-0000-0000-0000-000000000001',
      lead_id: '00000000-0000-0000-0000-000000000002',
      owner_user_id: '00000000-0000-0000-0000-000000000003',
    },
  },
  {
    value: 'visit.completed',
    label: 'Visit Completed',
    defaultConditionRows: [],
    defaultActionRows: [
      {
        id: 'action-1',
        type: 'audit_event',
        taskType: 'automation_follow_up',
        dueInHours: '24',
        ownerUserId: '',
        notes: '',
        eventType: 'crm.visit.completed.review',
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
    ],
    samplePayload: {
      visit_id: '00000000-0000-0000-0000-000000000001',
      lead_id: '00000000-0000-0000-0000-000000000002',
      owner_user_id: '00000000-0000-0000-0000-000000000003',
    },
  },
];

export function getEventDefinition(eventType: string): EventDefinition {
  return CRM_AUTOMATION_EVENT_DEFINITIONS.find((item) => item.value === eventType) || CRM_AUTOMATION_EVENT_DEFINITIONS[0];
}

export function serializeConditionRows(rows: ConditionBuilderRow[]): Record<string, unknown> {
  const requiredFields = Array.from(new Set(rows
    .filter((row) => row.operator === 'required' && row.field.trim())
    .map((row) => row.field.trim())));

  const equalsEntries = rows
    .filter((row) => row.operator === 'equals' && row.field.trim())
    .reduce<Record<string, string>>((acc, row) => {
      acc[row.field.trim()] = row.value.trim();
      return acc;
    }, {});

  const payload: Record<string, unknown> = {};

  if (requiredFields.length) payload.required_fields = requiredFields;
  if (Object.keys(equalsEntries).length) payload.equals = equalsEntries;

  return payload;
}

export function serializeActionRows(rows: ActionBuilderRow[]): Array<Record<string, unknown>> {
  return rows.map((row) => {
    if (row.type === 'create_task') {
      const result: Record<string, unknown> = {
        type: 'create_task',
        task_type: row.taskType.trim() || 'automation_follow_up',
        due_in_hours: Number.isNaN(Number(row.dueInHours)) ? 24 : Number(row.dueInHours),
      };

      if (row.ownerUserId.trim()) result.owner_user_id = row.ownerUserId.trim();
      if (row.notes.trim()) result.notes = row.notes.trim();

      return result;
    }

    if (row.type === 'audit_event') {
      return {
        type: 'audit_event',
        event_type: row.eventType.trim() || 'crm.automation.executed',
        severity: row.severity,
      };
    }

    if (row.type === 'send_notification') {
      const result: Record<string, unknown> = {
        type: 'send_notification',
      };

      if (row.recipientUserId.trim()) result.recipient_user_id = row.recipientUserId.trim();
      if (row.notificationTitle.trim()) result.title = row.notificationTitle.trim();
      if (row.notificationMessage.trim()) result.message = row.notificationMessage.trim();
      if (row.notificationLink.trim()) result.link = row.notificationLink.trim();

      return result;
    }

    if (row.type === 'send_message') {
      const result: Record<string, unknown> = {
        type: 'send_message',
      };

      if (row.recipientUserId.trim()) result.recipient_user_id = row.recipientUserId.trim();
      if (row.messageSubject.trim()) result.subject = row.messageSubject.trim();
      if (row.messageContent.trim()) result.content = row.messageContent.trim();

      return result;
    }

    if (row.type === 'update_lead_stage') {
      const result: Record<string, unknown> = {
        type: 'update_lead_stage',
        stage: row.leadStage.trim() || 'qualified',
      };

      if (row.notes.trim()) result.reason = row.notes.trim();
      return result;
    }

    if (row.type === 'reassign_lead') {
      const result: Record<string, unknown> = {
        type: 'reassign_lead',
      };

      if (row.recipientUserId.trim()) result.assignee_user_id = row.recipientUserId.trim();
      return result;
    }

    return {
      type: 'set_handoff_status',
      status: row.status || 'ready',
    };
  });
}

export function deserializeConditionRows(conditions: Record<string, unknown>): ConditionBuilderRow[] {
  const rows: ConditionBuilderRow[] = [];

  const requiredFields = Array.isArray(conditions.required_fields)
    ? conditions.required_fields.filter((value): value is string => typeof value === 'string')
    : [];

  requiredFields.forEach((field, index) => {
    rows.push({
      id: `condition-required-${index}`,
      field,
      operator: 'required',
      value: '',
    });
  });

  if (conditions.equals && typeof conditions.equals === 'object' && !Array.isArray(conditions.equals)) {
    Object.entries(conditions.equals as Record<string, unknown>).forEach(([field, value], index) => {
      rows.push({
        id: `condition-equals-${index}`,
        field,
        operator: 'equals',
        value: String(value ?? ''),
      });
    });
  }

  return rows;
}
