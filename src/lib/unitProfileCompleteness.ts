// src/lib/unitProfileCompleteness.ts
// Unit Profile Completeness and Domain Standards for FishGate Design Constitution v1.0

import { Unit } from '@/hooks/useUnits';

export interface CompletenessItem {
  field: string;
  label: string;
  step: number;
  critical: boolean;
}

export interface UnitCompletenessResult {
  score: number;
  grade: 'Complete' | 'Strong' | 'Needs Attention' | 'Incomplete';
  missingItems: CompletenessItem[];
  completedCount: number;
  totalFieldsCount: number;
}

export const UNIT_STATUSES = [
  { value: 'available', label: 'Available', description: 'Vacant and staged for immediate occupancy', category: 'ready' },
  { value: 'occupied', label: 'Occupied', description: 'Currently tenanted with an active lease', category: 'occupied' },
  { value: 'reserved', label: 'Reserved', description: 'Holding deposit received, lease pending signing', category: 'pending' },
  { value: 'listed', label: 'Listed', description: 'Actively marketed on public channels and portal', category: 'ready' },
  { value: 'notice_given', label: 'Notice Given', description: 'Tenant provided move-out notice; turnaround queued', category: 'occupied' },
  { value: 'pending_move_out', label: 'Pending Move-Out', description: 'Lease expired or ending this week; exit inspection pending', category: 'occupied' },
  { value: 'vacant', label: 'Vacant', description: 'Unoccupied, turnaround in progress or awaiting marketing', category: 'vacant' },
  { value: 'maintenance_hold', label: 'Maintenance Hold', description: 'Blocked from leasing due to required work orders', category: 'hold' },
  { value: 'draft', label: 'Draft', description: 'Unpublished staging record with incomplete profile', category: 'internal' },
  { value: 'inactive', label: 'Inactive', description: 'Temporarily removed from operational inventory', category: 'internal' },
  { value: 'retired', label: 'Retired', description: 'Permanently decommissioned, merged, or sold unit', category: 'internal' },
] as const;

export const UNIT_TYPES = [
  'Studio',
  '1 Bedroom Apartment',
  '2 Bedroom Apartment',
  '3 Bedroom Apartment',
  '4+ Bedroom Apartment',
  'Penthouse',
  'Duplex',
  'Townhouse / Villa',
  'Serviced Apartment',
  'Commercial Office',
  'Retail Storefront',
  'Warehouse / Storage',
  'Co-Working Space',
] as const;

export const UNIT_CATEGORIES = [
  'Residential',
  'Commercial',
  'Mixed-Use',
  'Short-Let / Hospitality',
  'Industrial & Logistics',
] as const;

export const FURNISHING_STATUSES = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'fully_furnished', label: 'Fully Furnished' },
] as const;

export const VIEW_TYPES = [
  'City Skyline',
  'Garden View',
  'Mountain View',
  'Pool View',
  'Courtyard',
  'Street View',
  'Lake / Water View',
] as const;

export const UTILITIES_OPTIONS = [
  'Water Supply',
  'Electricity (Prepaid)',
  'High-Speed Fiber Internet',
  'Trash & Recycling',
  'Cooking Gas',
  'Backup Generator Access',
  'Solar Water Heating',
  'Security Guard Service',
] as const;

export const COMMON_UNIT_AMENITIES = [
  'Balcony / Terrace',
  'Air Conditioning',
  'Fitted Kitchen',
  'Dishwasher',
  'In-Unit Washer/Dryer',
  'Walk-In Closet',
  'High Ceilings',
  'Smart Digital Lock',
  'Hardwood Flooring',
  'En-suite Master Bathroom',
  'Intercom System',
  'Dedicated Storage Room',
] as const;

export const ACCESSIBILITY_OPTIONS = [
  'Step-Free Entry',
  'Elevator Accessible',
  'Wide Interior Doorways (32"+)',
  'Roll-In Shower',
  'Bathroom Grab Rails',
  'Lowered Light Switches',
  'Accessible Parking Space',
] as const;

export const LEASE_CATEGORIES = [
  'Standard Residential Lease',
  'Commercial Lease Agreement',
  'Flexible Corporate Lease',
  'Short-Stay Agreement',
] as const;

export const REQUIRED_DOCUMENTS_OPTIONS = [
  'National ID / Passport Copy',
  'Proof of Income / 3 Months Bank Statement',
  'Employment Contract / Letter',
  'Previous Landlord Reference',
  'Guarantor Agreement',
  'Rwandan Taxpayer Identification (TIN)',
] as const;

/**
 * Calculates Unit Asset & Operational Completeness (0-100%)
 */
export function calculateUnitCompleteness(unit: Partial<Unit> | null | undefined): UnitCompletenessResult {
  if (!unit) {
    return {
      score: 0,
      grade: 'Incomplete',
      missingItems: [],
      completedCount: 0,
      totalFieldsCount: 20,
    };
  }

  const checklist: {
    field: string;
    label: string;
    step: number;
    critical: boolean;
    weight: number;
    check: () => boolean;
  }[] = [
    // Step 1: Basic Information (Weight: 25)
    {
      field: 'unit_number',
      label: 'Unit Number',
      step: 1,
      critical: true,
      weight: 6,
      check: () => Boolean(unit.unit_number && unit.unit_number.trim().length > 0),
    },
    {
      field: 'property_id',
      label: 'Parent Property',
      step: 1,
      critical: true,
      weight: 6,
      check: () => Boolean(unit.property_id),
    },
    {
      field: 'unit_code',
      label: 'Internal Unit Code',
      step: 1,
      critical: false,
      weight: 3,
      check: () => Boolean((unit as any).unit_code),
    },
    {
      field: 'unit_type',
      label: 'Unit Type',
      step: 1,
      critical: true,
      weight: 4,
      check: () => Boolean((unit as any).unit_type || unit.bedrooms !== undefined),
    },
    {
      field: 'image_urls',
      label: 'Unit Photos',
      step: 1,
      critical: false,
      weight: 6,
      check: () => Boolean((unit.image_urls && unit.image_urls.length > 0) || unit.image_url),
    },

    // Step 2: Specifications (Weight: 20)
    {
      field: 'bedrooms',
      label: 'Bedrooms Count',
      step: 2,
      critical: true,
      weight: 4,
      check: () => unit.bedrooms !== undefined && unit.bedrooms !== null,
    },
    {
      field: 'bathrooms',
      label: 'Bathrooms Count',
      step: 2,
      critical: true,
      weight: 4,
      check: () => unit.bathrooms !== undefined && unit.bathrooms !== null,
    },
    {
      field: 'floor_area_sqm',
      label: 'Floor Area (sqm)',
      step: 2,
      critical: false,
      weight: 4,
      check: () => Boolean((unit as any).floor_area_sqm || unit.sqft),
    },
    {
      field: 'furnishing_status',
      label: 'Furnishing Status',
      step: 2,
      critical: false,
      weight: 4,
      check: () => Boolean((unit as any).furnishing_status),
    },
    {
      field: 'amenities',
      label: 'Unit Amenities',
      step: 2,
      critical: false,
      weight: 4,
      check: () => Boolean(unit.amenities && unit.amenities.length > 0),
    },

    // Step 3: Rental Information (Weight: 20)
    {
      field: 'rent_amount',
      label: 'Current Monthly Rent',
      step: 3,
      critical: true,
      weight: 8,
      check: () => Boolean(Number(unit.rent_amount) > 0),
    },
    {
      field: 'security_deposit',
      label: 'Security Deposit',
      step: 3,
      critical: false,
      weight: 4,
      check: () => Boolean(Number((unit as any).security_deposit) > 0),
    },
    {
      field: 'billing_frequency',
      label: 'Billing Frequency',
      step: 3,
      critical: false,
      weight: 4,
      check: () => Boolean((unit as any).billing_frequency),
    },
    {
      field: 'market_rent',
      label: 'Market Rent Benchmark',
      step: 3,
      critical: false,
      weight: 4,
      check: () => Boolean(Number((unit as any).market_rent) > 0),
    },

    // Step 4: Occupancy Settings (Weight: 15)
    {
      field: 'status',
      label: 'Occupancy Status',
      step: 4,
      critical: true,
      weight: 7,
      check: () => Boolean(unit.status),
    },
    {
      field: 'max_occupants',
      label: 'Maximum Occupants',
      step: 4,
      critical: false,
      weight: 4,
      check: () => Boolean(Number((unit as any).max_occupants) > 0),
    },
    {
      field: 'available_from',
      label: 'Availability Date',
      step: 4,
      critical: false,
      weight: 4,
      check: () => Boolean((unit as any).available_from),
    },

    // Step 5: Lease Defaults (Weight: 10)
    {
      field: 'default_lease_term_months',
      label: 'Default Lease Term',
      step: 5,
      critical: false,
      weight: 5,
      check: () => Boolean((unit as any).default_lease_term_months),
    },
    {
      field: 'required_documents',
      label: 'Required Tenant Documents',
      step: 5,
      critical: false,
      weight: 5,
      check: () => Boolean((unit as any).required_documents && (unit as any).required_documents.length > 0),
    },

    // Step 6: Operations (Weight: 10)
    {
      field: 'maintenance_responsibility',
      label: 'Maintenance Responsibility',
      step: 6,
      critical: false,
      weight: 5,
      check: () => Boolean((unit as any).maintenance_responsibility),
    },
    {
      field: 'inspection_frequency',
      label: 'Inspection Schedule',
      step: 6,
      critical: false,
      weight: 5,
      check: () => Boolean((unit as any).inspection_frequency),
    },
  ];

  let totalScore = 0;
  let completedCount = 0;
  const missingItems: CompletenessItem[] = [];

  for (const item of checklist) {
    if (item.check()) {
      totalScore += item.weight;
      completedCount++;
    } else {
      missingItems.push({
        field: item.field,
        label: item.label,
        step: item.step,
        critical: item.critical,
      });
    }
  }

  // Normalize to 100 max
  const score = Math.min(100, Math.round(totalScore));

  let grade: 'Complete' | 'Strong' | 'Needs Attention' | 'Incomplete' = 'Incomplete';
  if (score >= 90) grade = 'Complete';
  else if (score >= 70) grade = 'Strong';
  else if (score >= 40) grade = 'Needs Attention';

  return {
    score,
    grade,
    missingItems,
    completedCount,
    totalFieldsCount: checklist.length,
  };
}
