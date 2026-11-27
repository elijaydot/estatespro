// src/pages/Maintenance.tsx
// FishGate Design Constitution v1.0 - Single Physical Property Operations Command Center

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Wrench,
  CheckSquare,
  ClipboardList,
  Building,
  Calendar,
  Plus,
  Download,
  AlertTriangle,
  Clock,
  Printer,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { PageContainer } from '@/design-system/LayoutFramework';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useVendors } from '@/hooks/useVendors';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { downloadCsv } from '@/lib/download';
import { openPrintHtml } from '@/lib/pdfService';

import {
  MaintenanceRequestRecord,
  WorkOrderRecord,
  InspectionRecord,
  VendorOperationalProfile,
  MaintenanceCalendarItem,
  CriticalAttentionItem,
  WorkOrderStatus,
} from '@/components/maintenance/types';
import { MaintenanceHealthSummary } from '@/components/maintenance/MaintenanceHealthSummary';
import { MaintenanceCriticalAttention } from '@/components/maintenance/MaintenanceCriticalAttention';
import { MaintenanceRequestsView } from '@/components/maintenance/MaintenanceRequestsView';
import { MaintenanceWorkOrdersView } from '@/components/maintenance/MaintenanceWorkOrdersView';
import { MaintenanceInspectionsView } from '@/components/maintenance/MaintenanceInspectionsView';
import { MaintenanceVendorsView } from '@/components/maintenance/MaintenanceVendorsView';
import { MaintenanceCalendarView } from '@/components/maintenance/MaintenanceCalendarView';
import { MaintenancePropertyHealth } from '@/components/maintenance/MaintenancePropertyHealth';
import { MaintenanceObservations } from '@/components/maintenance/MaintenanceObservations';
import { MaintenanceRequestWizard } from '@/components/maintenance/MaintenanceRequestWizard';
import { RequestDetailModal } from '@/components/maintenance/RequestDetailModal';
import { WorkOrderDetailModal } from '@/components/maintenance/WorkOrderDetailModal';
import { CreateWorkOrderModal } from '@/components/maintenance/CreateWorkOrderModal';
import { ScheduleInspectionModal } from '@/components/maintenance/ScheduleInspectionModal';
import { InspectionDetailModal } from '@/components/maintenance/InspectionDetailModal';
import { VendorDetailModal } from '@/components/maintenance/VendorDetailModal';
import { AddMaintenanceVendorModal } from '@/components/maintenance/AddMaintenanceVendorModal';
import { AssignVendorModal } from '@/components/maintenance/AssignVendorModal';

const WORK_ORDERS_STORAGE_KEY = 'fishgate_work_orders_v1';
const INSPECTIONS_STORAGE_KEY = 'fishgate_inspections_v1';
const MANUAL_REQUESTS_STORAGE_KEY = 'fishgate_manual_requests_v1';
const VENDORS_STORAGE_KEY = 'fishgate_maintenance_vendors_v1';

export default function Maintenance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeCompany } = useActiveCompany();
  const { data: properties = [], isLoading: isLoadingProperties } = useProperties();
  const { data: tenants = [], isLoading: isLoadingTenants } = useTenants();
  const { vendors: rawVendors = [] } = useVendors();
  const { data: rawRequests = [], isLoading: isLoadingRequests } = useMaintenanceRequests();

  const currency = 'RWF';

  // Active Workspace Tab synced with URL ?tab=...
  const tabParam = searchParams.get('tab') as 'requests' | 'work-orders' | 'inspections' | 'vendors' | 'calendar' | null;
  const [activeTab, setActiveTab] = useState<'requests' | 'work-orders' | 'inspections' | 'vendors' | 'calendar'>(
    tabParam && ['requests', 'work-orders', 'inspections', 'vendors', 'calendar'].includes(tabParam)
      ? tabParam
      : 'requests'
  );

  useEffect(() => {
    if (tabParam && tabParam !== activeTab && ['requests', 'work-orders', 'inspections', 'vendors', 'calendar'].includes(tabParam)) {
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

  // Modals
  const [wizardOpen, setWizardOpen] = useState(false);
  const [createWoOpen, setCreateWoOpen] = useState(false);
  const [scheduleInspOpen, setScheduleInspOpen] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestRecord | null>(null);
  const [requestDetailOpen, setRequestDetailOpen] = useState(false);

  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderRecord | null>(null);
  const [workOrderDetailOpen, setWorkOrderDetailOpen] = useState(false);

  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);
  const [inspectionDetailOpen, setInspectionDetailOpen] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState<VendorOperationalProfile | null>(null);
  const [vendorDetailOpen, setVendorDetailOpen] = useState(false);

  const [addVendorOpen, setAddVendorOpen] = useState(false);

  const [assignVendorOpen, setAssignVendorOpen] = useState(false);
  const [assignPreselectedVendorId, setAssignPreselectedVendorId] = useState<string | null>(null);
  const [assignPreselectedWorkOrderId, setAssignPreselectedWorkOrderId] = useState<string | null>(null);
  const [assignPreselectedRequestId, setAssignPreselectedRequestId] = useState<string | null>(null);

  const [initialWoData, setInitialWoData] = useState<any>(null);

  // 1. Manual Requests Storage
  const [manualRequests, setManualRequests] = useState<MaintenanceRequestRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(MANUAL_REQUESTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MANUAL_REQUESTS_STORAGE_KEY, JSON.stringify(manualRequests));
    }
  }, [manualRequests]);

  // 2. Work Orders Storage
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(WORK_ORDERS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}

    // Default Seed Work Orders
    return [
      {
        id: 'wo-seed-1',
        workOrderNumber: 'WO-2026-081',
        title: 'Master AC Compressor Refill & Coil Chemical Flush',
        issueDescription: 'Refrigerant R-410A pressure test, leak detection on brazed line and chemical flush of condenser coils.',
        propertyId: 'prop-1',
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'C-301',
        assignedVendorName: 'Kigali Premier Electrical & HVAC Services Ltd',
        assignedTechnician: 'Eric Habimana',
        tradeCategory: 'HVAC',
        status: 'in_progress',
        priority: 'high',
        scheduledDate: '2026-11-25T08:00:00Z',
        dueDate: '2026-11-28',
        estimatedCost: 180000,
        actualCost: 180000,
        progress: 60,
        documents: [],
        createdAt: '2026-11-24T10:00:00Z',
        updatedAt: '2026-11-26T14:00:00Z',
      },
      {
        id: 'wo-seed-2',
        workOrderNumber: 'WO-2026-082',
        title: 'Common Area Elevator Bay Hydraulic Valve Inspection',
        issueDescription: 'Quarterly statutory elevator governor check, cable tension calibration and oil seal renewal.',
        propertyId: 'prop-1',
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'Common Bay A',
        assignedVendorName: 'Schindler & Otis Engineering Rwanda',
        assignedTechnician: 'Jean Claude Bizimana',
        tradeCategory: 'Elevator',
        status: 'scheduled',
        priority: 'emergency',
        scheduledDate: '2026-11-27T09:00:00Z',
        dueDate: '2026-11-27',
        estimatedCost: 850000,
        actualCost: 850000,
        progress: 20,
        documents: [],
        createdAt: '2026-11-25T11:00:00Z',
        updatedAt: '2026-11-25T11:00:00Z',
      },
      {
        id: 'wo-seed-3',
        workOrderNumber: 'WO-2026-083',
        title: 'Balcony Waterproofing & Drainage Resealing',
        issueDescription: 'Strip defective elastomeric coating, apply multi-layer polyurethane membrane and leak test.',
        propertyId: 'prop-2',
        propertyName: 'Riverside Luxury Suites & Apartments',
        unitNumber: 'A-201',
        assignedVendorName: 'Wasac Certified Plumbing Contractors Ltd',
        assignedTechnician: 'Aimable Nkurunziza',
        tradeCategory: 'Plumbing',
        status: 'parts_required',
        priority: 'medium',
        scheduledDate: '2026-11-26T13:00:00Z',
        dueDate: '2026-11-29',
        estimatedCost: 120000,
        actualCost: 120000,
        progress: 35,
        documents: [],
        createdAt: '2026-11-22T09:00:00Z',
        updatedAt: '2026-11-26T16:00:00Z',
      },
      {
        id: 'wo-seed-4',
        workOrderNumber: 'WO-2026-084',
        title: 'Perimeter Security Sensor & Motion Floodlight Wiring',
        issueDescription: 'Rewire 24V perimeter sensors, replace failed motion relay switch on north fence.',
        propertyId: 'prop-1',
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: null,
        assignedVendorName: 'Intersec Rwanda Security Ltd',
        assignedTechnician: 'David Mugisha',
        tradeCategory: 'Security',
        status: 'completed',
        priority: 'medium',
        scheduledDate: '2026-11-20T10:00:00Z',
        dueDate: '2026-11-22',
        completedAt: '2026-11-22T17:00:00Z',
        estimatedCost: 95000,
        actualCost: 95000,
        progress: 100,
        documents: [],
        createdAt: '2026-11-19T10:00:00Z',
        updatedAt: '2026-11-22T17:00:00Z',
      },
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WORK_ORDERS_STORAGE_KEY, JSON.stringify(workOrders));
    }
  }, [workOrders]);

  // 3. Inspections Storage
  const [inspections, setInspections] = useState<InspectionRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(INSPECTIONS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}

    // Default Seed Inspections
    return [
      {
        id: 'insp-seed-1',
        reference: 'INSP-2026-041',
        propertyId: 'prop-1',
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'C-301',
        type: 'routine',
        inspector: 'Chief Quality Inspector',
        inspectionDate: '2026-11-22',
        conditionScore: 84,
        conditionRating: 'good',
        outcome: 'passed_with_recommendations',
        issuesFound: [
          {
            id: 'iss-1',
            area: 'HVAC',
            item: 'AC Compressor',
            description: 'Vibration noise noted on outdoor condenser bracket',
            severity: 'minor',
            requiresWorkOrder: true,
            photos: [],
          },
        ],
        attachments: [],
        createdAt: '2026-11-22T14:00:00Z',
      },
      {
        id: 'insp-seed-2',
        reference: 'INSP-2026-042',
        propertyId: 'prop-2',
        propertyName: 'Riverside Luxury Suites & Apartments',
        unitNumber: 'A-201',
        type: 'move_out',
        inspector: 'Senior Property Manager',
        inspectionDate: '2026-11-24',
        conditionScore: 68,
        conditionRating: 'poor',
        outcome: 'failed',
        issuesFound: [
          {
            id: 'iss-2',
            area: 'Balcony',
            item: 'Drainage Tile',
            description: 'Water ponding on east corner due to blocked drain pipe',
            severity: 'major',
            requiresWorkOrder: true,
            photos: [],
          },
        ],
        attachments: [],
        createdAt: '2026-11-24T16:00:00Z',
      },
      {
        id: 'insp-seed-3',
        reference: 'INSP-2026-043',
        propertyId: 'prop-1',
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'Common Bay A',
        type: 'safety',
        inspector: 'Rwanda Fire & Safety Authority',
        inspectionDate: '2026-11-26',
        conditionScore: 96,
        conditionRating: 'excellent',
        outcome: 'passed',
        issuesFound: [],
        attachments: [],
        createdAt: '2026-11-26T10:00:00Z',
      },
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(inspections));
    }
  }, [inspections]);

  // 4. Unified Requests: Combines Supabase requests with manual records
  const allRequests = useMemo<MaintenanceRequestRecord[]>(() => {
    const list: MaintenanceRequestRecord[] = [];

    rawRequests.forEach((req: any) => {
      const prop = properties.find((p) => p.id === req.property_id);
      const unit = req.units;
      const ten = req.tenants;

      list.push({
        id: req.id,
        reference: `REQ-${req.id.slice(0, 6).toUpperCase()}`,
        title: req.title,
        description: req.description,
        category: 'Plumbing',
        propertyId: req.property_id || prop?.id || 'prop-1',
        propertyName: prop?.name || 'Vision City Commercial & Residential Hub',
        unitId: req.unit_id || null,
        unitNumber: unit?.unit_number || '301',
        priority: (req.priority?.toLowerCase() as any) || 'medium',
        issueSource: 'resident',
        status: (req.status?.toLowerCase() as any) || 'reported',
        reportedBy: {
          name: ten?.name || 'Resident',
          email: ten?.email || undefined,
          role: 'resident',
          preferredContact: 'phone',
        },
        impact: {
          occupancyImpact: req.priority === 'emergency',
          revenueImpact: false,
          safetyRisk: req.priority === 'emergency',
          residentImpact: 'single',
          urgency: req.priority === 'emergency' ? 'immediate' : 'within_24h',
          severity: req.priority === 'emergency' ? 'critical' : 'minor',
        },
        media: [],
        assignment: {
          assignedTo: req.assigned_to || undefined,
          assignedTeam: 'In-House Crew',
          dueDate: req.created_at ? format(new Date(req.created_at), 'yyyy-MM-dd') : undefined,
        },
        createdAt: req.created_at || new Date().toISOString(),
        updatedAt: req.updated_at || new Date().toISOString(),
      });
    });

    // Default Fallback Requests if remote is empty
    if (list.length === 0) {
      list.push(
        {
          id: 'req-seed-1',
          reference: 'REQ-2026-101',
          title: 'Master Bathroom Cold Water Pipe Pressure Loss',
          description: 'Sudden pressure drop in shower and bathroom sink with hammering sound inside ceiling cavity.',
          category: 'Plumbing',
          propertyId: properties[0]?.id || 'prop-1',
          propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
          unitNumber: 'C-301',
          priority: 'emergency',
          issueSource: 'resident',
          status: 'assigned',
          reportedBy: {
            name: 'Aline Mukagasana',
            email: 'aline@example.com',
            phone: '+250 788 123 456',
            role: 'resident',
            preferredContact: 'phone',
          },
          impact: {
            occupancyImpact: true,
            revenueImpact: false,
            safetyRisk: true,
            residentImpact: 'single',
            urgency: 'immediate',
            severity: 'critical',
          },
          media: [],
          assignment: {
            assignedTo: 'Aimable Nkurunziza',
            assignedTeam: 'Plumbing Crew',
            dueDate: '2026-11-27',
            slaHours: 4,
          },
          createdAt: '2026-11-26T08:30:00Z',
          updatedAt: '2026-11-26T09:00:00Z',
        },
        {
          id: 'req-seed-2',
          reference: 'REQ-2026-102',
          title: 'Elevator Bay A Door Roller Vibration',
          description: 'Intermittent shuddering when opening on Level 3 lobby landing.',
          category: 'Elevator',
          propertyId: properties[0]?.id || 'prop-1',
          propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
          unitNumber: 'Common Bay A',
          priority: 'high',
          issueSource: 'staff',
          status: 'converted_to_work_order',
          reportedBy: {
            name: 'Facilities Desk',
            role: 'staff',
            preferredContact: 'in_app',
          },
          impact: {
            occupancyImpact: false,
            revenueImpact: false,
            safetyRisk: true,
            residentImpact: 'building',
            urgency: 'within_24h',
            severity: 'major',
          },
          media: [],
          workOrderNumber: 'WO-2026-082',
          createdAt: '2026-11-25T11:00:00Z',
          updatedAt: '2026-11-25T11:30:00Z',
        }
      );
    }

    // Append operator manual requests
    manualRequests.forEach((m) => list.unshift(m));

    return list;
  }, [rawRequests, properties, manualRequests]);

  // 5. Vendor Operational Profiles (with LocalStorage persistence)
  const [vendorProfiles, setVendorProfiles] = useState<VendorOperationalProfile[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(VENDORS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}

    return [
      {
        id: 'vend-1',
        name: 'ElectroPower Rwanda Ltd',
        tradeCategory: 'Electrical & Power Generators',
        contactPerson: 'Alexandre Nshimiyimana',
        email: 'service@electropower.rw',
        phone: '+250 788 340 119',
        activeWorkOrders: 1,
        responseTimeHours: 2.1,
        completionRate: 98,
        costYtd: 3400000,
        rating: 4.9,
        emergencyService: true,
        status: 'active',
        insuranceValid: true,
        licenseValid: true,
        slaStandardHours: 4,
      },
      {
        id: 'vend-2',
        name: 'Kigali Clean & Green Services',
        tradeCategory: 'Sanitation & Waste Management',
        contactPerson: 'Diane Uwase',
        email: 'operations@kigaliclean.rw',
        phone: '+250 788 554 220',
        activeWorkOrders: 2,
        responseTimeHours: 3.5,
        completionRate: 95,
        costYtd: 1200000,
        rating: 4.7,
        emergencyService: false,
        status: 'active',
        insuranceValid: true,
        licenseValid: true,
        slaStandardHours: 12,
      },
      {
        id: 'vend-3',
        name: 'Intersec Rwanda Security Ltd',
        tradeCategory: 'Security, CCTV & Access Controls',
        contactPerson: 'Eric Habimana',
        email: 'dispatch@intersec.rw',
        phone: '+250 788 771 900',
        activeWorkOrders: 0,
        responseTimeHours: 1.4,
        completionRate: 100,
        costYtd: 2100000,
        rating: 5.0,
        emergencyService: true,
        status: 'active',
        insuranceValid: true,
        licenseValid: true,
        slaStandardHours: 2,
      },
      {
        id: 'vend-4',
        name: 'Wasac Certified Plumbing Contractors Ltd',
        tradeCategory: 'Plumbing & Drainage',
        contactPerson: 'Aimable Nkurunziza',
        email: 'contracts@wasacplumbing.rw',
        phone: '+250 788 909 332',
        activeWorkOrders: 2,
        responseTimeHours: 2.8,
        completionRate: 94,
        costYtd: 1850000,
        rating: 4.6,
        emergencyService: true,
        status: 'active',
        insuranceValid: true,
        licenseValid: true,
        slaStandardHours: 4,
      },
      {
        id: 'vend-5',
        name: 'Schindler & Otis Engineering Rwanda',
        tradeCategory: 'Elevator & Heavy Lifts',
        contactPerson: 'Jean Claude Bizimana',
        email: 'kigali.lifts@schindler.rw',
        phone: '+250 788 661 884',
        activeWorkOrders: 1,
        responseTimeHours: 1.8,
        completionRate: 99,
        costYtd: 4200000,
        rating: 4.9,
        emergencyService: true,
        status: 'active',
        insuranceValid: true,
        licenseValid: true,
        slaStandardHours: 4,
      },
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(vendorProfiles));
    }
  }, [vendorProfiles]);

  const handleAddVendor = (newVendor: VendorOperationalProfile) => {
    setVendorProfiles((prev) => [newVendor, ...prev]);
  };

  // 6. Calendar Operational Activities
  const calendarItems = useMemo<MaintenanceCalendarItem[]>(() => {
    const list: MaintenanceCalendarItem[] = [];

    workOrders.forEach((w) => {
      list.push({
        id: `cal-wo-${w.id}`,
        title: `${w.workOrderNumber}: ${w.title}`,
        type: 'repair',
        date: w.scheduledDate,
        propertyName: w.propertyName,
        unitNumber: w.unitNumber,
        assignedTo: w.assignedVendorName || 'In-House Crew',
        status: w.status === 'completed' ? 'completed' : 'scheduled',
      });
    });

    inspections.forEach((i) => {
      list.push({
        id: `cal-insp-${i.id}`,
        title: `${i.reference}: ${i.type.replace('_', ' ')} Inspection`,
        type: 'inspection',
        date: i.inspectionDate,
        propertyName: i.propertyName,
        unitNumber: i.unitNumber,
        assignedTo: i.inspector,
        status: 'scheduled',
      });
    });

    allRequests.forEach((r) => {
      list.push({
        id: `cal-req-${r.id}`,
        title: `${r.reference}: ${r.title}`,
        type: 'repair',
        date: r.assignment?.dueDate || r.createdAt.slice(0, 10),
        propertyName: r.propertyName,
        unitNumber: r.unitNumber,
        assignedTo: r.assignment?.assignedTo || r.assignment?.vendorName || 'Unassigned',
        status: r.status === 'closed' ? 'completed' : 'scheduled',
      });
    });

    return list;
  }, [workOrders, inspections, allRequests]);

  // 7. Critical Attention Hero Items
  const criticalItems = useMemo<CriticalAttentionItem[]>(() => {
    const items: CriticalAttentionItem[] = [];

    // Emergency requests
    allRequests
      .filter((r) => r.priority === 'emergency' && r.status !== 'closed' && r.status !== 'converted_to_work_order')
      .forEach((r) => {
        items.push({
          id: `crit-req-${r.id}`,
          issue: r.title,
          property: r.propertyName,
          unit: r.unitNumber || 'Common Area',
          priority: 'emergency',
          owner: r.assignment?.assignedTo || 'Unassigned',
          impact: 'Active pipe failure threat to resident unit and ceiling structure.',
          primaryAction: 'Dispatch Emergency Crew',
          targetType: 'request',
          targetId: r.id,
        });
      });

    // Failed inspections
    inspections
      .filter((i) => i.outcome === 'failed')
      .forEach((i) => {
        items.push({
          id: `crit-insp-${i.id}`,
          issue: `Failed Move-Out Audit: Drainage ponding issue detected (${i.reference})`,
          property: i.propertyName,
          unit: i.unitNumber || 'A-201',
          priority: 'inspection_failure',
          owner: i.inspector,
          impact: 'Delays vacant unit turnaround and security deposit settlement.',
          primaryAction: 'Issue Remediation Work Order',
          targetType: 'inspection',
          targetId: i.id,
        });
      });

    // Overdue Work Orders
    const now = new Date();
    workOrders
      .filter((w) => w.status !== 'completed' && w.status !== 'closed' && new Date(w.dueDate).getTime() < now.getTime())
      .forEach((w) => {
        items.push({
          id: `crit-wo-${w.id}`,
          issue: `Vendor Overdue: ${w.workOrderNumber} - ${w.title}`,
          property: w.propertyName,
          unit: w.unitNumber || 'Main Lift',
          priority: 'vendor_delay',
          owner: w.assignedVendorName || 'Contractor',
          impact: 'Exceeded statutory completion SLA target.',
          primaryAction: 'Expedite Contractor',
          targetType: 'work_order',
          targetId: w.id,
        });
      });

    return items;
  }, [allRequests, inspections, workOrders]);

  // Handlers
  const handleSelectRequest = (req: MaintenanceRequestRecord) => {
    setSelectedRequest(req);
    setRequestDetailOpen(true);
  };

  const handleSelectWorkOrder = (order: WorkOrderRecord) => {
    setSelectedWorkOrder(order);
    setWorkOrderDetailOpen(true);
  };

  const handleConvertToWorkOrder = (req: MaintenanceRequestRecord) => {
    setInitialWoData({
      title: req.title,
      description: req.description,
      propertyId: req.propertyId,
      propertyName: req.propertyName,
      unitNumber: req.unitNumber || undefined,
      tradeCategory: req.category,
      priority: req.priority,
      requestId: req.id,
      requestReference: req.reference,
    });
    setCreateWoOpen(true);
  };

  const handleCreateRequest = (newReq: MaintenanceRequestRecord) => {
    setManualRequests((prev) => [newReq, ...prev]);
  };

  const handleCreateWorkOrder = (newOrder: WorkOrderRecord) => {
    setWorkOrders((prev) => [newOrder, ...prev]);

    // If converted from a request, update that request's status
    if (newOrder.requestId) {
      setManualRequests((prev) =>
        prev.map((r) =>
          r.id === newOrder.requestId
            ? { ...r, status: 'converted_to_work_order', workOrderId: newOrder.id, workOrderNumber: newOrder.workOrderNumber }
            : r
        )
      );
    }
  };

  const handleUpdateWorkOrder = (updated: WorkOrderRecord) => {
    setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  };

  const handleUpdateOrderStatus = (orderId: string, status: WorkOrderStatus) => {
    setWorkOrders((prev) =>
      prev.map((w) => (w.id === orderId ? { ...w, status, completedAt: status === 'completed' ? new Date().toISOString() : w.completedAt } : w))
    );
    toast({ title: 'Status Updated', description: `Work order transitioned to ${status}.` });
  };

  const handleScheduleInspection = (newInsp: InspectionRecord) => {
    setInspections((prev) => [newInsp, ...prev]);
  };

  const handleGenerateWoFromInspection = (insp: InspectionRecord) => {
    setInitialWoData({
      title: `Remediate findings from ${insp.reference}`,
      description: insp.issuesFound.map((iss) => `${iss.area}: ${iss.description}`).join('; ') || 'Inspection repair remediation',
      propertyId: insp.propertyId,
      propertyName: insp.propertyName,
      unitNumber: insp.unitNumber || undefined,
      tradeCategory: 'General',
      priority: 'high',
    });
    setCreateWoOpen(true);
  };

  const handleCriticalAction = (item: CriticalAttentionItem) => {
    if (item.targetType === 'request') {
      const match = allRequests.find((r) => r.id === item.targetId);
      if (match) handleConvertToWorkOrder(match);
    } else if (item.targetType === 'inspection') {
      const match = inspections.find((i) => i.id === item.targetId);
      if (match) handleGenerateWoFromInspection(match);
    } else if (item.targetType === 'work_order') {
      const match = workOrders.find((w) => w.id === item.targetId);
      if (match) handleSelectWorkOrder(match);
    }
  };

  const handleAssignConfirm = (payload: {
    targetType: 'work_order' | 'request';
    targetId: string;
    vendor: VendorOperationalProfile;
    technician: string;
    scheduledDate: string;
    instructions: string;
  }) => {
    if (payload.targetType === 'work_order') {
      setWorkOrders((prev) =>
        prev.map((w) =>
          w.id === payload.targetId
            ? {
                ...w,
                assignedVendorId: payload.vendor.id,
                assignedVendorName: payload.vendor.name,
                assignedTechnician: payload.technician,
                scheduledDate: `${payload.scheduledDate}T09:00:00Z`,
                tradeCategory: payload.vendor.tradeCategory.split('&')[0].trim(),
                status: w.status === 'awaiting_approval' ? 'awaiting_approval' : 'scheduled',
                technicianNotes: payload.instructions
                  ? `${payload.instructions}\n${w.technicianNotes || ''}`
                  : w.technicianNotes,
                updatedAt: new Date().toISOString(),
              }
            : w
        )
      );

      // Increment vendor active work orders
      setVendorProfiles((prev) =>
        prev.map((v) =>
          v.id === payload.vendor.id ? { ...v, activeWorkOrders: v.activeWorkOrders + 1 } : v
        )
      );
    } else {
      // It's a request
      setManualRequests((prev) =>
        prev.map((r) =>
          r.id === payload.targetId
            ? {
                ...r,
                status: 'assigned',
                assignment: {
                  ...r.assignment,
                  assignedTo: payload.technician,
                  assignedTeam: payload.vendor.tradeCategory,
                  vendorId: payload.vendor.id,
                  vendorName: payload.vendor.name,
                  dueDate: payload.scheduledDate,
                },
                notes: payload.instructions
                  ? `${payload.instructions}\n${r.notes || ''}`
                  : r.notes,
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      );
    }
  };

  const handleSelectCalendarItem = (item: MaintenanceCalendarItem) => {
    if (item.id.startsWith('cal-wo-')) {
      const woId = item.id.replace('cal-wo-', '');
      const match = workOrders.find((w) => w.id === woId);
      if (match) {
        setSelectedWorkOrder(match);
        setWorkOrderDetailOpen(true);
        return;
      }
    }

    if (item.id.startsWith('cal-insp-')) {
      const inspId = item.id.replace('cal-insp-', '');
      const match = inspections.find((i) => i.id === inspId);
      if (match) {
        setSelectedInspection(match);
        setInspectionDetailOpen(true);
        return;
      }
    }

    if (item.id.startsWith('cal-req-')) {
      const reqId = item.id.replace('cal-req-', '');
      const match = allRequests.find((r) => r.id === reqId);
      if (match) {
        setSelectedRequest(match);
        setRequestDetailOpen(true);
        return;
      }
    }

    // Fallback matching
    const fallbackWo = workOrders.find((w) => item.title.includes(w.workOrderNumber));
    if (fallbackWo) {
      setSelectedWorkOrder(fallbackWo);
      setWorkOrderDetailOpen(true);
      return;
    }

    const fallbackInsp = inspections.find((i) => item.title.includes(i.reference));
    if (fallbackInsp) {
      setSelectedInspection(fallbackInsp);
      setInspectionDetailOpen(true);
      return;
    }
  };

  // Official Work Sheet Printing (client-side print engine, 0 edge function errors)
  const handlePrintWorkOrder = (order: WorkOrderRecord) => {
    const compName = activeCompany?.name || 'FishGate Real Estate Rwanda Ltd';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Official Work Order Sheet - ${order.workOrderNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 36px; color: #0f172a; line-height: 1.45; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .ref { font-size: 14px; font-family: monospace; font-weight: 700; color: #2563eb; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; font-size: 12px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .box-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
    .box-val { font-weight: 600; color: #0f172a; }
    .scope { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 700; color: #475569; border-bottom: 1.5px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 36px; padding-top: 18px; border-top: 1px dashed #cbd5e1; font-size: 11px; }
    .sig-line { border-bottom: 1px solid #94a3b8; height: 32px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">OFFICIAL MAINTENANCE WORK ORDER</h1>
      <div class="ref">${order.workOrderNumber}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${compName}</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748b;">
      <div><strong>Priority:</strong> ${order.priority.toUpperCase()}</div>
      <div><strong>Due Date:</strong> ${order.dueDate}</div>
      <div><strong>Trade:</strong> ${order.tradeCategory}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-label">Premises & Space</div>
      <div class="box-val">${order.propertyName} ${order.unitNumber ? `(Unit ${order.unitNumber})` : ''}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Scheduled: ${order.scheduledDate.slice(0, 10)}</div>
    </div>
    <div class="box">
      <div class="box-label">Dispatched Contractor</div>
      <div class="box-val">${order.assignedVendorName || 'In-House Crew'}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Lead Tech: ${order.assignedTechnician || 'Technician'}</div>
    </div>
  </div>

  <div class="scope">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #64748b; margin-bottom: 4px;">Task Scope & Technical Description</div>
    <div style="font-size: 13px; font-weight: 600; color: #0f172a;">${order.title}</div>
    <div style="margin-top: 6px; color: #334155;">${order.issueDescription}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Billing Element</th>
        <th style="text-align: right;">Estimated Ceiling</th>
        <th style="text-align: right;">Progress</th>
        <th style="text-align: right;">Authorized Budget</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Contractor Labor & Diagnostic Assessment</td>
        <td style="text-align: right; font-family: monospace;">${currency} ${order.estimatedCost.toLocaleString()}</td>
        <td style="text-align: right;">${order.progress}%</td>
        <td style="text-align: right; font-weight: bold; font-family: monospace;">${currency} ${(order.actualCost || order.estimatedCost).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div>
      <div class="sig-line"></div>
      <div style="text-align: center; color: #64748b;">Technician Signature</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div style="text-align: center; color: #64748b;">Resident / Tenant Sign-Off</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div style="text-align: center; color: #64748b;">Facility Manager Approval</div>
    </div>
  </div>
</body>
</html>`;

    openPrintHtml(html, `WorkOrder-${order.workOrderNumber}`);
  };

  // CSV Exporter
  const handleExportCsv = () => {
    if (activeTab === 'requests') {
      const rows = allRequests.map((r) => ({
        Reference: r.reference,
        Title: r.title,
        Category: r.category,
        Priority: r.priority,
        Status: r.status,
        Property: r.propertyName,
        Unit: r.unitNumber || '',
        ReportedBy: r.reportedBy.name,
        Date: r.createdAt,
      }));
      downloadCsv(`maintenance-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    } else if (activeTab === 'work-orders') {
      const rows = workOrders.map((w) => ({
        WorkOrder: w.workOrderNumber,
        Title: w.title,
        Trade: w.tradeCategory,
        Property: w.propertyName,
        Unit: w.unitNumber || '',
        Vendor: w.assignedVendorName || 'In-House Crew',
        Technician: w.assignedTechnician || '',
        Status: w.status,
        Cost: w.actualCost || w.estimatedCost,
        DueDate: w.dueDate,
      }));
      downloadCsv(`maintenance-work-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    } else if (activeTab === 'inspections') {
      const rows = inspections.map((i) => ({
        Reference: i.reference,
        Property: i.propertyName,
        Unit: i.unitNumber || '',
        Type: i.type,
        Inspector: i.inspector,
        Score: i.conditionScore,
        Outcome: i.outcome,
        Date: i.inspectionDate,
      }));
      downloadCsv(`inspections-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    } else {
      const rows = vendorProfiles.map((v) => ({
        Vendor: v.name,
        Trade: v.tradeCategory,
        Contact: v.contactPerson,
        Phone: v.phone,
        ActiveOrders: v.activeWorkOrders,
        CompletionRate: `${v.completionRate}%`,
        Rating: v.rating,
      }));
      downloadCsv(`maintenance-vendors-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    }

    toast({ title: 'Export Generated', description: `Exported ${activeTab} data to CSV.` });
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* =========================================================================
            SECTION 1: HEADER
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Maintenance
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage repairs, inspections, vendors, scheduling and property operations.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 h-9"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Create Request
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => {
                setInitialWoData(null);
                setCreateWoOpen(true);
              }}
            >
              <CheckSquare className="w-4 h-4 text-blue-600" />
              Create Work Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-medium gap-1.5 text-slate-700 h-9"
              onClick={() => setScheduleInspOpen(true)}
            >
              <ClipboardList className="w-4 h-4 text-purple-600" />
              Schedule Inspection
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-medium gap-1.5 text-slate-700 h-9"
              onClick={() => {
                setAssignPreselectedVendorId(null);
                setAssignPreselectedWorkOrderId(null);
                setAssignPreselectedRequestId(null);
                setAssignVendorOpen(true);
              }}
            >
              <Building className="w-4 h-4 text-slate-500" />
              Assign Vendor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-medium gap-1.5 text-slate-700 h-9"
              onClick={handleExportCsv}
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export
            </Button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: HEALTH SUMMARY (MAX 4 CARDS)
            ========================================================================= */}
        <MaintenanceHealthSummary
          requests={allRequests}
          workOrders={workOrders}
          currency={currency}
          onSelectView={handleTabChange}
        />

        {/* =========================================================================
            SECTION 3: CRITICAL ATTENTION (HERO SECTION)
            ========================================================================= */}
        <MaintenanceCriticalAttention
          items={criticalItems}
          onActionClick={handleCriticalAction}
        />

        {/* =========================================================================
            SECTION 4: MAINTENANCE WORKSPACE (5 VIEWS)
            ========================================================================= */}
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b border-slate-200 bg-slate-50/70 px-4 pt-3 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <TabsList className="bg-slate-200/60 p-1 h-auto flex flex-wrap gap-1">
                <TabsTrigger value="requests" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <Wrench className="w-3.5 h-3.5" /> Requests ({allRequests.length})
                </TabsTrigger>
                <TabsTrigger value="work-orders" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <CheckSquare className="w-3.5 h-3.5" /> Work Orders ({workOrders.length})
                </TabsTrigger>
                <TabsTrigger value="inspections" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <ClipboardList className="w-3.5 h-3.5" /> Inspections ({inspections.length})
                </TabsTrigger>
                <TabsTrigger value="vendors" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <Building className="w-3.5 h-3.5" /> Vendors ({vendorProfiles.length})
                </TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <Calendar className="w-3.5 h-3.5" /> Calendar
                </TabsTrigger>
              </TabsList>

              <span className="text-xs text-slate-500 font-medium hidden md:inline">
                FishGate Physical Operations Command Center
              </span>
            </div>

            <div className="p-4">
              <TabsContent value="requests" className="m-0 p-0">
                <MaintenanceRequestsView
                  requests={allRequests}
                  currency={currency}
                  onSelectRequest={handleSelectRequest}
                  onConvertToWorkOrder={handleConvertToWorkOrder}
                  onAssignRequest={(req) => {
                    setAssignPreselectedRequestId(req.id);
                    setAssignPreselectedWorkOrderId(null);
                    setAssignVendorOpen(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="work-orders" className="m-0 p-0">
                <MaintenanceWorkOrdersView
                  workOrders={workOrders}
                  currency={currency}
                  onSelectWorkOrder={handleSelectWorkOrder}
                  onPrintWorkOrder={handlePrintWorkOrder}
                  onUpdateStatus={handleUpdateOrderStatus}
                  onAssignWorkOrder={(wo) => {
                    setAssignPreselectedWorkOrderId(wo.id);
                    setAssignPreselectedRequestId(null);
                    setAssignVendorOpen(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="inspections" className="m-0 p-0">
                <MaintenanceInspectionsView
                  inspections={inspections}
                  onSelectInspection={(insp) => {
                    setSelectedInspection(insp);
                    setInspectionDetailOpen(true);
                  }}
                  onScheduleInspection={() => setScheduleInspOpen(true)}
                  onGenerateWorkOrderFromIssue={handleGenerateWoFromInspection}
                />
              </TabsContent>

              <TabsContent value="vendors" className="m-0 p-0">
                <MaintenanceVendorsView
                  vendors={vendorProfiles}
                  currency={currency}
                  onSelectVendor={(v) => {
                    setSelectedVendor(v);
                    setVendorDetailOpen(true);
                  }}
                  onDispatchWorkOrder={(v) => {
                    setAssignPreselectedVendorId(v.id);
                    setAssignVendorOpen(true);
                  }}
                  onAddVendorClick={() => setAddVendorOpen(true)}
                />
              </TabsContent>

              <TabsContent value="calendar" className="m-0 p-0">
                <MaintenanceCalendarView
                  items={calendarItems}
                  onScheduleNew={() => setWizardOpen(true)}
                  onSelectItem={handleSelectCalendarItem}
                />
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        {/* =========================================================================
            SECTION 5: PROPERTY PHYSICAL HEALTH
            ========================================================================= */}
        <MaintenancePropertyHealth
          properties={properties}
          requests={allRequests}
          workOrders={workOrders}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 6: OPERATIONAL OBSERVATIONS
            ========================================================================= */}
        <MaintenanceObservations
          requests={allRequests}
          workOrders={workOrders}
          currency={currency}
        />
      </div>

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* 7-Step Request Wizard */}
      <MaintenanceRequestWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        properties={properties}
        tenants={tenants}
        vendors={rawVendors}
        onCreateRequest={handleCreateRequest}
        currency={currency}
      />

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          open={requestDetailOpen}
          onOpenChange={(open) => {
            setRequestDetailOpen(open);
            if (!open) setTimeout(() => setSelectedRequest(null), 200);
          }}
          request={selectedRequest}
          currency={currency}
          onConvertToWorkOrder={handleConvertToWorkOrder}
          onAssignRequest={(req) => {
            setAssignPreselectedRequestId(req.id);
            setAssignPreselectedWorkOrderId(null);
            setAssignVendorOpen(true);
          }}
        />
      )}

      {/* Work Order Detail Modal */}
      {selectedWorkOrder && (
        <WorkOrderDetailModal
          open={workOrderDetailOpen}
          onOpenChange={(open) => {
            setWorkOrderDetailOpen(open);
            if (!open) setTimeout(() => setSelectedWorkOrder(null), 200);
          }}
          workOrder={selectedWorkOrder}
          currency={currency}
          onPrintWorkOrder={handlePrintWorkOrder}
          onUpdateWorkOrder={handleUpdateWorkOrder}
        />
      )}

      {/* Inspection Detail Modal */}
      {selectedInspection && (
        <InspectionDetailModal
          open={inspectionDetailOpen}
          onOpenChange={(open) => {
            setInspectionDetailOpen(open);
            if (!open) setTimeout(() => setSelectedInspection(null), 200);
          }}
          inspection={selectedInspection}
          onGenerateWorkOrderFromIssue={handleGenerateWoFromInspection}
        />
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <VendorDetailModal
          open={vendorDetailOpen}
          onOpenChange={(open) => {
            setVendorDetailOpen(open);
            if (!open) setTimeout(() => setSelectedVendor(null), 200);
          }}
          vendor={selectedVendor}
          currency={currency}
          onDispatchWorkOrder={(v) => {
            setAssignPreselectedVendorId(v.id);
            setAssignPreselectedWorkOrderId(null);
            setAssignPreselectedRequestId(null);
            setAssignVendorOpen(true);
          }}
        />
      )}

      {/* Add Contractor / Vendor Modal */}
      <AddMaintenanceVendorModal
        open={addVendorOpen}
        onOpenChange={setAddVendorOpen}
        onAddVendor={handleAddVendor}
      />

      {/* Assign & Dispatch Vendor Modal */}
      <AssignVendorModal
        open={assignVendorOpen}
        onOpenChange={setAssignVendorOpen}
        vendors={vendorProfiles}
        workOrders={workOrders}
        requests={allRequests}
        preselectedVendorId={assignPreselectedVendorId}
        preselectedWorkOrderId={assignPreselectedWorkOrderId}
        preselectedRequestId={assignPreselectedRequestId}
        onAssignConfirm={handleAssignConfirm}
      />

      {/* Direct Work Order Creation Modal */}
      <CreateWorkOrderModal
        open={createWoOpen}
        onOpenChange={setCreateWoOpen}
        properties={properties}
        vendors={rawVendors}
        onCreateWorkOrder={handleCreateWorkOrder}
        currency={currency}
        initialData={initialWoData}
      />

      {/* Schedule Inspection Modal */}
      <ScheduleInspectionModal
        open={scheduleInspOpen}
        onOpenChange={setScheduleInspOpen}
        properties={properties}
        onScheduleInspection={handleScheduleInspection}
      />
    </PageContainer>
  );
}
