// User Roles
export type UserRole = 'super_admin' | 'property_manager' | 'landlord' | 'tenant';

// Property Types
export type PropertyType = 'apartment' | 'house' | 'commercial' | 'mixed';

// Unit Status
export type UnitStatus = 'vacant' | 'occupied' | 'maintenance';

// Payment Status
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'partial';

// Lease Status
export type LeaseStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';

// Maintenance Priority
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';

// Maintenance Status
export type MaintenanceStatus = 'submitted' | 'in_progress' | 'completed' | 'cancelled';

// User
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  workspaceId?: string;
  createdAt: Date;
}

// Workspace (Tenant/Company)
export interface Workspace {
  id: string;
  name: string;
  logo?: string;
  subdomain: string;
  currency: string;
  timezone: string;
  createdAt: Date;
}

// Property/Estate
export interface Property {
  id: string;
  workspaceId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type: PropertyType;
  description?: string;
  images: string[];
  totalUnits: number;
  occupiedUnits: number;
  createdAt: Date;
}

// Unit/Apartment
export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  rentAmount: number;
  status: UnitStatus;
  amenities: string[];
  description?: string;
  images: string[];
  currentTenantId?: string;
}

// Tenant (Resident)
export interface Tenant {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  email: string;
  phone: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  idDocument?: string;
  employer?: string;
  occupation?: string;
  currentUnitId?: string;
  moveInDate?: Date;
  createdAt: Date;
}

// Lease
export interface Lease {
  id: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  status: LeaseStatus;
  documents: string[];
  signedAt?: Date;
  createdAt: Date;
}

// Invoice
export interface Invoice {
  id: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  dueDate: Date;
  status: PaymentStatus;
  description: string;
  paidAt?: Date;
  paidAmount?: number;
  createdAt: Date;
}

// Payment
export interface Payment {
  id: string;
  invoiceId: string;
  tenantId: string;
  amount: number;
  method: string;
  reference?: string;
  createdAt: Date;
}

// Maintenance Request
export interface MaintenanceRequest {
  id: string;
  unitId: string;
  tenantId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  images: string[];
  assignedTo?: string;
  completedAt?: Date;
  createdAt: Date;
}

// Dashboard Stats
export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalTenants: number;
  monthlyRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  maintenanceRequests: number;
  upcomingRenewals: number;
}
