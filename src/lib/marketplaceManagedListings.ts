import type { ManagedMarketplaceListing } from '@/hooks/useMarketplace';

type ManagedListingRowWithCount = Omit<ManagedMarketplaceListing, 'inquiry_count'> & {
  inquiry_count: number | string | null;
};

export function mapManagedListingsWithInquiryCount(rows: ManagedListingRowWithCount[]): ManagedMarketplaceListing[] {
  return rows.map((row) => ({
    ...row,
    inquiry_count: Number(row.inquiry_count || 0),
  }));
}
