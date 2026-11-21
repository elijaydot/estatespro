import { describe, it, expect } from 'vitest';
import {
  validateRwandanTin,
  validateRwandanNationalId,
  lookupRdbCompany,
  verifyDirectorAuthority,
  submitFullKybApplication,
} from '../../src/lib/kybVerificationService';

describe('Rwanda Development Board (RDB) Company Code / TIN Validation', () => {
  it('validates 9-digit Rwandan TIN / RDB Company Codes', () => {
    const r1 = validateRwandanTin('100234567');
    expect(r1.isValid).toBe(true);
    expect(r1.cleaned).toBe('100234567');

    const r2 = validateRwandanTin(' 100-234-567 ');
    expect(r2.isValid).toBe(true);
    expect(r2.cleaned).toBe('100234567');
  });

  it('rejects invalid TIN lengths and characters', () => {
    const r1 = validateRwandanTin('12345');
    expect(r1.isValid).toBe(false);
    expect(r1.error).toContain('9 digits');

    const r2 = validateRwandanTin('10023456789');
    expect(r2.isValid).toBe(false);

    const r3 = validateRwandanTin('');
    expect(r3.isValid).toBe(false);
  });
});

describe('Rwandan National ID (NIDA) 16-Digit Identity Verification', () => {
  it('validates 16-digit Rwandan NIDA numbers starting with 1', () => {
    const r1 = validateRwandanNationalId('1199680012345678');
    expect(r1.isValid).toBe(true);
    expect(r1.cleaned).toBe('1199680012345678');
  });

  it('rejects National ID numbers not starting with 1 or with invalid length', () => {
    const r1 = validateRwandanNationalId('2199680012345678');
    expect(r1.isValid).toBe(false);
    expect(r1.error).toContain('starting with 1');

    const r2 = validateRwandanNationalId('1199680012');
    expect(r2.isValid).toBe(false);
    expect(r2.error).toContain('16 digits');
  });
});

describe('RDB Corporate Registry Lookup (Conduit & AiPrise Compatible)', () => {
  it('resolves official registered entity for 100234567 (FishGate Real Estate Rwanda Ltd)', async () => {
    const result = await lookupRdbCompany('100234567');
    expect(result.found).toBe(true);
    expect(result.company?.legalName).toBe('FishGate Real Estate Rwanda Ltd');
    expect(result.company?.legalStructure).toBe('Company Limited by Shares (Ltd)');
    expect(result.company?.status).toBe('ACTIVE');
    expect(result.company?.registry).toContain('Rwanda Development Board');
    expect(result.company?.registeredAddress.district).toBe('Gasabo');
  });

  it('resolves Kigali Heights Property Group Ltd for 109876543', async () => {
    const result = await lookupRdbCompany('109876543');
    expect(result.found).toBe(true);
    expect(result.company?.legalName).toBe('Kigali Heights Property Group Ltd');
    expect(result.company?.legalStructure).toBe('Company Limited by Shares (Ltd)');
  });

  it('dynamically generates valid RDB corporate profile for arbitrary 9-digit Rwandan TIN', async () => {
    const result = await lookupRdbCompany('105556667');
    expect(result.found).toBe(true);
    expect(result.company?.tin).toBe('105556667');
    expect(result.company?.status).toBe('ACTIVE');
    expect(result.company?.legalName).toContain('Rwanda Estate Holding');
  });
});

describe('Director / Shareholder Authority Fuzzy Name Match', () => {
  it('matches reversed name tokens with high confidence score', () => {
    const match = verifyDirectorAuthority('Mugisha Jean-Luc', 'Jean-Luc Mugisha');
    expect(match.isMatch).toBe(true);
    expect(match.confidenceScore).toBeGreaterThanOrEqual(90);
  });

  it('handles partial token matches for administrative review', () => {
    const match = verifyDirectorAuthority('Kagabo Eric Paul', 'Kagabo Eric');
    expect(match.isMatch).toBe(true);
    expect(match.confidenceScore).toBeGreaterThanOrEqual(75);
  });
});

describe('Law Nº 058/2021 (NCSA Data Protection) & KYB Submission Lifecycle', () => {
  it('enforces mandatory NCSA data protection consent', async () => {
    const failResult = await submitFullKybApplication({
      tin: '100234567',
      companyName: 'FishGate Real Estate Rwanda Ltd',
      legalStructure: 'Company Limited by Shares (Ltd)',
      applicantName: 'Mugisha Jean-Luc',
      idType: 'national_id',
      idNumber: '1199680012345678',
      directorRole: 'Managing Director',
      ncsaDataConsent: false, // User denied consent
    });

    expect(failResult.success).toBe(false);
    expect(failResult.status).toBe('rejected');
    expect(failResult.message).toContain('Law Nº 058/2021');
  });

  it('approves compliant KYB submission when consent and valid TIN are supplied', async () => {
    const successResult = await submitFullKybApplication({
      tin: '100234567',
      companyName: 'FishGate Real Estate Rwanda Ltd',
      legalStructure: 'Company Limited by Shares (Ltd)',
      applicantName: 'Mugisha Jean-Luc',
      idType: 'national_id',
      idNumber: '1199680012345678',
      directorRole: 'Managing Director',
      ncsaDataConsent: true,
      rwarebLicenseNumber: 'RWAREB-PM-2026-001',
    });

    expect(successResult.success).toBe(true);
    expect(successResult.status).toBe('verified');
    expect(successResult.companyName).toBe('FishGate Real Estate Rwanda Ltd');
  });
});
