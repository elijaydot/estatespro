// src/hooks/useOccupancy.ts
// FishGate Design Constitution v1.0 - Operational Occupancy Hook

import { useMemo } from 'react';
import { useUnits, type Unit } from '@/hooks/useUnits';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useLeases, type Lease } from '@/hooks/useLeases';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useTenants } from '@/hooks/useTenants';
import {
  calculateOccupancyHealth,
  calculateOccupancyAttentionItems,
  calculateVacancyRecords,
  calculateOccupancyTrends,
  generateOccupancyObservations,
  generatePropertyHeatmaps,
  type OccupancyHealthSummary,
  type OccupancyAttentionItem,
  type VacancyRecord,
  type OccupancyTrendData,
  type PropertyHeatmapGroup,
} from '@/lib/occupancyEngine';

export function useOccupancy(selectedPropertyId?: string) {
  const {
    data: rawUnits = [],
    isLoading: isUnitsLoading,
    error: unitsError,
    refetch: refetchUnits,
  } = useUnits(selectedPropertyId);

  const { data: properties = [], isLoading: isPropsLoading } = useProperties();
  const { data: leases = [], isLoading: isLeasesLoading } = useLeases();
  const { data: maintenanceRequests = [], isLoading: isMaintLoading } = useMaintenanceRequests();
  const { data: allTenants = [] } = useTenants();

  // Combine and enrich units with tenant relations
  const units: Unit[] = useMemo(() => {
    return rawUnits.map((u) => {
      const hasTenants = Array.isArray(u.tenants) && u.tenants.length > 0;
      const matchedTenants = hasTenants
        ? u.tenants!
        : allTenants
            .filter((t) => t.unit_id === u.id)
            .map((t) => ({
              id: t.id,
              name: t.name,
              email: t.email,
              phone: t.phone,
              status: t.status,
              move_in_date: t.move_in_date,
              lease_start_date: t.move_in_date,
              lease_end_date: t.lease_end_date,
              balance: t.balance,
            }));

      return {
        ...u,
        tenants: matchedTenants,
      };
    });
  }, [rawUnits, allTenants]);

  // Derived Occupancy Engine Metrics
  const summary: OccupancyHealthSummary = useMemo(() => {
    return calculateOccupancyHealth(units, properties, leases);
  }, [units, properties, leases]);

  const attentionItems: OccupancyAttentionItem[] = useMemo(() => {
    return calculateOccupancyAttentionItems(units, leases, maintenanceRequests);
  }, [units, leases, maintenanceRequests]);

  const vacancyRecords: VacancyRecord[] = useMemo(() => {
    return calculateVacancyRecords(units, leases);
  }, [units, leases]);

  const trends: OccupancyTrendData = useMemo(() => {
    return calculateOccupancyTrends(units, leases);
  }, [units, leases]);

  const observations: string[] = useMemo(() => {
    return generateOccupancyObservations(summary, attentionItems, vacancyRecords);
  }, [summary, attentionItems, vacancyRecords]);

  const propertyHeatmaps: PropertyHeatmapGroup[] = useMemo(() => {
    return generatePropertyHeatmaps(units, properties);
  }, [units, properties]);

  const isLoading = isUnitsLoading || isPropsLoading || isLeasesLoading || isMaintLoading;

  return {
    isLoading,
    unitsError,
    refetch: refetchUnits,
    units,
    properties,
    leases,
    maintenanceRequests,
    summary,
    attentionItems,
    vacancyRecords,
    trends,
    observations,
    propertyHeatmaps,
  };
}
