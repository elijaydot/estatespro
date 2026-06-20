import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface CrmAccount {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  website: string | null;
  owner_user_id: string | null;
  annual_revenue: number | null;
  account_type: string | null;
  created_at: string;
}

export interface CrmDeal {
  id: string;
  company_id: string;
  lead_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  listing_id: string | null;
  unit_id: string | null;
  deal_name: string;
  amount: number | null;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  owner_user_id: string | null;
  created_at: string;
}

export interface CrmMeeting {
  id: string;
  company_id: string;
  title: string;
  related_type: string;
  related_id: string | null;
  host_user_id: string | null;
  starts_at: string;
  ends_at: string;
  status: 'planned' | 'done' | 'canceled';
  notes: string | null;
  created_at: string;
}

export interface CrmCall {
  id: string;
  company_id: string;
  subject: string;
  call_type: 'inbound' | 'outbound';
  related_type: string;
  related_id: string | null;
  contact_name: string | null;
  owner_user_id: string | null;
  started_at: string;
  duration_minutes: number;
  result: string | null;
  created_at: string;
}

export interface CrmCampaign {
  id: string;
  company_id: string;
  name: string;
  channel: string;
  status: string;
  budget_amount: number | null;
  spend_amount: number | null;
  starts_on: string | null;
  ends_on: string | null;
  open_rate: number | null;
  click_rate: number | null;
  bounce_rate: number | null;
  created_at: string;
}

export interface CrmDocument {
  id: string;
  company_id: string;
  related_type: string;
  related_id: string | null;
  title: string;
  storage_path: string;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface CrmVisit {
  id: string;
  company_id: string;
  related_type: string;
  related_id: string | null;
  locality: string | null;
  address_text: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'canceled';
  check_in_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_at: string | null;
  proof_path: string | null;
  outcome: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CrmProject {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: 'planned' | 'active' | 'on_hold' | 'completed' | 'canceled';
  owner_user_id: string | null;
  due_date: string | null;
  progress_percent: number;
  created_at: string;
}

export interface CrmContact {
  id: string;
  lead_id: string;
  full_name: string;
  email: string | null;
  phone_e164: string;
  preferred_channel: string | null;
  created_at: string;
}

export interface CrmReportDefinition {
  id: string;
  folder: string;
  name: string;
  description: string;
}

export interface CrmTask {
  id: string;
  lead_id: string;
  task_type: string;
  owner_user_id: string;
  due_at: string;
  status: 'open' | 'done' | 'canceled';
  notes: string | null;
  created_at: string;
}

interface LeadContactRow {
  id: string;
  lead_id: string;
  full_name: string;
  email: string | null;
  phone_e164: string;
  preferred_channel: string | null;
  created_at: string;
}

interface LeadTaskRow {
  id: string;
  lead_id: string;
  task_type: string;
  owner_user_id: string;
  due_at: string;
  status: 'open' | 'done' | 'canceled';
  notes: string | null;
  created_at: string;
}

const REPORT_LIBRARY: CrmReportDefinition[] = [
  { id: 'email-top-click', folder: 'Email Reports', name: 'Top 10 Templates by Click Rate', description: 'Top templates by click-through rate.' },
  { id: 'email-top-open', folder: 'Email Reports', name: 'Top 10 Templates by Open Rate', description: 'Top templates by open rate.' },
  { id: 'email-activity', folder: 'Email Reports', name: 'Email and Activities Analytics Report', description: 'Emails sent/replied with cross-channel activity.' },
  { id: 'email-call', folder: 'Email Reports', name: 'Email and Call Analytics Report', description: 'Combined email and call engagement report.' },
  { id: 'email-top-users', folder: 'Email Reports', name: 'Top 10 Users', description: 'Top users by outbound email activity.' },
  { id: 'email-analytics', folder: 'Email Reports', name: 'Email Analytics', description: 'Summary of sent, opened, clicked, and bounced emails.' },
  { id: 'email-bounce', folder: 'Email Reports', name: 'Bounce Report', description: 'Email bounce reasons and trends.' },
  { id: 'meeting-plan-vs-realized', folder: 'Meeting Reports', name: 'Planned Vs Realized Meetings this Month', description: 'Planned meetings versus completed check-ins.' },
  { id: 'checkins-salesperson', folder: 'Meeting Reports', name: 'Number of Check-Ins by Salesperson', description: 'Monthly check-ins by team member.' },
  { id: 'checkins-locality', folder: 'Meeting Reports', name: 'Number of Check-Ins by Locality', description: 'Monthly check-ins grouped by locality.' },
  { id: 'contact-mailing-list', folder: 'Account and Contact Reports', name: 'Contact Mailing List', description: 'Current contact mailing roster.' },
  { id: 'deals-closing-month', folder: 'Deal and Revenue Reports', name: 'Deals Closing This Month', description: 'Deals with close dates in the current month.' },
  { id: 'verification-aging', folder: 'Trust and Risk Reports', name: 'Verification Queue Aging', description: 'How long publisher verification items stay pending.' },
];

function useCompanyTableQuery<T>(key: string, table: string, companyId?: string | null, select = '*') {
  return useQuery({
    queryKey: ['marketplace-crm', key, companyId],
    queryFn: async () => {
      if (!companyId) return [] as T[];
      const { data, error } = await supabase.from(table as never).select(select as never).eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: !!companyId,
  });
}

export function useCrmContacts(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'contacts', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmContact[];
      const { data, error } = await supabase
        .from('lead_contacts')
        .select('id, lead_id, full_name, email, phone_e164, preferred_channel, created_at, leads!inner(company_id)')
        .eq('leads.company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => {
        const typedRow = row as LeadContactRow;
        return {
          id: typedRow.id,
          lead_id: typedRow.lead_id,
          full_name: typedRow.full_name,
          email: typedRow.email,
          phone_e164: typedRow.phone_e164,
          preferred_channel: typedRow.preferred_channel,
          created_at: typedRow.created_at,
        };
      }) as CrmContact[];
    },
    enabled: !!companyId,
  });
}

export function useCrmAccounts(companyId?: string | null) {
  return useCompanyTableQuery<CrmAccount>('accounts', 'crm_accounts', companyId, 'id, company_id, name, phone, website, owner_user_id, annual_revenue, account_type, created_at');
}

export function useCrmDeals(companyId?: string | null) {
  return useCompanyTableQuery<CrmDeal>('deals', 'crm_deals', companyId, 'id, company_id, lead_id, account_id, contact_id, listing_id, unit_id, deal_name, amount, currency, stage, probability, expected_close_date, owner_user_id, created_at');
}

export function useCrmMeetings(companyId?: string | null) {
  return useCompanyTableQuery<CrmMeeting>('meetings', 'crm_meetings', companyId, 'id, company_id, title, related_type, related_id, host_user_id, starts_at, ends_at, status, notes, created_at');
}

export function useCrmCalls(companyId?: string | null) {
  return useCompanyTableQuery<CrmCall>('calls', 'crm_calls', companyId, 'id, company_id, subject, call_type, related_type, related_id, contact_name, owner_user_id, started_at, duration_minutes, result, created_at');
}

export function useCrmCampaigns(companyId?: string | null) {
  return useCompanyTableQuery<CrmCampaign>('campaigns', 'crm_campaigns', companyId, 'id, company_id, name, channel, status, budget_amount, spend_amount, starts_on, ends_on, open_rate, click_rate, bounce_rate, created_at');
}

export function useCrmDocuments(companyId?: string | null) {
  return useCompanyTableQuery<CrmDocument>('documents', 'crm_documents', companyId, 'id, company_id, related_type, related_id, title, storage_path, mime_type, uploaded_by, created_at');
}

export function useCrmVisits(companyId?: string | null) {
  return useCompanyTableQuery<CrmVisit>('visits', 'crm_visits', companyId, 'id, company_id, related_type, related_id, locality, address_text, status, check_in_at, check_in_lat, check_in_lng, check_out_at, proof_path, outcome, notes, created_by, created_at');
}

export function useCrmProjects(companyId?: string | null) {
  return useCompanyTableQuery<CrmProject>('projects', 'crm_projects', companyId, 'id, company_id, name, description, status, owner_user_id, due_date, progress_percent, created_at');
}

export function useCrmReportLibrary() {
  return useQuery({
    queryKey: ['marketplace-crm', 'report-library'],
    queryFn: async () => REPORT_LIBRARY,
  });
}

export function useCrmTasks(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'tasks', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmTask[];
      const { data, error } = await supabase
        .from('lead_tasks')
        .select('id, lead_id, task_type, owner_user_id, due_at, status, notes, created_at, leads!inner(company_id)')
        .eq('leads.company_id', companyId)
        .order('due_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((row) => {
        const typedRow = row as LeadTaskRow;
        return {
          id: typedRow.id,
          lead_id: typedRow.lead_id,
          task_type: typedRow.task_type,
          owner_user_id: typedRow.owner_user_id,
          due_at: typedRow.due_at,
          status: typedRow.status,
          notes: typedRow.notes,
          created_at: typedRow.created_at,
        };
      }) as CrmTask[];
    },
    enabled: !!companyId,
  });
}

function buildCreateMutation<TInput extends Record<string, unknown>>(table: string, key: string) {
  return function useCreateEntity(companyId?: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (payload: TInput) => {
        if (!companyId) throw new Error('Active company is required');
        const { data, error } = await supabase.from(table as never).insert({ ...payload, company_id: companyId } as never).select('*').single();
        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['marketplace-crm', key, companyId] });
        toast({ title: 'Saved', description: 'Record created successfully.' });
      },
      onError: (error: Error) => {
        toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
      },
    });
  };
}

export const useCreateCrmAccount = buildCreateMutation<Record<string, unknown>>('crm_accounts', 'accounts');
export const useCreateCrmDeal = buildCreateMutation<Record<string, unknown>>('crm_deals', 'deals');
export const useCreateCrmMeeting = buildCreateMutation<Record<string, unknown>>('crm_meetings', 'meetings');
export const useCreateCrmCall = buildCreateMutation<Record<string, unknown>>('crm_calls', 'calls');
export const useCreateCrmCampaign = buildCreateMutation<Record<string, unknown>>('crm_campaigns', 'campaigns');
export const useCreateCrmDocument = buildCreateMutation<Record<string, unknown>>('crm_documents', 'documents');
export const useCreateCrmVisit = buildCreateMutation<Record<string, unknown>>('crm_visits', 'visits');
export const useCreateCrmProject = buildCreateMutation<Record<string, unknown>>('crm_projects', 'projects');
