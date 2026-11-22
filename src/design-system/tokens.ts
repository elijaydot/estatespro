/**
 * FishGate Universal Enterprise Design System Tokens
 * Aligned with Microsoft 365, Google Material, Stripe Dashboard, Linear, and Notion.
 *
 * Rules:
 * - Font: Inter everywhere. No exceptions.
 * - Allowed sizes only: 12px, 14px, 16px, 18px, 20px, 24px, 32px, 40px.
 * - Strict 8pt spacing grid: 4, 8, 16, 24, 32, 48, 64px.
 * - Colors: Primary #2563EB, Success #10B981, Warning #F59E0B, Danger #EF4444.
 * - Neutrals: Slate scale only.
 * - 80% whitespace, 20% visual styling.
 */

export const TYPOGRAPHY = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  scale: {
    display: {
      fontSize: '40px',
      lineHeight: '48px',
      fontWeight: '700',
      className: 'text-[40px] leading-[48px] font-bold tracking-tight',
    },
    pageTitle: {
      fontSize: '32px',
      lineHeight: '40px',
      fontWeight: '700',
      className: 'text-[32px] leading-[40px] font-bold tracking-tight',
    },
    sectionTitle: {
      fontSize: '24px',
      lineHeight: '32px',
      fontWeight: '600',
      className: 'text-[24px] leading-[32px] font-semibold tracking-tight',
    },
    titleSm: {
      fontSize: '20px',
      lineHeight: '28px',
      fontWeight: '600',
      className: 'text-[20px] leading-[28px] font-semibold',
    },
    titleXs: {
      fontSize: '18px',
      lineHeight: '26px',
      fontWeight: '600',
      className: 'text-[18px] leading-[26px] font-semibold',
    },
    cardTitle: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: '600',
      className: 'text-[16px] leading-[24px] font-semibold',
    },
    body: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: '400',
      className: 'text-[14px] leading-[20px] font-normal',
    },
    bodyMedium: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: '500',
      className: 'text-[14px] leading-[20px] font-medium',
    },
    helperText: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: '400',
      className: 'text-[12px] leading-[16px] font-normal',
    },
    helperMedium: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: '500',
      className: 'text-[12px] leading-[16px] font-medium',
    },
  },
  allowedSizes: [12, 14, 16, 18, 20, 24, 32, 40] as const,
} as const;

export const SPACING_GRID = {
  unit: 8,
  scale: {
    xxs: 4,  // 0.5 grid unit
    xs: 8,   // 1 grid unit
    sm: 16,  // 2 grid units
    md: 24,  // 3 grid units
    lg: 32,  // 4 grid units
    xl: 48,  // 6 grid units
    xxl: 64, // 8 grid units
  },
  classes: {
    p_xxs: 'p-1',
    p_xs: 'p-2',
    p_sm: 'p-4',
    p_md: 'p-6',
    p_lg: 'p-8',
    p_xl: 'p-12',
    p_xxl: 'p-16',
    gap_xxs: 'gap-1',
    gap_xs: 'gap-2',
    gap_sm: 'gap-4',
    gap_md: 'gap-6',
    gap_lg: 'gap-8',
    gap_xl: 'gap-12',
    gap_xxl: 'gap-16',
    space_y_xs: 'space-y-2',
    space_y_sm: 'space-y-4',
    space_y_md: 'space-y-6',
    space_y_lg: 'space-y-8',
  },
} as const;

export const COLOR_TOKENS = {
  primary: {
    DEFAULT: '#2563EB', // Blue 600
    hover: '#1D4ED8',   // Blue 700
    light: '#EFF6FF',   // Blue 50
    border: '#BFDBFE',  // Blue 200
  },
  success: {
    DEFAULT: '#10B981', // Emerald 500
    hover: '#059669',   // Emerald 600
    light: '#ECFDF5',   // Emerald 50
    border: '#A7F3D0',  // Emerald 200
  },
  warning: {
    DEFAULT: '#F59E0B', // Amber 500
    hover: '#D97706',   // Amber 600
    light: '#FFFBEB',   // Amber 50
    border: '#FDE68A',  // Amber 200
  },
  danger: {
    DEFAULT: '#EF4444', // Red 500
    hover: '#DC2626',   // Red 600
    light: '#FEF2F2',   // Red 50
    border: '#FECACA',  // Red 200
  },
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
} as const;

export const CARD_STANDARDS = {
  rule: 'Reduce card usage by at least 40%. Whitespace replaces borders whenever possible.',
  baseClassName: 'rounded-xl border border-slate-200/80 bg-white text-slate-900 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
  flushClassName: 'bg-transparent border-0 shadow-none',
} as const;
