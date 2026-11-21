import { describe, it, expect } from 'vitest';
import { generateEbmVsdcReceipt } from '../../src/lib/rraEbmVsdc';
import { detectMobileOperator, initiateMobilePayment } from '../../src/lib/eastAfricaPayments';
import { formatE164, sendTransactionalSms, smsTemplates } from '../../src/lib/smsGateway';
import { compileBilingualLease } from '../../src/lib/bilingualLeaseAgreement';

describe('RRA EBM v2 & VSDC (Virtual Sales Data Controller) Fiscal Compliance', () => {
  it('generates a compliant RRA EBM receipt with SDC ID, MRC, and cryptographic signature', () => {
    const receipt = generateEbmVsdcReceipt({
      invoiceId: 'inv-12345',
      invoiceNumber: 'INV-2026-001',
      companyName: 'FishGate Real Estate Rwanda Ltd',
      companyTin: '100234567',
      tenantName: 'Kagabo Jean',
      tenantTin: '109876543',
      propertyUpi: '1/03/05/02/1234',
      propertyName: 'Kigali Prime Heights',
      unitNumber: 'A-102',
      amount: 500000,
      currency: 'RWF',
      taxCategory: 'rental_tax',
    });

    expect(receipt.receiptNumber).toMatch(/^EBM-\d{4}-\d+/);
    expect(receipt.sdcId).toBe('VSDC-RRA-RW001');
    expect(receipt.mrc).toBe('RRA-FISHGATE-01');
    expect(receipt.companyTin).toBe('100234567');
    expect(receipt.propertyUpi).toBe('1/03/05/02/1234');
    expect(receipt.grossAmount).toBe(500000);
    // 15% statutory rental tax calculation
    expect(receipt.taxAmount).toBe(75000);
    expect(receipt.internalDataHash).toContain('VSDC-RRA-CERTIFIED');
    expect(receipt.qrCodeUrl).toContain('ebm.rra.gov.rw/verify');
  });

  it('correctly calculates 18% standard VAT for commercial leases', () => {
    const receipt = generateEbmVsdcReceipt({
      invoiceId: 'inv-commercial',
      invoiceNumber: 'INV-COMM-002',
      companyName: 'FishGate Commercial Towers',
      companyTin: '100234567',
      tenantName: 'Kigali Tech Hub Ltd',
      tenantTin: '100999888',
      propertyUpi: '1/03/05/02/5678',
      propertyName: 'Kigali Commercial Tower',
      amount: 1180000,
      currency: 'RWF',
      taxCategory: 'vat_standard',
    });

    expect(receipt.taxRatePercent).toBe(18);
    expect(receipt.taxableAmount).toBe(1000000);
    expect(receipt.taxAmount).toBe(180000);
    expect(receipt.netAmount).toBe(1000000);
  });
});

describe('East Africa Mobile Money (MTN MoMo & Airtel Money)', () => {
  it('correctly detects MTN Rwanda numbers (078, 079) and formats to E.164 (+250)', () => {
    const r1 = detectMobileOperator('0788123456');
    expect(r1.operator).toBe('MTN_RW');
    expect(r1.formattedPhone).toBe('+250788123456');
    expect(r1.isValid).toBe(true);

    const r2 = detectMobileOperator('+250791234567');
    expect(r2.operator).toBe('MTN_RW');
    expect(r2.formattedPhone).toBe('+250791234567');
  });

  it('correctly detects Airtel Money Rwanda numbers (072, 073)', () => {
    const r1 = detectMobileOperator('0722987654');
    expect(r1.operator).toBe('AIRTEL_RW');
    expect(r1.formattedPhone).toBe('+250722987654');
  });

  it('correctly detects Kenyan Safaricom M-Pesa numbers (+254)', () => {
    const r = detectMobileOperator('+254712345678');
    expect(r.operator).toBe('MPESA_KE');
  });

  it('initiates USSD prompt push with transaction reference and EBM eligibility', async () => {
    const res = await initiateMobilePayment({
      phone: '0788555666',
      amount: 350000,
      currency: 'RWF',
      invoiceId: 'inv-99',
    });

    expect(res.success).toBe(true);
    expect(res.transactionRef).toMatch(/^MOMO-/);
    expect(res.status).toBe('pending_ussd_pin');
    expect(res.ussdPromptMessage).toContain('*182#');
    expect(res.ebmEligible).toBe(true);
  });
});

describe('Multi-Carrier SMS Gateway (Africa\'s Talking & Twilio)', () => {
  it('formats Rwandan numbers into E.164 properly', () => {
    expect(formatE164('0788123456')).toBe('+250788123456');
    expect(formatE164('+250788123456')).toBe('+250788123456');
    expect(formatE164('0722123456')).toBe('+250722123456');
  });

  it('routes East African numbers to Africa\'s Talking with localized Kinyarwanda SMS', async () => {
    const msg = smsTemplates.inboundLeadSlaAlert('Jean-Luc', 'Mutanguha Eric', '+250788111222', 'new');
    expect(msg).toContain('2-Hour SLA');
    expect(msg).toContain('Lead yihutirwa');

    const result = await sendTransactionalSms({
      to: '+250788123456',
      message: msg,
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('africas_talking');
    expect(result.status).toBe('sent');
  });
});

describe('Bilingual (Kinyarwanda & English) Legal Lease Contract Generator', () => {
  it('compiles statutory 5-clause lease agreement with NLA parcel UPI number', () => {
    const contract = compileBilingualLease({
      leaseNumber: 'LS-2026-9041',
      landlordName: 'Mugisha Paul',
      tenantName: 'Uwase Aline',
      tenantNationalId: '1199680012345678',
      tenantPhone: '+250788999888',
      propertyName: 'Kigali Horizon Residences',
      propertyUpi: '1/03/05/02/8899',
      district: 'Kicukiro',
      sector: 'Niboye',
      unitNumber: 'B-04',
      monthlyRentRwf: 450000,
      securityDepositRwf: 450000,
      startDate: '2026-02-01',
      endDate: '2027-01-31',
    });

    expect(contract.leaseNumber).toBe('LS-2026-9041');
    expect(contract.propertyUpi).toBe('1/03/05/02/8899');
    expect(contract.clauses.length).toBe(5);
    // Verifies Kinyarwanda & English dual clause titles
    expect(contract.clauses[0].titleRw).toContain('INZU IKODESHWAMO');
    expect(contract.clauses[0].titleEn).toContain('THE LEASED PREMISES');
    // Verifies 15-day statutory RRA filing declaration
    expect(contract.clauses[4].textRw).toContain('minsi cumi n\'itanu (15)');
    expect(contract.clauses[4].textEn).toContain('fifteen (15) calendar days');
  });
});
