import { format, subMonths } from 'date-fns';

type NamedRelation = { name?: string | null } | null;
type UnitRelation = { unit_number?: string | null } | null;

export type RentRollInput = {
  lease_number: string;
  status: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  tenants?: NamedRelation;
  properties?: NamedRelation;
  units?: UnitRelation;
};

export type AgingInvoiceInput = {
  invoice_number: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  tenants?: NamedRelation;
};

export type OccupancyLeaseInput = Pick<RentRollInput, 'start_date' | 'end_date' | 'status'>;

export type MaintenanceCostInput = {
  title: string;
  status: string;
  priority: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  properties?: NamedRelation;
};

export function computeRentRollRows(leases: RentRollInput[]) {
  return leases
    .filter((lease) => !['cancelled', 'terminated'].includes(lease.status))
    .map((lease) => ({
      property: lease.properties?.name || 'Unassigned',
      unit: lease.units?.unit_number || 'Unassigned',
      tenant: lease.tenants?.name || 'Unassigned',
      leaseNumber: lease.lease_number,
      startDate: lease.start_date,
      endDate: lease.end_date,
      monthlyRent: Number(lease.monthly_rent) || 0,
      status: lease.status,
    }))
    .sort((left, right) => left.property.localeCompare(right.property) || left.unit.localeCompare(right.unit));
}

export function computeAgingRows(invoices: AgingInvoiceInput[], nowMs = Date.now()) {
  const dayMs = 86_400_000;
  return invoices
    .map((invoice) => {
      const balance = Math.max(0, Number(invoice.amount) - Number(invoice.paid_amount));
      const daysOverdue = Math.max(0, Math.floor((nowMs - new Date(invoice.due_date).getTime()) / dayMs));
      const bucket = daysOverdue === 0 ? 'Current' : daysOverdue <= 30 ? '1-30' : daysOverdue <= 60 ? '31-60' : daysOverdue <= 90 ? '61-90' : '90+';
      return {
        invoiceNumber: invoice.invoice_number,
        tenant: invoice.tenants?.name || 'Unassigned',
        dueDate: invoice.due_date,
        daysOverdue,
        bucket,
        balance,
        status: invoice.status,
      };
    })
    .filter((row) => row.balance > 0)
    .sort((left, right) => right.daysOverdue - left.daysOverdue);
}

export function computeOccupancyTrend(leases: OccupancyLeaseInput[], totalUnits: number, months: number, now = new Date()) {
  return Array.from({ length: months }, (_, index) => {
    const month = subMonths(now, months - index - 1);
    const snapshot = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    const occupied = leases.filter((lease) => {
      if (['cancelled', 'terminated', 'draft'].includes(lease.status)) return false;
      return new Date(lease.start_date) <= snapshot && new Date(lease.end_date) >= snapshot;
    }).length;
    return {
      month: format(snapshot, 'MMM yyyy'),
      occupied,
      vacant: Math.max(0, totalUnits - occupied),
      occupancyRate: totalUnits > 0 ? Math.round((occupied / totalUnits) * 1000) / 10 : 0,
    };
  });
}

export function computeMaintenanceCostRows(requests: MaintenanceCostInput[]) {
  return requests.map((request) => {
    const estimatedCost = Number(request.estimated_cost) || 0;
    const actualCost = Number(request.actual_cost) || 0;
    return {
      property: request.properties?.name || 'Unassigned',
      request: request.title,
      priority: request.priority,
      status: request.status,
      estimatedCost,
      actualCost,
      variance: actualCost - estimatedCost,
    };
  }).sort((left, right) => right.actualCost - left.actualCost);
}

export function rowsToCsv(headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}