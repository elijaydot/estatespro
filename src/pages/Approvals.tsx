// src/pages/Approvals.tsx
// FishGate Design Constitution v1.0 - Approvals Module: Decision-Management Center & Operational Authorization Workspace
// 6-Part Structure: Header -> Approval Summary -> Immediate Decisions -> Approval Workspace -> Decision History -> Approval Observations

import { useState, useMemo, useEffect } from 'react';
import { PageContainer } from '@/design-system/LayoutFramework';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { downloadCsv } from '@/lib/download';
import { format } from 'date-fns';

import {
  ApprovalRecord,
  ApprovalStatus,
  ApprovalType,
  ApprovalPriority,
  ApprovalParty,
} from '@/components/approvals/types';
import { ApprovalHeader } from '@/components/approvals/ApprovalHeader';
import { ApprovalSummary } from '@/components/approvals/ApprovalSummary';
import { ApprovalImmediateDecisions } from '@/components/approvals/ApprovalImmediateDecisions';
import { ApprovalWorkspace } from '@/components/approvals/ApprovalWorkspace';
import { ApprovalDecisionHistory } from '@/components/approvals/ApprovalDecisionHistory';
import { ApprovalObservations } from '@/components/approvals/ApprovalObservations';
import { ApprovalDetailModal } from '@/components/approvals/ApprovalDetailModal';
import { CreateApprovalModal } from '@/components/approvals/CreateApprovalModal';
import { DelegateApprovalModal } from '@/components/approvals/DelegateApprovalModal';

const APPROVALS_STORAGE_KEY = 'fishgate_approvals_v1';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRecord | null>(null);

  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [approvalToDelegate, setApprovalToDelegate] = useState<ApprovalRecord | null>(null);

  // Summary card filter state
  const [summaryFilter, setSummaryFilter] = useState<string>('all');

  // Team roster
  const teamMembers = useMemo(() => {
    return [
      { id: 'usr-1', name: 'Aimable Nkurunziza', role: 'Property Operations Lead', department: 'Facilities & Maintenance' },
      { id: 'usr-2', name: 'Diane Uwase', role: 'Leasing Specialist', department: 'Leasing & Residents' },
      { id: 'usr-3', name: 'Eric Habimana', role: 'Finance & Collections Specialist', department: 'Finance & Accounts' },
      { id: 'usr-4', name: 'Alexandre Nshimiyimana', role: 'Technical Services Manager', department: 'Facilities & Maintenance' },
      { id: 'usr-5', name: 'Jean Claude Bizimana', role: 'Commercial Portfolio Manager', department: 'Property Operations' },
      { id: 'usr-6', name: 'Aline Mukagasana', role: 'Executive Officer / Managing Director', department: 'Executive & Legal' },
    ];
  }, []);

  // Primary Approvals State (persisted to LocalStorage)
  const [approvals, setApprovals] = useState<ApprovalRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(APPROVALS_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    return [
      {
        id: 'app-seed-1',
        approvalNumber: 'APP-2026-091',
        title: 'Authorize High-Value Outlay: Main Lift Modernization & Inverter Bay',
        type: 'expense',
        status: 'pending',
        priority: 'critical',
        workflowType: 'threshold',
        amount: 1950000,
        currency: 'RWF',
        financialImpact: 'Outlay exceeds RWF 1,000,000 statutory limit. Facilities CAPEX budget allocation.',
        reason: 'Mandatory quarterly lift overhaul with Schindler & Otis Engineering. Replaces failing hoist inverters to maintain statutory occupancy certificate.',
        summary: 'Elevator Overhaul Outlay RWF 1,950,000',
        deadline: todayStr,
        slaHoursRemaining: 6,
        isUrgent: true,
        isEscalated: false,
        requester: {
          id: 'usr-1',
          name: 'Aimable Nkurunziza',
          role: 'Operations Lead',
          department: 'Facilities & Maintenance',
        },
        currentApprover: {
          id: 'usr-6',
          name: 'Aline Mukagasana',
          role: 'Executive Officer',
          department: 'Executive & Legal',
        },
        steps: [
          {
            stepNumber: 1,
            roleRequired: 'Technical Services Lead',
            approverName: 'Alexandre Nshimiyimana',
            status: 'approved',
            decidedAt: '2026-11-25T14:00:00Z',
            comments: 'Scope verified against contractor invoice.',
          },
          {
            stepNumber: 2,
            roleRequired: 'Executive Managing Director',
            approverName: 'Aline Mukagasana',
            status: 'pending',
          },
        ],
        currentStepIndex: 1,
        propertyName: 'Kigali Heights Residences',
        unitNumber: 'Main Lift A',
        vendorName: 'Schindler & Otis Engineering Rwanda',
        sourceEntityRef: 'EXP-2026-084',
        targetUrl: '/expenses',
        attachments: [],
        comments: [
          {
            id: 'c1',
            authorName: 'Alexandre Nshimiyimana',
            authorRole: 'Technical Manager',
            text: 'Contractor quotation verified and compliant with OEM specifications.',
            createdAt: '2026-11-25T14:30:00Z',
          },
        ],
        auditTrail: [
          {
            id: 'a1',
            timestamp: '2026-11-25T14:00:00Z',
            actorName: 'Alexandre Nshimiyimana',
            actorRole: 'Technical Lead',
            action: 'approved',
            details: 'Step 1 technical approval granted.',
            previousState: 'pending',
            newState: 'pending',
          },
          {
            id: 'a0',
            timestamp: '2026-11-25T11:00:00Z',
            actorName: 'Aimable Nkurunziza',
            actorRole: 'Operations Lead',
            action: 'created',
            details: 'High-value approval request submitted.',
            newState: 'pending',
          },
        ],
        createdAt: '2026-11-25T11:00:00Z',
        updatedAt: '2026-11-25T14:00:00Z',
      },
      {
        id: 'app-seed-2',
        approvalNumber: 'APP-2026-092',
        title: 'Commercial Tenancy Agreement Approval (2-Year Term with 8% Escalation)',
        type: 'lease',
        status: 'pending',
        priority: 'high',
        workflowType: 'department',
        amount: 2400000,
        currency: 'RWF',
        financialImpact: 'Guaranteed RWF 57,600,000 lease revenue across 24-month renewal term.',
        reason: 'Tenancy renewal contract for commercial space Unit C-301. Tenant agreed to 8% rent indexation and 3-month rolling deposit guarantee.',
        summary: 'Commercial Lease Renewal Unit C-301',
        deadline: todayStr,
        slaHoursRemaining: 18,
        isUrgent: true,
        isEscalated: false,
        requester: {
          id: 'usr-2',
          name: 'Diane Uwase',
          role: 'Leasing Specialist',
          department: 'Leasing & Residents',
        },
        currentApprover: {
          id: 'usr-5',
          name: 'Jean Claude Bizimana',
          role: 'Commercial Portfolio Manager',
          department: 'Property Operations',
        },
        steps: [
          {
            stepNumber: 1,
            roleRequired: 'Portfolio Manager',
            approverName: 'Jean Claude Bizimana',
            status: 'pending',
          },
        ],
        currentStepIndex: 0,
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'C-301',
        tenantName: 'Kigali Tech Innovations Ltd',
        sourceEntityRef: 'LEAS-2026-084',
        targetUrl: '/leases',
        attachments: [],
        comments: [],
        auditTrail: [
          {
            id: 'a2',
            timestamp: '2026-11-26T10:00:00Z',
            actorName: 'Diane Uwase',
            actorRole: 'Leasing Specialist',
            action: 'created',
            details: 'Lease contract submitted for approval.',
            newState: 'pending',
          },
        ],
        createdAt: '2026-11-26T10:00:00Z',
        updatedAt: '2026-11-26T10:00:00Z',
      },
      {
        id: 'app-seed-3',
        approvalNumber: 'APP-2026-093',
        title: 'Defective Balcony Waterproofing Emergency Remediation',
        type: 'maintenance',
        status: 'pending',
        priority: 'high',
        workflowType: 'single_step',
        amount: 120000,
        currency: 'RWF',
        financialImpact: 'Unbudgeted repair following move-out inspection failure.',
        reason: 'Ponding detected during move-out audit. Emergency drain unblocking and sealant application before next tenant move-in.',
        summary: 'Balcony Drain Remediation RWF 120,000',
        deadline: todayStr,
        slaHoursRemaining: 24,
        isUrgent: false,
        isEscalated: false,
        requester: {
          id: 'usr-1',
          name: 'Aimable Nkurunziza',
          role: 'Operations Lead',
          department: 'Facilities & Maintenance',
        },
        currentApprover: {
          id: 'usr-3',
          name: 'Eric Habimana',
          role: 'Finance Specialist',
          department: 'Finance & Accounts',
        },
        steps: [
          {
            stepNumber: 1,
            roleRequired: 'Finance Specialist',
            approverName: 'Eric Habimana',
            status: 'pending',
          },
        ],
        currentStepIndex: 0,
        propertyName: 'Riverside Luxury Suites & Apartments',
        unitNumber: 'A-201',
        vendorName: 'Wasac Certified Plumbing Contractors Ltd',
        sourceEntityRef: 'INSP-2026-042',
        targetUrl: '/maintenance?tab=work-orders',
        attachments: [],
        comments: [],
        auditTrail: [
          {
            id: 'a3',
            timestamp: '2026-11-26T11:00:00Z',
            actorName: 'Aimable Nkurunziza',
            actorRole: 'Operations Lead',
            action: 'created',
            details: 'Emergency plumbing quote dispatched for review.',
            newState: 'pending',
          },
        ],
        createdAt: '2026-11-26T11:00:00Z',
        updatedAt: '2026-11-26T11:00:00Z',
      },
      {
        id: 'app-seed-4',
        approvalNumber: 'APP-2026-094',
        title: 'Deposit Full Refund Release upon Impeccable Key Turnover',
        type: 'refund',
        status: 'approved',
        priority: 'medium',
        workflowType: 'single_step',
        amount: 450000,
        currency: 'RWF',
        financialImpact: 'Full security deposit return without dilapidation deductions.',
        reason: 'Apartment B-102 returned in pristine condition. Zero damaged fixtures found on final move-out checklist.',
        summary: 'Security Deposit Refund Unit B-102',
        deadline: todayStr,
        slaHoursRemaining: 0,
        isUrgent: false,
        isEscalated: false,
        requester: {
          id: 'usr-2',
          name: 'Diane Uwase',
          role: 'Leasing Specialist',
          department: 'Leasing & Residents',
        },
        currentApprover: {
          id: 'usr-3',
          name: 'Eric Habimana',
          role: 'Finance Specialist',
          department: 'Finance & Accounts',
        },
        steps: [
          {
            stepNumber: 1,
            roleRequired: 'Finance Specialist',
            approverName: 'Eric Habimana',
            status: 'approved',
            decidedAt: '2026-11-26T16:00:00Z',
            comments: 'EFT refund issued to resident registered bank account.',
          },
        ],
        currentStepIndex: 0,
        propertyName: 'Kigali Heights Residences',
        unitNumber: 'B-102',
        tenantName: 'David Mugisha',
        sourceEntityRef: 'COL-2026-041',
        targetUrl: '/collections',
        attachments: [],
        comments: [],
        auditTrail: [
          {
            id: 'a4',
            timestamp: '2026-11-26T16:00:00Z',
            actorName: 'Eric Habimana',
            actorRole: 'Finance Specialist',
            action: 'approved',
            details: 'Deposit refund approved and payment disbursed.',
            previousState: 'pending',
            newState: 'approved',
          },
        ],
        decidedAt: '2026-11-26T16:00:00Z',
        decisionComments: 'Full security deposit refund authorized following clean handover.',
        createdAt: '2026-11-26T15:00:00Z',
        updatedAt: '2026-11-26T16:00:00Z',
      },
      {
        id: 'app-seed-5',
        approvalNumber: 'APP-2026-095',
        title: 'Arrears Forgiveness & Hardship Installment Restructuring',
        type: 'write_off',
        status: 'escalated',
        priority: 'critical',
        workflowType: 'executive',
        amount: 650000,
        currency: 'RWF',
        financialImpact: 'Arrears > 45 days. Proposal for 50% waiver with guarantor promissory note.',
        reason: 'Tenant faced medical emergency. Requesting executive waiver of late penalties and restructuring balance across 6 installments.',
        summary: 'Arrears Restructuring Unit A-201',
        deadline: todayStr,
        slaHoursRemaining: 10,
        isUrgent: true,
        isEscalated: true,
        escalationReason: 'Escalated to Managing Director per Debt Recovery Governance Bylaw.',
        requester: {
          id: 'usr-3',
          name: 'Eric Habimana',
          role: 'Finance Specialist',
          department: 'Finance & Accounts',
        },
        currentApprover: {
          id: 'usr-6',
          name: 'Aline Mukagasana',
          role: 'Executive Officer',
          department: 'Executive & Legal',
        },
        steps: [
          {
            stepNumber: 1,
            roleRequired: 'Managing Director',
            approverName: 'Aline Mukagasana',
            status: 'pending',
          },
        ],
        currentStepIndex: 0,
        propertyName: 'Riverside Luxury Suites & Apartments',
        unitNumber: 'A-201',
        tenantName: 'Jean Paul Habineza',
        sourceEntityRef: 'COL-2026-042',
        targetUrl: '/collections',
        attachments: [],
        comments: [],
        auditTrail: [
          {
            id: 'a5',
            timestamp: '2026-11-26T14:00:00Z',
            actorName: 'Eric Habimana',
            actorRole: 'Finance Specialist',
            action: 'escalated',
            details: 'Escalated to Executive Managing Director.',
            previousState: 'pending',
            newState: 'escalated',
          },
        ],
        createdAt: '2026-11-26T13:00:00Z',
        updatedAt: '2026-11-26T14:00:00Z',
      },
      {
        id: 'app-seed-6',
        approvalNumber: 'APP-2026-096',
        title: 'Annual Security & CCTV Surveillance Service SLA Contract',
        type: 'contract',
        status: 'approved',
        priority: 'medium',
        workflowType: 'role_based',
        amount: 2100000,
        currency: 'RWF',
        financialImpact: 'Annual security perimeter patrol and maintenance SLA.',
        reason: 'Renewal of comprehensive physical security agreement with Intersec Rwanda Security Ltd including 24/7 monitoring.',
        summary: 'Intersec Annual Security SLA',
        deadline: todayStr,
        slaHoursRemaining: 0,
        isUrgent: false,
        isEscalated: false,
        requester: {
          id: 'usr-4',
          name: 'Alexandre Nshimiyimana',
          role: 'Technical Manager',
          department: 'Facilities & Maintenance',
        },
        currentApprover: {
          id: 'usr-5',
          name: 'Jean Claude Bizimana',
          role: 'Commercial Lead',
          department: 'Property Operations',
        },
        steps: [
          {
            stepNumber: 1,
            roleRequired: 'Portfolio Manager',
            approverName: 'Jean Claude Bizimana',
            status: 'approved',
            decidedAt: '2026-11-24T14:00:00Z',
            comments: 'Vendor SLA competitive and within approved OPEX budget.',
          },
        ],
        currentStepIndex: 0,
        propertyName: 'Vision City Commercial & Residential Hub',
        vendorName: 'Intersec Rwanda Security Ltd',
        sourceEntityRef: 'EXP-2026-083',
        targetUrl: '/expenses',
        attachments: [],
        comments: [],
        auditTrail: [
          {
            id: 'a6',
            timestamp: '2026-11-24T14:00:00Z',
            actorName: 'Jean Claude Bizimana',
            actorRole: 'Commercial Lead',
            action: 'approved',
            details: 'Procurement contract authorized.',
            previousState: 'pending',
            newState: 'approved',
          },
        ],
        decidedAt: '2026-11-24T14:00:00Z',
        decisionComments: 'Security procurement contract confirmed.',
        createdAt: '2026-11-24T10:00:00Z',
        updatedAt: '2026-11-24T14:00:00Z',
      },
    ];
  });

  // Persist approvals
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(approvals));
    }
  }, [approvals]);

  // Handlers
  const handleSelectApproval = (approval: ApprovalRecord) => {
    setSelectedApproval(approval);
    setDetailModalOpen(true);
  };

  const handleUpdateApproval = (updated: ApprovalRecord) => {
    setApprovals((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (selectedApproval?.id === updated.id) {
      setSelectedApproval(updated);
    }
  };

  const handleCreateApproval = (newRecord: ApprovalRecord) => {
    setApprovals((prev) => [newRecord, ...prev]);
  };

  const handleQuickApprove = (approvalId: string, comments = 'Approved via quick action') => {
    const timestamp = new Date().toISOString();
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'approved',
              decidedAt: timestamp,
              decisionComments: comments,
              auditTrail: [
                {
                  id: `aud-${Date.now()}`,
                  timestamp,
                  actorName: currentUserName,
                  actorRole: 'Authorized Approver',
                  action: 'approved',
                  details: comments,
                  previousState: a.status,
                  newState: 'approved',
                },
                ...a.auditTrail,
              ],
              updatedAt: timestamp,
            }
          : a
      )
    );
    toast({ title: 'Request Approved', description: 'Approval authorized successfully.' });
  };

  const handleQuickReject = (approvalId: string, reason = 'Declined authorization') => {
    const timestamp = new Date().toISOString();
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'rejected',
              decidedAt: timestamp,
              decisionComments: reason,
              auditTrail: [
                {
                  id: `aud-${Date.now()}`,
                  timestamp,
                  actorName: currentUserName,
                  actorRole: 'Authorized Approver',
                  action: 'rejected',
                  details: reason,
                  previousState: a.status,
                  newState: 'rejected',
                },
                ...a.auditTrail,
              ],
              updatedAt: timestamp,
            }
          : a
      )
    );
    toast({ title: 'Request Rejected', description: 'Approval request declined.' });
  };

  const handleOpenDelegateModal = (approval?: ApprovalRecord) => {
    setApprovalToDelegate(approval || null);
    setDelegateModalOpen(true);
  };

  const handleDelegateConfirm = (
    approvalId: string | undefined,
    delegatee: ApprovalParty,
    reason: string
  ) => {
    const timestamp = new Date().toISOString();
    setApprovals((prev) =>
      prev.map((a) => {
        if (!approvalId || a.id === approvalId) {
          return {
            ...a,
            status: 'delegated',
            delegatedTo: {
              id: delegatee.id,
              name: delegatee.name,
              role: delegatee.role,
              reason,
              delegatedAt: timestamp,
            },
            currentApprover: delegatee,
            auditTrail: [
              {
                id: `aud-${Date.now()}`,
                timestamp,
                actorName: currentUserName,
                actorRole: 'Original Approver',
                action: 'delegated',
                details: `Authority delegated to ${delegatee.name} (${reason})`,
                previousState: a.status,
                newState: 'delegated',
              },
              ...a.auditTrail,
            ],
            updatedAt: timestamp,
          };
        }
        return a;
      })
    );
  };

  // Export approvals to CSV
  const handleExportApprovals = () => {
    const rows = approvals.map((a) => ({
      ApprovalNumber: a.approvalNumber,
      Title: a.title,
      Type: a.type,
      Status: a.status,
      Priority: a.priority,
      Workflow: a.workflowType,
      Amount: a.amount !== undefined ? `${a.currency} ${a.amount}` : 'N/A',
      FinancialImpact: a.financialImpact,
      Property: a.propertyName,
      Unit: a.unitNumber || '',
      Requester: a.requester.name,
      Approver: a.currentApprover.name,
      Deadline: a.deadline,
      DecidedAt: a.decidedAt || 'Pending',
    }));
    downloadCsv(`fishgate-approvals-governance-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: 'Approvals Exported', description: 'Exported authorization log to CSV.' });
  };

  const currentUserName = user?.name || user?.email?.split('@')[0] || 'Operator';

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* =========================================================================
            SECTION 1: HEADER
            ========================================================================= */}
        <ApprovalHeader
          onCreateRequest={() => setCreateModalOpen(true)}
          onDelegateApproval={() => handleOpenDelegateModal()}
          onExportApprovals={handleExportApprovals}
        />

        {/* =========================================================================
            SECTION 2: APPROVAL SUMMARY (MAX 4 CARDS)
            ========================================================================= */}
        <ApprovalSummary
          approvals={approvals}
          currentUserName={currentUserName}
          activeFilter={summaryFilter}
          onFilterSelect={(k) => setSummaryFilter(summaryFilter === k ? 'all' : k)}
        />

        {/* =========================================================================
            SECTION 3: IMMEDIATE DECISIONS (HERO SECTION)
            ========================================================================= */}
        <ApprovalImmediateDecisions
          approvals={approvals}
          onSelectApproval={handleSelectApproval}
          onQuickApprove={handleQuickApprove}
          onQuickReject={handleQuickReject}
        />

        {/* =========================================================================
            SECTION 4: APPROVAL WORKSPACE (VIEWS: PENDING, AWAITING ME, APPROVED, REJECTED, ESCALATED, ALL)
            ========================================================================= */}
        <ApprovalWorkspace
          approvals={approvals}
          properties={properties}
          teamMembers={teamMembers}
          currentUserName={currentUserName}
          onSelectApproval={handleSelectApproval}
          onApprove={handleQuickApprove}
          onReject={handleQuickReject}
          onRequestChanges={(id) => {
            const req = approvals.find((a) => a.id === id);
            if (req) handleSelectApproval(req);
          }}
        />

        {/* =========================================================================
            SECTION 5: DECISION HISTORY & AUDIT TRAIL
            ========================================================================= */}
        <ApprovalDecisionHistory
          approvals={approvals}
          onSelectApproval={handleSelectApproval}
        />

        {/* =========================================================================
            SECTION 6: APPROVAL OBSERVATIONS (MAX 3, ZERO AI/TELEMETRY JARGON)
            ========================================================================= */}
        <ApprovalObservations />
      </div>

      {/* =========================================================================
          MODALS & GOVERNANCE DIALOGS
          ========================================================================= */}

      {/* Cockpit Detail & Decision Modal */}
      {selectedApproval && (
        <ApprovalDetailModal
          open={detailModalOpen}
          onOpenChange={(open) => {
            setDetailModalOpen(open);
            if (!open) setTimeout(() => setSelectedApproval(null), 200);
          }}
          approval={selectedApproval}
          currentUserName={currentUserName}
          onUpdateApproval={handleUpdateApproval}
          onOpenDelegate={(app) => handleOpenDelegateModal(app)}
        />
      )}

      {/* Create Approval Request Modal */}
      <CreateApprovalModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        properties={properties}
        teamMembers={teamMembers}
        currentUserName={currentUserName}
        onCreateApproval={handleCreateApproval}
      />

      {/* Delegate Authority Modal */}
      <DelegateApprovalModal
        open={delegateModalOpen}
        onOpenChange={setDelegateModalOpen}
        approval={approvalToDelegate}
        teamMembers={teamMembers}
        currentUserName={currentUserName}
        onDelegateConfirm={handleDelegateConfirm}
      />
    </PageContainer>
  );
}
