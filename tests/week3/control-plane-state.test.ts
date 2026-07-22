import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTROL_PLANE_STATE,
  parseControlPlaneUiState,
  toControlPlaneSearchParams,
} from '../../src/lib/controlPlaneState';

describe('controlPlaneState utils', () => {
  it('parses defaults when params are missing', () => {
    const state = parseControlPlaneUiState(new URLSearchParams());
    expect(state).toEqual(DEFAULT_CONTROL_PLANE_STATE);
  });

  it('parses and normalizes invalid enum values', () => {
    const params = new URLSearchParams('cp_tab=invalid&cp_range=invalid&cp_sev=weird');
    const state = parseControlPlaneUiState(params);

    expect(state.tab).toBe(DEFAULT_CONTROL_PLANE_STATE.tab);
    expect(state.timeRange).toBe(DEFAULT_CONTROL_PLANE_STATE.timeRange);
    expect(state.severityFilter).toBe(DEFAULT_CONTROL_PLANE_STATE.severityFilter);
  });

  it('serializes and restores state deterministically', () => {
    const original = {
      ...DEFAULT_CONTROL_PLANE_STATE,
      tab: 'events' as const,
      timeRange: '30d' as const,
      search: 'quota',
      companyFilter: 'company-1',
      correlationFilter: 'corr-1',
      eventResultFilter: 'blocked' as const,
      alertStatusFilter: 'open' as const,
      decisionFilter: 'denied' as const,
      userFilter: 'user-1',
      severityFilter: 'warning' as const,
    };

    const encoded = toControlPlaneSearchParams(original);
    const decoded = parseControlPlaneUiState(encoded);

    expect(decoded).toEqual(original);
  });
});
