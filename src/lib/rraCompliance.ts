/**
 * Rwanda Revenue Authority (RRA) & East Africa Compliance Spine
 * Handles the 15-day rental contract filing requirement,
 * EBM (Electronic Billing Machine) reconciliation, and Annual Rental Tax Export.
 */

export type RraFilingStatus = {
  deadlineDate: Date;
  daysRemaining: number;
  isOverdue: boolean;
  isUrgent: boolean; // <= 5 days
  status: 'filed' | 'pending' | 'overdue' | 'exempt';
  badgeLabel: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning';
  description: string;
};

export type RentalTaxRecordInput = {
  propertyId: string;
  propertyName: string;
  unitId?: string;
  unitNumber?: string;
  tenantName?: string;
  tenantTin?: string;
  grossRentCollected: number;
  currency?: string;
};

export type RentalTaxRecord = RentalTaxRecordInput & {
  statutoryDeduction: number;
  netTaxableRent: number;
  estimatedTax: number;
};

export type RentalTaxSummary = {
  taxYear: number;
  currency: string;
  statutoryDeductionRate: number;
  records: RentalTaxRecord[];
  totalGrossRent: number;
  grossRentalIncome: number;
  totalStatutoryDeductions: number;
  statutoryDeductionAmount: number;
  totalTaxableRent: number;
  netTaxableIncome: number;
  estimatedTaxPayable: number;
  estimatedTaxAmount: number;
  effectiveTaxRatePercent: number;
  propertyCount: number;
  unitCount: number;
  filingDeadline: string;
};

/**
 * Calculates the statutory 15-day RRA lease contract registration countdown.
 * Under Rwandan tax regulations, all residential and commercial leases must be
 * registered with RRA within 15 days of signing or lease commencement.
 */
export function calculateRraLeaseFilingDeadline(
  leaseStartDate: string | Date,
  isAlreadyFiled = false,
  filedAt?: string | Date | null
): RraFilingStatus {
  if (isAlreadyFiled) {
    return {
      deadlineDate: filedAt ? new Date(filedAt) : new Date(),
      daysRemaining: 0,
      isOverdue: false,
      isUrgent: false,
      status: 'filed',
      badgeLabel: 'RRA Filed ✓',
      badgeVariant: 'secondary',
      description: 'Lease contract is officially registered and compliant with RRA.',
    };
  }

  const start = new Date(leaseStartDate);
  if (isNaN(start.getTime())) {
    return {
      deadlineDate: new Date(),
      daysRemaining: 15,
      isOverdue: false,
      isUrgent: false,
      status: 'exempt',
      badgeLabel: 'RRA Exempt',
      badgeVariant: 'outline',
      description: 'No start date specified for RRA contract filing.',
    };
  }

  // Statutory 15 calendar days from lease start
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() + 15);

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      deadlineDate: deadline,
      daysRemaining,
      isOverdue: true,
      isUrgent: true,
      status: 'overdue',
      badgeLabel: `RRA Filing Overdue (${overdueDays}d)`,
      badgeVariant: 'destructive',
      description: `RRA registration is ${overdueDays} day(s) past the statutory 15-day deadline.`,
    };
  }

  if (daysRemaining <= 5) {
    return {
      deadlineDate: deadline,
      daysRemaining,
      isOverdue: false,
      isUrgent: true,
      status: 'pending',
      badgeLabel: `RRA Filing Due in ${daysRemaining}d ⚠️`,
      badgeVariant: 'warning',
      description: `Only ${daysRemaining} day(s) left to register this lease with RRA.`,
    };
  }

  return {
    deadlineDate: deadline,
    daysRemaining,
    isOverdue: false,
    isUrgent: false,
    status: 'pending',
    badgeLabel: `RRA Filing: ${daysRemaining}d left`,
    badgeVariant: 'outline',
    description: `Lease must be registered with RRA within ${daysRemaining} day(s).`,
  };
}

/**
 * Computes the Annual Rental Income Tax declaration according to the Rwanda Tax Code:
 * gross rental income minus the standard 50% statutory maintenance & wear allowance,
 * with progressive rental income brackets. Filing deadline is January 31 of the next year.
 */
const STATUTORY_DEDUCTION_RATE = 0.5;

function estimateRwandaRentalTax(netTaxableIncome: number, currency: string): number {
  if (currency !== 'RWF') return Math.round(netTaxableIncome * 0.2);
  if (netTaxableIncome > 1_000_000) {
    return Math.round((1_000_000 - 180_000) * 0.2 + (netTaxableIncome - 1_000_000) * 0.3);
  }
  if (netTaxableIncome > 180_000) {
    return Math.round((netTaxableIncome - 180_000) * 0.2);
  }
  return 0;
}

export function computeRraRentalTaxReport(
  inputsOrGross: RentalTaxRecordInput[] | number,
  currencyOrTaxYear: string | number = 'RWF',
  taxYearArg: number = new Date().getFullYear(),
  propertyCountArg?: number,
  unitCountArg?: number
): RentalTaxSummary {
  let records: RentalTaxRecord[] = [];
  let taxYear = typeof currencyOrTaxYear === 'number' ? currencyOrTaxYear : (typeof taxYearArg === 'number' ? taxYearArg : new Date().getFullYear());
  let currency = typeof currencyOrTaxYear === 'string' ? currencyOrTaxYear : 'RWF';
  let propCount = propertyCountArg || 0;
  let unitCount = unitCountArg || 0;

  if (typeof inputsOrGross === 'number') {
    const gross = inputsOrGross;
    const statutoryDeduction = Math.round(gross * STATUTORY_DEDUCTION_RATE);
    const netTaxableRent = Math.max(0, gross - statutoryDeduction);
    const estimatedTax = estimateRwandaRentalTax(netTaxableRent, currency);
    records = [{
      propertyId: 'portfolio',
      propertyName: 'Portfolio Aggregate',
      grossRentCollected: gross,
      statutoryDeduction,
      netTaxableRent,
      estimatedTax,
      currency,
    }];
  } else if (Array.isArray(inputsOrGross)) {
    records = inputsOrGross.map((rec) => {
      const gross = rec.grossRentCollected || 0;
      const statutoryDeduction = Math.round(gross * STATUTORY_DEDUCTION_RATE);
      const netTaxableRent = Math.max(0, gross - statutoryDeduction);
      return {
        ...rec,
        statutoryDeduction,
        netTaxableRent,
        estimatedTax: estimateRwandaRentalTax(netTaxableRent, rec.currency || currency),
      };
    });
    propCount = new Set(records.map((r) => r.propertyId)).size;
    unitCount = new Set(records.map((r) => r.unitId).filter(Boolean)).size;
  }

  const totalGrossRent = records.reduce((sum, r) => sum + (r.grossRentCollected || 0), 0);
  const totalStatutoryDeductions = records.reduce((sum, r) => sum + r.statutoryDeduction, 0);
  const totalTaxableRent = records.reduce((sum, r) => sum + r.netTaxableRent, 0);
  const estimatedTaxPayable = records.reduce((sum, r) => sum + r.estimatedTax, 0);
  const effectiveTaxRatePercent = totalGrossRent > 0
    ? Number(((estimatedTaxPayable / totalGrossRent) * 100).toFixed(2))
    : 0;

  return {
    taxYear,
    currency,
    statutoryDeductionRate: STATUTORY_DEDUCTION_RATE,
    records,
    totalGrossRent,
    grossRentalIncome: totalGrossRent,
    totalStatutoryDeductions,
    statutoryDeductionAmount: totalStatutoryDeductions,
    totalTaxableRent,
    netTaxableIncome: totalTaxableRent,
    estimatedTaxPayable,
    estimatedTaxAmount: estimatedTaxPayable,
    effectiveTaxRatePercent,
    propertyCount: propCount,
    unitCount: unitCount,
    filingDeadline: `January 31, ${taxYear + 1}`,
  };
}

/**
 * Generates an RRA E-Tax portal ready CSV export string.
 */
export function generateRraTaxExportCsv(
  summary: RentalTaxSummary,
  breakdown?: Array<{ propertyName: string; units?: number; collected?: number }>
): string {
  const lines: string[] = [
    `RWANDA REVENUE AUTHORITY (RRA) - ANNUAL RENTAL INCOME TAX DECLARATION`,
    `Tax Year,${summary.taxYear}`,
    `Filing Deadline,${summary.filingDeadline}`,
    `Gross Rental Income (${summary.currency}),${summary.totalGrossRent}`,
    `Statutory Allowance (50%),${summary.totalStatutoryDeductions}`,
    `Taxable Net Rental Income,${summary.totalTaxableRent}`,
    `Estimated Tax Payable,${summary.estimatedTaxPayable}`,
    `Effective Tax Rate,${summary.effectiveTaxRatePercent}%`,
    ``,
    `PROPERTY & LEASE SCHEDULE:`,
    `Property,Unit,Tenant,TIN,Gross Collected (${summary.currency}),50% Deduction,Taxable Net,Estimated Tax`,
  ];

  if (breakdown && breakdown.length > 0) {
    for (const item of breakdown) {
      const gross = item.collected || 0;
      const deduction = Math.round(gross * STATUTORY_DEDUCTION_RATE);
      const net = gross - deduction;
      const tax = estimateRwandaRentalTax(net, summary.currency);
      lines.push(
        `"${item.propertyName}","${item.units || ''} Units","All Tenants","-",${gross},${deduction},${net},${tax}`
      );
    }
  } else {
    for (const rec of summary.records) {
      lines.push(
        `"${rec.propertyName}","${rec.unitNumber || ''}","${rec.tenantName || ''}","${rec.tenantTin || ''}",${rec.grossRentCollected},${rec.statutoryDeduction},${rec.netTaxableRent},${rec.estimatedTax}`
      );
    }
  }

  return lines.join('\n');
}
