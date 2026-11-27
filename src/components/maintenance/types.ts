// src/components/maintenance/types.ts
// FishGate Design Constitution v1.0 - Physical Property Operations Command Center Architecture

export type MaintenancePriority = 'emergency' | 'high' | 'medium' | 'low';

export type RequestStatus =
  | 'reported'
  | 'triaged'
  | 'awaiting_assignment'
  | 'assigned'
  | 'converted_to_work_order'
  | 'cancelled'
  | 'closed';

export type WorkOrderStatus =
  | 'assigned'
  | 'scheduled'
  | 'in_progress'
  | 'parts_required'
  | 'awaiting_approval'
  | 'awaiting_inspection'
  | 'completed'
  | 'closed';

export type InspectionType =
  | 'move_in'
  | 'move_out'
  | 'routine'
  | 'safety'
  | 'preventive'
  | 'compliance'
  | 'emergency'
  | 'custom';

export type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export type InspectionOutcome =
  | 'passed'
  | 'passed_with_recommendations'
  | 'follow_up_required'
  | 'failed';

export interface MaintenanceMedia {
  id: string;
  name: string;
  type: 'photo' | 'video' | 'document' | 'voice_recording';
  url: string;
  size?: string;
  uploadedAt: string;
}

export interface MaintenanceRequestRecord {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  propertyId: string;
  propertyName: string;
  building?: string;
  floor?: string;
  unitId?: string | null;
  unitNumber?: string | null;
  areaAffected?: string;
  priority: MaintenancePriority;
  issueSource: 'resident' | 'staff' | 'inspection' | 'vendor' | 'sensor';
  status: RequestStatus;
  
  reportedBy: {
    name: string;
    email?: string;
    phone?: string;
    role: 'resident' | 'staff' | 'vendor' | 'anonymous';
    preferredContact: 'phone' | 'email' | 'in_app';
  };

  impact: {
    occupancyImpact: boolean;
    revenueImpact: boolean;
    safetyRisk: boolean;
    residentImpact: 'single' | 'multiple' | 'building';
    urgency: 'immediate' | 'within_24h' | 'scheduled';
    severity: 'critical' | 'major' | 'minor';
  };

  media: MaintenanceMedia[];

  assignment?: {
    assignedTo?: string;
    assignedTeam?: string;
    vendorId?: string;
    vendorName?: string;
    dueDate?: string;
    slaHours?: number;
    escalationPath?: string;
  };

  financials?: {
    estimatedCost: number;
    actualCost?: number;
    budgetCategory?: string;
    costCenter?: string;
    approvalRequired?: boolean;
    approvedBy?: string;
  };

  workOrderId?: string | null;
  workOrderNumber?: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface WorkOrderRecord {
  id: string;
  workOrderNumber: string;
  requestId?: string | null;
  requestReference?: string | null;
  title: string;
  issueDescription: string;
  propertyId: string;
  propertyName: string;
  unitId?: string | null;
  unitNumber?: string | null;
  assignedVendorId?: string | null;
  assignedVendorName?: string | null;
  assignedTechnician?: string | null;
  tradeCategory: string;
  status: WorkOrderStatus;
  priority: MaintenancePriority;
  scheduledDate: string;
  dueDate: string;
  completedAt?: string | null;
  estimatedCost: number;
  actualCost?: number;
  progress: number; // 0 - 100
  partsRequired?: string[];
  materialsCost?: number;
  laborCost?: number;
  residentNotes?: string;
  technicianNotes?: string;
  documents: MaintenanceMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface InspectionIssue {
  id: string;
  area: string;
  item: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  requiresWorkOrder: boolean;
  generatedWorkOrderId?: string | null;
  photos: string[];
}

export interface InspectionRecord {
  id: string;
  reference: string;
  propertyId: string;
  propertyName: string;
  unitId?: string | null;
  unitNumber?: string | null;
  type: InspectionType;
  inspector: string;
  inspectionDate: string;
  conditionScore: number;
  conditionRating: ConditionRating;
  outcome: InspectionOutcome;
  issuesFound: InspectionIssue[];
  recommendations?: string;
  notes?: string;
  attachments: MaintenanceMedia[];
  convertedToWorkOrderId?: string | null;
  createdAt: string;
}

export interface VendorOperationalProfile {
  id: string;
  name: string;
  tradeCategory: string;
  contactPerson: string;
  email: string;
  phone: string;
  activeWorkOrders: number;
  responseTimeHours: number;
  completionRate: number;
  costYtd: number;
  rating: number;
  emergencyService: boolean;
  status: 'active' | 'probation' | 'inactive';
  insuranceValid: boolean;
  licenseValid: boolean;
  slaStandardHours: number;
}

export interface MaintenanceCalendarItem {
  id: string;
  title: string;
  type: 'appointment' | 'recurring' | 'inspection' | 'vendor_visit' | 'compliance' | 'repair';
  date: string;
  time?: string;
  propertyName: string;
  unitNumber?: string | null;
  assignedTo: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

export interface CriticalAttentionItem {
  id: string;
  issue: string;
  property: string;
  unit: string;
  priority: 'emergency' | 'safety' | 'inspection_failure' | 'vendor_delay' | 'occupancy_risk' | 'revenue_risk';
  owner: string;
  impact: string;
  primaryAction: string;
  targetType: 'request' | 'work_order' | 'inspection';
  targetId: string;
}
