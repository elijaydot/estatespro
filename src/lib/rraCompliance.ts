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
};

export type RentalTaxSummary = {
  taxYear: number;
  grossRentalIncome: number;
  statutoryDeductionRate: number; // 0.50 (50%)
  statutoryDeductionAmount: number;
  netTaxableIncome: number;
  estimatedTaxAmount: number;
  effectiveTaxRatePercent: number;
  currency: string;
  propertyCount: number;
  unitCount: number;
  filingDeadline: string; // e.g. "January 31, 2027"
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
      deadlineDate: new Date(filedAt || leaseStartDate),
      daysRemaining: 0,
      isOverdue: false,
      isUrgent: false,
      status: 'filed',
      badgeLabel: 'RRA Filed ✓',
      badgeVariant: 'default',
    };
  }

  const start = new Date(leaseStartDate);
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
  };
}

/**
 * Computes Annual Rental Income Tax Report according to Rwanda Tax Code:
 * Gross Rental Income minus standard 50% statutory maintenance & wear allowance.
 * Annual filing deadline is January 31st of the following tax year.
 */
export function computeRraRentalTaxReport(
  grossIncome: number,
  currency = 'RWF',
  taxYear = new Date().getFullYear() - 1,
  propertiesCount = 1,
  unitsCount = 1
): RentalTaxSummary {
  const standardDeductionRate = 0.50; // 50% statutory deduction
  const statutoryDeductionAmount = grossIncome * standardDeductionRate;
  const netTaxableIncome = Math.max(0, grossIncome - statutoryDeductionAmount);

  // Rwandan Individual Rental Tax Brackets (progressive):
  // 0 - 180,000 RWF -> 0%
  // 180,001 - 1,000,000 RWF -> 20%
  // Above 1,000,000 RWF -> 30%
  let estimatedTax = 0;
  if (currency === 'RWF') {
    if (netTaxableIncome > 1_000_000) {
      estimatedTax = (1_000_000 - 180_000) * 0.20 + (netTaxableIncome - 1_000_000) * 0.30;
    } else if (netTaxableIncome > 180_000) {
      estimatedTax = (netTaxableIncome - 180_000) * 0.20;
    }
  } else {
    // For USD/other currencies: estimated standard 20% effective tax on taxable net
    estimatedTax = netTaxableIncome * 0.20;
  }

  const effectiveRate = grossIncome > 0 ? (estimatedTax / grossIncome) * 100 : 0;

  return {
    taxYear,
    grossRentalIncome: grossIncome,
    statutoryDeductionRate: standardDeductionRate,
    statutoryDeductionAmount,
    netTaxableIncome,
    estimatedTaxAmount: Math.round(estimatedTax),
    effectiveTaxRatePercent: Number(effectiveRate.toFixed(2)),
    currency,
    propertyCount: propertiesCount,
    unitCount: unitsCount,
    filingDeadline: `January 31, ${taxYear + 1}`,
  };
}

/**
 * Generates an RRA E-Tax portal ready CSV export string.
 */
export function generateRraTaxExportCsv(summary: RentalTaxSummary, breakdownByProperty: Array<{ propertyName: string; units: number; collected: number }>): string {
  const lines: string[] = [
    `RWANDA REVENUE AUTHORITY (RRA) - ANNUAL RENTAL INCOME TAX DECLARATION`,
    `Tax Year,${summary.taxYear}`,
    `Filing Deadline,${summary.filingDeadline}`,
    `Gross Rental Income (${summary.currency}),${summary.grossRentalIncome.toLocaleString()}`,
    `Statutory Allowance (50%),${summary.statutoryDeductionAmount.toLocaleString()}`,
    `Taxable Net Rental Income,${summary.netTaxableIncome.toLocaleString()}`,
    `Estimated Tax Payable,${summary.estimatedTaxAmount.toLocaleString()}`,
    `Effective Tax Rate,${summary.effectiveTaxRatePercent}%`,
    ``,
    `PROPERTY BREAKDOWN:`,
    `Property Name,Units,Gross Collected (${summary.currency}),50% Deduction,Taxable Net`,
  ];

  for (const item of breakdownByProperty) {
    const ded = item.collected * 0.5;
    const net = item.collected * 0.5;
    lines.push(`"${item.propertyName}",${item.units},${item.collected},${ded},${net}`);
  }

  return lines.join('\n');
}
