import type { Property } from '@/hooks/useProperties';

export interface MissingFieldInfo {
  field: string;
  label: string;
  step: number;
  critical: boolean;
}

export interface CompletenessResult {
  score: number;
  totalChecks: number;
  passedChecks: number;
  missingItems: MissingFieldInfo[];
  criticalMissing: MissingFieldInfo[];
  recommendedMissing: MissingFieldInfo[];
}

export const RWANDA_PROVINCES: Record<string, string[]> = {
  'Kigali City': ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  'Northern Province': ['Musanze', 'Gicumbi', 'Burera', 'Rulindo', 'Gakenke'],
  'Southern Province': ['Huye', 'Muhanga', 'Ruhango', 'Nyanza', 'Gisagara', 'Nyaruguru', 'Nyamagabe', 'Kamonyi'],
  'Eastern Province': ['Rwamagana', 'Bugesera', 'Kayonza', 'Gatsibo', 'Nyagatare', 'Kirehe', 'Ngoma'],
  'Western Province': ['Rubavu', 'Rusizi', 'Karongi', 'Rutsiro', 'Nyamasheke', 'Nyabihu', 'Ngororero'],
};

export const COMMON_AMENITIES = [
  'High-Speed Fiber Internet',
  '24/7 Power Backup (Generator)',
  'Dedicated Water Reservoirs',
  'Passenger Elevators',
  'Cargo / Service Elevator',
  'Swimming Pool',
  'Fitness Center & Gym',
  'Rooftop Terrace / Lounge',
  'EV Vehicle Charging',
  'Children’s Playground',
  'Concierge Reception',
  'Waste Disposal Chute',
  'Solar Water Heating',
  'Underground Storage Units',
];

export const ACCESSIBILITY_FEATURES = [
  'Wheelchair Access Ramps',
  'Step-Free Building Entrance',
  'Accessible Elevator Controls',
  'ADA Compliant Restrooms',
  'Wide Corridor Doorways (36"+)',
  'Tactile Ground Indicators',
  'Braille Signage',
  'Designated Accessible Parking',
];

export const SECURITY_FEATURES = [
  '24/7 Professional Security Personnel',
  'High-Definition CCTV Network',
  'Biometric / RFID Card Access',
  'Electric Perimeter Fencing',
  'Automated Boom Barrier Gate',
  'Fire Detection & Smoke Alarms',
  'Central Fire Sprinkler System',
  'Intercom Resident Entry System',
];

export const UTILITIES_LIST = [
  'National Grid Power (REG)',
  'Municipal Water Supply (WASAC)',
  'Standby Diesel Generator',
  'Rooftop Solar Array',
  'Borehole & Filtration System',
  'Centralized LPG Gas Supply',
  'Fiber Optic Internet Backbone',
  'Private Septic & Drainage Network',
];

export function calculatePropertyCompleteness(property: Partial<Property>): CompletenessResult {
  const missingItems: MissingFieldInfo[] = [];

  const check = (
    condition: boolean,
    field: string,
    label: string,
    step: number,
    critical: boolean = false
  ) => {
    if (!condition) {
      missingItems.push({ field, label, step, critical });
    }
  };

  // Step 1: Basic Information (Weight: 20%)
  check(Boolean(property.name?.trim()), 'name', 'Property Name', 1, true);
  check(Boolean(property.type), 'type', 'Property Type', 1, true);
  check(Boolean(property.property_code?.trim()), 'property_code', 'Property Code', 1, false);
  check(Boolean(property.category), 'category', 'Property Category', 1, false);
  check(Boolean(property.description?.trim()), 'description', 'Property Description', 1, false);
  check(Boolean(property.image_url || (property.image_urls && property.image_urls.length > 0)), 'image_url', 'Property Cover Photo', 1, true);

  // Step 2: Location & Address (Weight: 20%)
  check(Boolean(property.address?.trim()), 'address', 'Street Address', 2, true);
  check(Boolean(property.city?.trim() || property.district?.trim()), 'city', 'City / District', 2, true);
  check(Boolean(property.state?.trim() || property.province?.trim()), 'state', 'Province / State', 2, false);
  check(Boolean(property.country?.trim()), 'country', 'Country', 2, true);
  check(Boolean(property.latitude && property.longitude), 'gps', 'GPS Coordinates', 2, false);
  check(Boolean(property.google_maps_url?.trim()), 'google_maps_url', 'Google Maps Location Link', 2, false);
  check(Boolean(property.upi?.trim()), 'upi', 'National Land Authority UPI', 2, false);

  // Step 3: Characteristics (Weight: 15%)
  check(Boolean((property.total_units || 0) > 0), 'total_units', 'Total Units Count', 3, true);
  check(Boolean(property.building_type), 'building_type', 'Building Architecture Type', 3, false);
  check(Boolean((property.number_of_floors || 0) > 0), 'number_of_floors', 'Number of Floors', 3, false);
  check(Boolean((property.parking_spaces || 0) > 0), 'parking_spaces', 'Parking Spaces', 3, false);
  check(Boolean(property.land_area && Number(property.land_area) > 0), 'land_area', 'Land Area (sqm)', 3, false);
  check(Boolean(property.amenities && property.amenities.length > 0), 'amenities', 'Property Amenities', 3, false);
  check(Boolean(property.security_features && property.security_features.length > 0), 'security_features', 'Security Features', 3, false);

  // Step 4: Ownership & Management (Weight: 15%)
  check(Boolean(property.owner_name?.trim() || property.owner_account_id), 'owner_name', 'Property Owner Information', 4, true);
  check(Boolean(property.ownership_type), 'ownership_type', 'Ownership Entity Type', 4, false);
  check(Boolean(property.property_manager?.trim()), 'property_manager', 'Designated Property Manager', 4, false);
  check(Boolean(property.emergency_contacts && property.emergency_contacts.length > 0), 'emergency_contacts', '24/7 Emergency Contact', 4, true);

  // Step 5: Financial Profile (Weight: 15%)
  check(Boolean(property.currency), 'currency', 'Operating Currency', 5, true);
  check(Boolean((property.revenue_target || 0) > 0), 'revenue_target', 'Monthly Revenue Target', 5, false);
  check(Boolean(property.insurance_policy_number?.trim() || property.insurance_provider?.trim()), 'insurance', 'Insurance Policy Details', 5, false);
  check(Boolean(property.landlord_tin?.trim()), 'landlord_tin', 'Tax Identification Number (TIN)', 5, false);

  // Step 6: Operational Settings (Weight: 15%)
  check(Boolean(property.maintenance_strategy), 'maintenance_strategy', 'Maintenance Strategy', 6, false);
  check(Boolean(property.inspection_frequency), 'inspection_frequency', 'Routine Inspection Frequency', 6, false);
  check(Boolean((property.target_occupancy_rate || 0) > 0), 'target_occupancy_rate', 'Target Occupancy Rate', 6, false);
  check(Boolean(property.risk_classification), 'risk_classification', 'Risk Classification', 6, false);

  const totalChecks = 26;
  const passedChecks = totalChecks - missingItems.length;
  const score = Math.max(0, Math.min(100, Math.round((passedChecks / totalChecks) * 100)));

  return {
    score,
    totalChecks,
    passedChecks,
    missingItems,
    criticalMissing: missingItems.filter((i) => i.critical),
    recommendedMissing: missingItems.filter((i) => !i.critical),
  };
}

export function generatePropertyCode(name: string, city: string = 'KGL'): string {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'EST';
  const cleanCity = city.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'KGL';
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${cleanCity}-${cleanName}-${randomNum}`;
}

export async function getCurrentBrowserLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
      },
      (error) => {
        let msg = 'Could not determine location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or enter coordinates manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number
): Promise<{
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  displayName?: string;
}> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data.address || {};

    return {
      address: [addr.road, addr.house_number || addr.neighbourhood].filter(Boolean).join(', ') || addr.suburb || '',
      district: addr.city_district || addr.county || addr.suburb || addr.city || '',
      city: addr.city || addr.town || addr.village || addr.city_district || '',
      state: addr.state || addr.province || addr.region || '',
      country: addr.country || 'Rwanda',
      postalCode: addr.postcode || '',
      displayName: data.display_name || '',
    };
  } catch {
    return {};
  }
}
