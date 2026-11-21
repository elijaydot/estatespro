/**
 * Bilingual Legal Residential & Commercial Lease Contract Generator
 * Generates side-by-side or compiled legal agreements in Ikinyarwanda and English
 * compliant with Rwandan Tenancy Law (Law No. 59/2008) and Rwanda Revenue Authority (RRA) regulations.
 */

export interface BilingualLeaseInput {
  leaseNumber: string;
  landlordName: string;
  landlordTin?: string;
  landlordPhone?: string;
  tenantName: string;
  tenantNationalId: string; // Indangamuntu or Passport
  tenantPhone: string;
  tenantEmail?: string;
  propertyName: string;
  propertyUpi: string; // e.g. 1/03/05/02/1234
  district: string; // e.g. Gasabo
  sector: string; // e.g. Remera
  unitNumber: string;
  monthlyRentRwf: number;
  securityDepositRwf: number;
  startDate: string;
  endDate: string;
  filingDeadlineDays?: number; // 15 days statutory
}

export interface BilingualClause {
  clauseNumber: number;
  titleRw: string;
  titleEn: string;
  textRw: string;
  textEn: string;
}

export interface CompiledBilingualContract {
  leaseNumber: string;
  propertyUpi: string;
  clauses: BilingualClause[];
  rraFilingDeclaration: string;
  generatedDate: string;
}

/**
 * Calculates statutory RRA 15-day filing deadline for new leases
 */
export function calculateRraLeaseFilingDeadline(startDateStr?: string | null): {
  deadlineDate: string | null;
  daysRemaining: number | null;
  isOverdue: boolean;
  isUrgent: boolean;
  badgeLabel: string;
  description: string;
} {
  if (!startDateStr) {
    return {
      deadlineDate: null,
      daysRemaining: null,
      isOverdue: false,
      isUrgent: false,
      badgeLabel: 'RRA: Pending Start',
      description: 'Lease start date not set',
    };
  }

  const start = new Date(startDateStr);
  const deadline = new Date(start.getTime() + 15 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining >= 0 && daysRemaining <= 3;

  let badgeLabel = `RRA: ${daysRemaining}d to file`;
  if (isOverdue) {
    badgeLabel = `RRA Filing Overdue (${Math.abs(daysRemaining)}d)`;
  } else if (isUrgent) {
    badgeLabel = `RRA Urgent: ${daysRemaining}d left`;
  }

  return {
    deadlineDate: deadline.toISOString().split('T')[0],
    daysRemaining,
    isOverdue,
    isUrgent,
    badgeLabel,
    description: `Under Rwandan Law, lease must be registered with RRA within 15 days of commencement.`,
  };
}

export function compileBilingualLease(input: BilingualLeaseInput): CompiledBilingualContract {
  const clauses: BilingualClause[] = [
    {
      clauseNumber: 1,
      titleRw: "1. INZU IKODESHWAMO N'IKIBANZA CYAYO (PROPERTY & UPI)",
      titleEn: "1. THE LEASED PREMISES & LAND UPI",
      textRw: `Nyir'inzu yemeye gukodesha, kandi Umukodesha yemeye gukodesha inzu No ${input.unitNumber} iherereye mu nyubako ya ${input.propertyName}, Akarere ka ${input.district}, Umurenge wa ${input.sector}, ku kibanza gifite UPI No ${input.propertyUpi}.`,
      textEn: `The Landlord agrees to let and the Tenant agrees to take Unit No ${input.unitNumber} situated in ${input.propertyName}, District of ${input.district}, Sector of ${input.sector}, on parcel registered under UPI No ${input.propertyUpi}.`,
    },
    {
      clauseNumber: 2,
      titleRw: "2. IGIHE CY'AMASEZERANO (TERM OF LEASE)",
      titleEn: "2. DURATION OF THE TENANCY",
      textRw: `Aya masezerano azatangira ku itariki ya ${input.startDate} arangire ku itariki ya ${input.endDate}. Igihe cyo kumenyesha kwimura cyangwa kongera amasezerano ni ukwezi kumwe (1) mbere.`,
      textEn: `This tenancy shall commence on ${input.startDate} and terminate on ${input.endDate}. Either party may give one (1) month prior written notice for termination or lease renewal.`,
    },
    {
      clauseNumber: 3,
      titleRw: "3. UBUKODE N'UBWISHYU (RENT & PAYMENT TERMS)",
      titleEn: "3. RENT & STATUTORY TAX COMPLIANCE",
      textRw: `Ubukode bwumvikanyweho ni Amafaranga y'u Rwanda ${input.monthlyRentRwf.toLocaleString()} RWF ku kwezi, yishyurwa mbere y'itariki ya gatanu (5) ya buri kwezi hakoreshejwe MTN Mobile Money, Airtel Money, cyangwa Banki.`,
      textEn: `The agreed monthly rent is Rwandan Francs ${input.monthlyRentRwf.toLocaleString()} RWF payable on or before the fifth (5th) day of each calendar month via MTN Mobile Money, Airtel Money, or electronic bank transfer.`,
    },
    {
      clauseNumber: 4,
      titleRw: "4. INGWATE Y'UBUKODE (SECURITY DEPOSIT)",
      titleEn: "4. SECURITY DEPOSIT",
      textRw: `Umukodesha atanze ingwate y'amafaranga ${input.securityDepositRwf.toLocaleString()} RWF. Iyi ngwate izasubizwa umukodesha mu minsi 15 amaze gusohoka mu nzu amaze kwishyura ibirarane byose by'amazi, amashanyarazi no gusana ibyangiritse.`,
      textEn: `The Tenant deposits the sum of ${input.securityDepositRwf.toLocaleString()} RWF as security deposit. This deposit shall be refundable within 15 days after vacating premises, subject to clearance of utility bills and fixture repairs.`,
    },
    {
      clauseNumber: 5,
      titleRw: "5. KUMENYEKANISHA MURI RRA (STATUTORY RRA FILING)",
      titleEn: "5. RRA REGISTRATION & TAX DECLARATION",
      textRw: `Aya masezerano azashyikirizwa Ikigo cy'Imisoro n'Amahoro cy'u Rwanda (RRA) mu minsi cumi n'itanu (15) ikurikira isinywa ryayo nk'uko biteganywa n'amategeko y'imisoro mu Rwanda.`,
      textEn: `This lease agreement shall be officially registered with the Rwanda Revenue Authority (RRA) within fifteen (15) calendar days of execution in strict accordance with statutory tax laws of the Republic of Rwanda.`,
    },
  ];

  const rraFilingDeclaration = `ICYEMEZO CYA RRA: Aya masezerano arubahiriza amabwiriza ya Minisiteri n'amategeko agenga ubukode n'imisoro mu Rwanda. Nimero y'Ikibanza (UPI): ${input.propertyUpi}.`;

  return {
    leaseNumber: input.leaseNumber,
    propertyUpi: input.propertyUpi,
    clauses,
    rraFilingDeclaration,
    generatedDate: new Date().toLocaleDateString(),
  };
}
