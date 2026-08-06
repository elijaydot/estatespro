import { describe, expect, it } from 'vitest';
import { buildAiExportBaseName, slugifyAiExportName, tableRowsToCsv } from '../../src/lib/aiResultExport';

describe('AI result exports', () => {
  it('builds stable filenames from the result mode and submitted query', () => {
    expect(buildAiExportBaseName('Reports', 'Create a rent collection report'))
      .toBe('fishgate-reports-create-a-rent-collection-report');
    expect(slugifyAiExportName('  RWF / Occupancy %  ')).toBe('rwf-occupancy');
  });

  it('exports table rows as escaped CSV', () => {
    expect(tableRowsToCsv([
      ['Tenant', 'Balance', 'Note'],
      ['Lanre', 'RWF 1,500,000', 'Active'],
      ['NG baby', 'RWF 0', 'Said "paid"'],
    ])).toBe('Tenant,Balance,Note\nLanre,"RWF 1,500,000",Active\nNG baby,RWF 0,"Said ""paid"""');
  });
});