import { describe, expect, it } from 'vitest';
import { mapManagedListingsWithInquiryCount } from '../../src/lib/marketplaceManagedListings';

describe('mapManagedListingsWithInquiryCount', () => {
  it('normalizes inquiry_count values from SQL rows to numbers', () => {
    const rows = [
      {
        id: 'l1',
        company_id: 'c1',
        title: 'Listing One',
        slug: 'listing-one',
        status: 'live',
        verification_state: 'verified',
        city: 'Kigali',
        area: 'Nyarutarama',
        rent_amount: 1200000,
        currency: 'RWF',
        published_at: null,
        created_at: '2026-07-23T00:00:00.000Z',
        inquiry_count: '5',
      },
      {
        id: 'l2',
        company_id: 'c1',
        title: 'Listing Two',
        slug: 'listing-two',
        status: 'paused',
        verification_state: 'pending',
        city: 'Kigali',
        area: null,
        rent_amount: 900000,
        currency: 'RWF',
        published_at: null,
        created_at: '2026-07-23T01:00:00.000Z',
        inquiry_count: null,
      },
    ];

    const mapped = mapManagedListingsWithInquiryCount(rows);

    expect(mapped[0].inquiry_count).toBe(5);
    expect(mapped[1].inquiry_count).toBe(0);
  });
});
