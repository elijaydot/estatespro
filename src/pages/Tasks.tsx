// src/pages/Tasks.tsx
// FishGate Design Constitution v1.0 - Work Module: Centralized Personal Work Hub & Operational Command Layer
// Execution-Focused 8-Part Structure: Header -> My Day -> Focus Today -> My Tasks -> Team Tasks -> Upcoming Deadlines -> Recent Activity -> Work Observations

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, addDays, subDays } from 'date-fns';
import {
  CheckSquare,
  Plus,
  UserCheck,
  Download,
  ListTodo,
  Columns,
  List,
  CheckCircle2,
  X,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { PageContainer } from '@/design-system/LayoutFramework';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useLeases } from '@/hooks/useLeases';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { downloadCsv } from '@/lib/download';

import {
  TaskRecord,
  TaskPriority,
  TaskStatus,
  TaskSource,
  TaskOwner,
} from '@/components/work/types';
import { TasksMyDay } from '@/components/work/TasksMyDay';
import { TasksFocusToday } from '@/components/work/TasksFocusToday';
import { TasksMyWorkView } from '@/components/work/TasksMyWorkView';
import { TasksBoardView } from '@/components/work/TasksBoardView';
import { TasksListView } from '@/components/work/TasksListView';
import { TasksTeamTasks } from '@/components/work/TasksTeamTasks';
import { TasksUpcomingDeadlines } from '@/components/work/TasksUpcomingDeadlines';
import { TasksRecentActivity } from '@/components/work/TasksRecentActivity';
import { TasksObservations } from '@/components/work/TasksObservations';
import { CreateTaskWizard } from '@/components/work/CreateTaskWizard';
import { TaskDetailModal } from '@/components/work/TaskDetailModal';
import { AssignTaskModal } from '@/components/work/AssignTaskModal';

const TASKS_STORAGE_KEY = 'fishgate_work_tasks_v1';

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCompany } = useActiveCompany();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const { data: leases = [] } = useLeases();
  const { data: maintenanceRequests = [] } = useMaintenanceRequests();

  // Active Workspace Tab synced with URL ?tab=...
  const tabParam = searchParams.get('tab') as 'my-work' | 'board' | 'list' | 'completed' | null;

  const [activeTab, setActiveTab] = useState<'my-work' | 'board' | 'list' | 'completed'>(
    tabParam && ['my-work', 'board', 'list', 'completed'].includes(tabParam)
      ? tabParam
      : 'my-work'
  );

  useEffect(() => {
    if (tabParam && tabParam !== activeTab && ['my-work', 'board', 'list', 'completed'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (val: string) => {
    const nextTab = val as typeof activeTab;
    setActiveTab(nextTab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', nextTab);
    setSearchParams(newParams, { replace: true });
  };

  // Modals State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState<TaskRecord | null>(null);

  // My Day Interactive Filter State ('all' | 'due_today' | 'overdue' | 'awaiting' | 'blocked' | 'upcoming')
  const [myDayFilter, setMyDayFilter] = useState<string>('all');

  // Team Members Roster
  const teamMembers = useMemo<TaskOwner[]>(() => {
    return [
      { id: 'usr-1', name: 'Aimable Nkurunziza', role: 'Property Operations Lead', department: 'Facilities & Maintenance' },
      { id: 'usr-2', name: 'Diane Uwase', role: 'Leasing & Resident Relations', department: 'Leasing & Residents' },
      { id: 'usr-3', name: 'Eric Habimana', role: 'Finance & Collections Specialist', department: 'Finance & Accounts' },
      { id: 'usr-4', name: 'Alexandre Nshimiyimana', role: 'Technical Services Manager', department: 'Facilities & Maintenance' },
      { id: 'usr-5', name: 'Jean Claude Bizimana', role: 'Commercial Portfolio Manager', department: 'Property Operations' },
      { id: 'usr-6', name: 'Aline Mukagasana', role: 'Legal & Executive Officer', department: 'Executive & Legal' },
    ];
  }, []);

  // Primary Tasks State (persisted to LocalStorage and initialized with real business events)
  const [tasks, setTasks] = useState<TaskRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}

    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const nextWeekStr = format(addDays(new Date(), 6), 'yyyy-MM-dd');

    // Default Seed Tasks Generated from Real Cross-Platform Workflows
    return [
      {
        id: 'tsk-seed-1',
        taskNumber: 'TSK-2026-101',
        title: 'Execute Lease Renewal for Commercial Unit C-301',
        description: 'Tenancy agreement expires in 30 days. Contact tenant representative, deliver updated rate proposal (RWF 2,400,000/mo), and prepare renewal schedule.',
        priority: 'high',
        status: 'in_progress',
        source: 'leases',
        sourceEntityRef: 'LEAS-2026-084',
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'C-301',
        tenantName: 'Kigali Tech Innovations Ltd',
        owner: { id: 'usr-2', name: 'Diane Uwase', role: 'Leasing Specialist' },
        department: 'Leasing & Residents',
        dueDate: todayStr,
        checklist: [
          { id: 'c1', text: 'Audit payment compliance over prior 12 months', completed: true },
          { id: 'c2', text: 'Issue statutory 30-day lease renewal document', completed: true },
          { id: 'c3', text: 'Obtain director signature on updated contract', completed: false },
        ],
        comments: [
          {
            id: 'm1',
            authorName: 'Diane Uwase',
            text: 'Spoke with CFO Patrick. They agreed to 8% escalation rate for new 2-year term.',
            createdAt: '2026-11-26T14:30:00Z',
            emoji: '🤝',
          },
        ],
        attachments: [],
        tags: ['Commercial', 'Renewal', 'High Priority'],
        primaryAction: {
          label: 'Review Lease Contract',
          actionType: 'navigate',
          targetUrl: '/leases',
        },
        createdAt: '2026-11-20T08:00:00Z',
        updatedAt: '2026-11-26T14:30:00Z',
      },
      {
        id: 'tsk-seed-2',
        taskNumber: 'TSK-2026-102',
        title: 'Arrears Direct Outreach & Demand Notice (RWF 650,000)',
        description: 'Rent is 45 days past due for Unit A-201. Initiate direct contact with guarantor and dispatch formal cure notice before escalation.',
        priority: 'critical',
        status: 'not_started',
        source: 'collections',
        sourceEntityRef: 'COL-2026-042',
        propertyName: 'Riverside Luxury Suites & Apartments',
        unitNumber: 'A-201',
        tenantName: 'Jean Paul Habineza',
        owner: { id: 'usr-3', name: 'Eric Habimana', role: 'Collections Specialist' },
        department: 'Finance & Accounts',
        dueDate: todayStr,
        checklist: [
          { id: 'c1', text: 'Verify bank statement reconciliation status', completed: true },
          { id: 'c2', text: 'Deliver formal arrears cure notice via registered mail & in-app', completed: false },
          { id: 'c3', text: 'Agree on installment catch-up schedule', completed: false },
        ],
        comments: [],
        attachments: [],
        tags: ['Arrears', 'Notice', 'Urgent'],
        primaryAction: {
          label: 'Contact Resident',
          actionType: 'navigate',
          targetUrl: '/collections',
        },
        createdAt: '2026-11-22T09:00:00Z',
        updatedAt: '2026-11-26T10:00:00Z',
      },
      {
        id: 'tsk-seed-3',
        taskNumber: 'TSK-2026-103',
        title: 'Remediate Drainage Ponding Detected on Move-Out Audit',
        description: 'Inspection INSP-2026-042 failed due to defective balcony drain waterproofing. Dispatch plumbing contractor to clear drain and renew polyurethane sealant.',
        priority: 'high',
        status: 'waiting',
        waitingOn: 'Vendor quotation approval',
        source: 'maintenance',
        sourceEntityRef: 'INSP-2026-042',
        propertyName: 'Riverside Luxury Suites & Apartments',
        unitNumber: 'A-201',
        owner: { id: 'usr-1', name: 'Aimable Nkurunziza', role: 'Operations Lead' },
        department: 'Facilities & Maintenance',
        dueDate: tomorrowStr,
        checklist: [
          { id: 'c1', text: 'Inspect drain line with camera probe', completed: true },
          { id: 'c2', text: 'Obtain Wasac Plumbing formal quote', completed: true },
          { id: 'c3', text: 'Issue remediation work order WO-2026-083', completed: false },
        ],
        comments: [
          {
            id: 'm2',
            authorName: 'Aimable Nkurunziza',
            text: 'Quote received for RWF 120,000 from Wasac Plumbing. Waiting for supervisor sign-off.',
            createdAt: '2026-11-26T11:00:00Z',
            emoji: '⚠️',
          },
        ],
        attachments: [],
        tags: ['Waterproofing', 'Inspection Failure'],
        primaryAction: {
          label: 'Dispatch Work Order',
          actionType: 'navigate',
          targetUrl: '/maintenance?tab=work-orders',
        },
        createdAt: '2026-11-24T16:00:00Z',
        updatedAt: '2026-11-26T11:00:00Z',
      },
      {
        id: 'tsk-seed-4',
        taskNumber: 'TSK-2026-104',
        title: 'Authorize High-Value Outlay: Elevator Overhaul (RWF 1,950,000)',
        description: 'Mandatory quarterly lift overhaul outlays exceed statutory threshold. Requires verification against Facilities budget allocation.',
        priority: 'critical',
        status: 'under_review',
        source: 'approvals',
        sourceEntityRef: 'EXP-2026-084',
        propertyName: 'Kigali Heights Residences',
        unitNumber: 'Main Lift A',
        owner: { id: 'usr-6', name: 'Aline Mukagasana', role: 'Executive Officer' },
        department: 'Executive & Legal',
        dueDate: yesterdayStr, // Overdue
        checklist: [
          { id: 'c1', text: 'Verify contractor certificate of compliance', completed: true },
          { id: 'c2', text: 'Confirm quarterly facilities budget allocation', completed: true },
          { id: 'c3', text: 'Execute executive sign-off signature', completed: false },
        ],
        comments: [],
        attachments: [],
        tags: ['Executive Approval', 'Budget Outlay'],
        primaryAction: {
          label: 'Approve Outlay',
          actionType: 'navigate',
          targetUrl: '/expenses',
        },
        createdAt: '2026-11-25T11:00:00Z',
        updatedAt: '2026-11-26T09:00:00Z',
      },
      {
        id: 'tsk-seed-5',
        taskNumber: 'TSK-2026-105',
        title: 'Conduct Scheduled Fire Safety & Extinguisher Inspection',
        description: 'Annual regulatory audit with Rwanda Fire & Safety Authority for Common Bay A and emergency staircases.',
        priority: 'medium',
        status: 'not_started',
        source: 'maintenance',
        sourceEntityRef: 'INSP-2026-043',
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'Common Bay A',
        owner: { id: 'usr-4', name: 'Alexandre Nshimiyimana', role: 'Technical Services' },
        department: 'Facilities & Maintenance',
        dueDate: nextWeekStr,
        checklist: [
          { id: 'c1', text: 'Test dry riser pressure gauges', completed: false },
          { id: 'c2', text: 'Verify smoke detector battery levels on levels 1-5', completed: false },
          { id: 'c3', text: 'File certificate of compliance with City of Kigali', completed: false },
        ],
        comments: [],
        attachments: [],
        tags: ['Safety', 'Compliance', 'Audit'],
        primaryAction: {
          label: 'Open Inspection Form',
          actionType: 'navigate',
          targetUrl: '/maintenance?tab=inspections',
        },
        createdAt: '2026-11-26T08:00:00Z',
        updatedAt: '2026-11-26T08:00:00Z',
      },
      {
        id: 'tsk-seed-6',
        taskNumber: 'TSK-2026-106',
        title: 'Prepare Resident Move-In Welcome Pack & Key Handoff',
        description: 'New tenant signed lease for Unit B-102. Program electronic RFID gate passes, verify final cleaning checklist, and schedule orientation walkthrough.',
        priority: 'medium',
        status: 'completed',
        completedAt: '2026-11-26T16:00:00Z',
        source: 'occupancy',
        propertyName: 'Kigali Heights Residences',
        unitNumber: 'B-102',
        tenantName: 'David Mugisha',
        owner: { id: 'usr-2', name: 'Diane Uwase', role: 'Leasing Specialist' },
        department: 'Leasing & Residents',
        dueDate: yesterdayStr,
        checklist: [
          { id: 'c1', text: 'Verify security deposit bank credit', completed: true },
          { id: 'c2', text: 'Program parking gate fob code', completed: true },
          { id: 'c3', text: 'Walkthrough and condition sign-off', completed: true },
        ],
        comments: [
          {
            id: 'm3',
            authorName: 'Diane Uwase',
            text: 'Keys handed over at 15:00. Resident confirmed all fixtures operational.',
            createdAt: '2026-11-26T15:45:00Z',
            emoji: '🔑',
          },
        ],
        attachments: [],
        tags: ['Turnover', 'Move-In'],
        createdAt: '2026-11-23T10:00:00Z',
        updatedAt: '2026-11-26T16:00:00Z',
      },
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks]);

  // Handlers
  const handleSelectTask = (task: TaskRecord) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const handleCreateTask = (newTask: TaskRecord) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleUpdateTask = (updated: TaskRecord) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTask?.id === updated.id) {
      setSelectedTask(updated);
    }
  };

  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === 'completed' ? new Date().toISOString() : t.completedAt,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
    toast({ title: 'Status Updated', description: `Task transitioned to ${newStatus.replace('_', ' ')}.` });
  };

  const handleToggleComplete = (taskId: string, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    handleUpdateStatus(taskId, nextStatus);
  };

  const handleQuickAssign = (task: TaskRecord) => {
    setTaskToAssign(task);
    setAssignModalOpen(true);
  };

  const handleAssignConfirm = (taskId: string, newOwner: TaskOwner, newDueDate?: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              owner: newOwner,
              dueDate: newDueDate || t.dueDate,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  const handleExecutePrimaryAction = (task: TaskRecord) => {
    if (task.primaryAction?.targetUrl) {
      navigate(task.primaryAction.targetUrl);
    } else {
      handleSelectTask(task);
    }
  };

  // CSV Export
  const handleExportTasks = () => {
    const rows = tasks.map((t) => ({
      TaskNumber: t.taskNumber,
      Title: t.title,
      Source: t.source,
      Priority: t.priority,
      Status: t.status,
      Property: t.propertyName,
      Unit: t.unitNumber || '',
      Owner: t.owner.name,
      Department: t.department,
      DueDate: t.dueDate,
      CreatedAt: t.createdAt,
    }));
    downloadCsv(`fishgate-tasks-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: 'Tasks Exported', description: 'Exported operational tasks to CSV.' });
  };

  // Filter tasks based on My Day card selection
  const displayedTasks = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (myDayFilter === 'due_today') {
      return tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate === todayStr);
    }
    if (myDayFilter === 'overdue') {
      return tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate < todayStr);
    }
    if (myDayFilter === 'awaiting') {
      return tasks.filter((t) => (t.status === 'under_review' || t.status === 'in_progress') && t.status !== 'completed');
    }
    if (myDayFilter === 'blocked') {
      return tasks.filter((t) => (t.status === 'blocked' || t.status === 'waiting') && t.status !== 'completed');
    }
    if (myDayFilter === 'upcoming') {
      return tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate > todayStr);
    }
    return tasks;
  }, [tasks, myDayFilter]);

  const currentUserName = user?.name || user?.email?.split('@')[0] || 'Operator';

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* =========================================================================
            SECTION 1: HEADER
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-blue-600" />
              <span>Tasks</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Operational execution workspace: personal priorities, daily actions, and team follow-ups.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 h-9"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Create Task
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => {
                if (tasks.length > 0) {
                  setTaskToAssign(tasks[0]);
                  setAssignModalOpen(true);
                }
              }}
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              Assign Task
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-medium gap-1.5 text-slate-700 h-9"
              onClick={handleExportTasks}
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Tasks
            </Button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: MY DAY (HERO SECTION)
            ========================================================================= */}
        <TasksMyDay
          tasks={tasks}
          currentUserName={currentUserName}
          activeFilter={myDayFilter}
          onFilterSelect={(k) => setMyDayFilter(myDayFilter === k ? 'all' : k)}
        />

        {/* =========================================================================
            SECTION 3: FOCUS TODAY (PRIORITY OPERATIONAL QUEUE)
            ========================================================================= */}
        <TasksFocusToday
          tasks={tasks}
          onSelectTask={handleSelectTask}
          onExecutePrimaryAction={handleExecutePrimaryAction}
        />

        {/* =========================================================================
            SECTION 4: MY TASKS (DAILY PERSONAL EXECUTION WORKSPACE)
            ========================================================================= */}
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b border-slate-200 bg-slate-50/70 px-4 pt-3 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <TabsList className="bg-slate-200/60 p-1 h-auto flex flex-wrap gap-1">
                  <TabsTrigger
                    value="my-work"
                    className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
                  >
                    <ListTodo className="w-3.5 h-3.5" /> My Tasks ({tasks.filter((t) => t.status !== 'completed').length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="board"
                    className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
                  >
                    <Columns className="w-3.5 h-3.5" /> Board View
                  </TabsTrigger>
                  <TabsTrigger
                    value="list"
                    className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
                  >
                    <List className="w-3.5 h-3.5" /> List View ({tasks.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed ({tasks.filter((t) => t.status === 'completed').length})
                  </TabsTrigger>
                </TabsList>

                {myDayFilter !== 'all' && (
                  <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium">
                    <Filter className="w-3 h-3 text-blue-600" />
                    <span>Filtered by: <strong className="capitalize">{myDayFilter.replace('_', ' ')}</strong></span>
                    <button
                      onClick={() => setMyDayFilter('all')}
                      className="ml-1 text-blue-500 hover:text-blue-900 focus:outline-none"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <span className="text-xs text-slate-500 font-medium hidden md:inline">
                Execution Workspace
              </span>
            </div>

            <div className="p-4">
              {/* 1. My Work View */}
              <TabsContent value="my-work" className="m-0 p-0">
                <TasksMyWorkView
                  tasks={displayedTasks}
                  onSelectTask={handleSelectTask}
                  onToggleComplete={handleToggleComplete}
                  onQuickAssign={handleQuickAssign}
                />
              </TabsContent>

              {/* 2. Board View */}
              <TabsContent value="board" className="m-0 p-0">
                <TasksBoardView
                  tasks={displayedTasks}
                  onSelectTask={handleSelectTask}
                  onUpdateStatus={handleUpdateStatus}
                  onQuickCreate={() => setWizardOpen(true)}
                />
              </TabsContent>

              {/* 3. List View */}
              <TabsContent value="list" className="m-0 p-0">
                <TasksListView
                  tasks={displayedTasks}
                  onSelectTask={handleSelectTask}
                  onUpdateStatus={handleUpdateStatus}
                  onAssignTask={handleQuickAssign}
                />
              </TabsContent>

              {/* 4. Completed Work View */}
              <TabsContent value="completed" className="m-0 p-0">
                <TasksListView
                  tasks={tasks.filter((t) => t.status === 'completed')}
                  onSelectTask={handleSelectTask}
                  onUpdateStatus={handleUpdateStatus}
                  onAssignTask={handleQuickAssign}
                />
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        {/* =========================================================================
            SECTION 5: TEAM TASKS (LIGHTWEIGHT DELEGATION & ACCOUNTABILITY VIEW)
            ========================================================================= */}
        <Card className="p-4 border-slate-200 shadow-xs">
          <div className="mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Team Tasks & Accountability</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Delegate work, balance responsibilities, and monitor team commitments across properties.
              </p>
            </div>
            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
              {teamMembers.length} Members Active
            </Badge>
          </div>
          <TasksTeamTasks
            tasks={tasks}
            teamMembers={teamMembers}
            onSelectTask={handleSelectTask}
            onQuickAssign={handleQuickAssign}
            onUpdateStatus={handleUpdateStatus}
          />
        </Card>

        {/* =========================================================================
            SECTIONS 6 & 7: UPCOMING DEADLINES & RECENT ACTIVITY (FORWARD SCHEDULE & AUDIT STREAM)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 6: Upcoming Deadlines */}
          <div>
            <TasksUpcomingDeadlines
              tasks={tasks}
              onSelectTask={handleSelectTask}
            />
          </div>

          {/* Section 7: Recent Activity */}
          <div>
            <TasksRecentActivity
              tasks={tasks}
              onSelectTask={handleSelectTask}
            />
          </div>
        </div>

        {/* =========================================================================
            SECTION 8: WORK OBSERVATIONS (MAX 3, STRICTLY ZERO AI/COPILOT/ML BUZZWORDS)
            ========================================================================= */}
        <TasksObservations tasks={tasks} />
      </div>

      {/* =========================================================================
          MODALS & WORKFLOWS
          ========================================================================= */}

      {/* 5-Step Task Creation Wizard */}
      <CreateTaskWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        properties={properties}
        tenants={tenants}
        teamMembers={teamMembers}
        onCreateTask={handleCreateTask}
      />

      {/* Task Cockpit Detail & Collaboration Modal */}
      {selectedTask && (
        <TaskDetailModal
          open={detailModalOpen}
          onOpenChange={(open) => {
            setDetailModalOpen(open);
            if (!open) setTimeout(() => setSelectedTask(null), 200);
          }}
          task={selectedTask}
          onUpdateTask={handleUpdateTask}
          onReassign={handleQuickAssign}
        />
      )}

      {/* Quick Assign Modal */}
      {taskToAssign && (
        <AssignTaskModal
          open={assignModalOpen}
          onOpenChange={(open) => {
            setAssignModalOpen(open);
            if (!open) setTimeout(() => setTaskToAssign(null), 200);
          }}
          task={taskToAssign}
          teamMembers={teamMembers}
          onAssignConfirm={handleAssignConfirm}
        />
      )}
    </PageContainer>
  );
}
