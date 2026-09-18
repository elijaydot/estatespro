import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Lock,
  Sparkles,
  Shield,
  Building2,
  Users,
  Bot,
  FileText,
  Smartphone,
  Megaphone,
  Zap,
  Clock,
  Layers,
  BarChart3,
  BadgeCheck,
  Download,
  Printer,
  LayoutGrid,
  List,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSaasAccess } from '@/hooks/useSaasAccess';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { GoogleStyleBillingOverview } from '@/components/billing/GoogleStyleBillingOverview';
import { OfficialSubscriptionInvoiceModal, type OfficialInvoiceData } from '@/components/billing/OfficialSubscriptionInvoiceModal';

type PriceRow = {
  currency_code: string;
  amount_minor: number;
  is_active: boolean;
};

type EntitlementRow = {
  bool_value: boolean;
  saas_entitlement_keys: {
    key: string;
    domain: string;
  } | null;
};

type ProductRow = {
  code: string;
  name: string;
};

type PlanRow = {
  id: string;
  code: string;
  tier: 'free' | 'bronze' | 'silver' | 'gold' | 'platinum';
  name: string;
  description: string;
  sort_order: number;
  saas_products: ProductRow | null;
  saas_plan_prices: PriceRow[] | null;
  saas_plan_entitlements: EntitlementRow[] | null;
};

type SubscriptionRow = {
  id: string;
  company_id: string;
  product_id: string;
  plan_id: string;
  created_at: string;
  status: string;
  payment_state: string | null;
  dunning_attempt_count: number | null;
  last_dunning_attempt_at: string | null;
  next_renewal_at: string | null;
  next_billing_at: string | null;
  saas_plans: {
    id: string;
    name: string;
    code: string;
    tier: string;
    saas_products: ProductRow | null;
  } | null;
};

type InvoiceRow = {
  id: string;
  company_id: string;
  subscription_id: string;
  invoice_kind: string;
  invoice_status: string;
  amount_minor: number;
  currency_code: string;
  due_at?: string | null;
  paid_at?: string | null;
  external_reference?: string | null;
  created_at: string;
  invoice_number?: string;
  customer_details?: any;
  billing_details?: any;
  metadata?: any;
};

type SubscriptionEventRow = {
  id: string;
  company_id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type PendingPaymentVerification = {
  productCode: string;
  attemptId: string;
  invoiceId: string;
  gateway: 'paystack' | 'flutterwave';
  reference: string;
  amountMinor: number;
  currency: string;
};

const PENDING_VERIFICATIONS_STORAGE_KEY = 'saas.pendingPlanVerifications.v1';
const MAX_PAYMENT_VERIFY_RETRIES = 5;

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(() => resolve(), ms);
});

type FeatureItem = {
  id: string;
  name: string;
  description: string;
  minTier: 'trial' | 'starter' | 'growth' | 'professional' | 'enterprise';
  domain: string;
};

const FEATURE_CATALOG: FeatureItem[] = [
  // Core PM
  {
    id: 'portfolio_mgmt',
    name: 'Multi-Property Portfolio & Units',
    description: 'Manage unlimited properties and units within your tier limits.',
    minTier: 'starter',
    domain: '🏢 Core Property Operations',
  },
  {
    id: 'leases_esign',
    name: 'Digital Lease Drafting & E-Signatures',
    description: 'Automated digital lease generation and tenant e-signing.',
    minTier: 'starter',
    domain: '🏢 Core Property Operations',
  },
  {
    id: 'portals_tenant_owner',
    name: 'Tenant & Owner Self-Service Portals',
    description: 'Dedicated web portals for tenant payments and owner portfolio reporting.',
    minTier: 'starter',
    domain: '🏢 Core Property Operations',
  },
  {
    id: 'momo_collections',
    name: 'MoMo (MTN & Airtel) & Card Rent Collections',
    description: 'Direct mobile money automated collection & instant receipting.',
    minTier: 'starter',
    domain: '🏢 Core Property Operations',
  },
  {
    id: 'maintenance_dispatch',
    name: 'Maintenance Ticketing & Vendor Dispatch',
    description: 'Work order tracking, vendor assignment, and tenant maintenance chat.',
    minTier: 'starter',
    domain: '🏢 Core Property Operations',
  },

  // Marketplace
  {
    id: 'marketplace_listings',
    name: 'Verified Public Marketplace Listings',
    description: 'Publish vacant units to the public FishGate marketplace directory.',
    minTier: 'starter',
    domain: '📣 Marketplace & Public Directory',
  },
  {
    id: 'public_seo_index',
    name: 'Search Engine & Public Directory Indexing',
    description: 'Automatic Google SEO indexing and rich snippet property tags.',
    minTier: 'starter',
    domain: '📣 Marketplace & Public Directory',
  },
  {
    id: 'tenant_lead_capture',
    name: 'Direct Tenant Inquiries & Lead Capture',
    description: 'Prospective tenant inquiries routed straight to your CRM.',
    minTier: 'starter',
    domain: '📣 Marketplace & Public Directory',
  },
  {
    id: 'publisher_verification',
    name: 'Verified Agency Trust Shield',
    description: 'Verified landlord badge and priority placement in marketplace searches.',
    minTier: 'professional',
    domain: '📣 Marketplace & Public Directory',
  },

  // CRM & Automation
  {
    id: 'crm_whatsapp',
    name: 'Automated WhatsApp & SMS Rent Reminders',
    description: 'Scheduled multi-channel reminders before and on rent due dates.',
    minTier: 'growth',
    domain: '💼 CRM & Tenant Automation',
  },
  {
    id: 'crm_pipelines',
    name: 'Tenant Funnel & Lease Deal Pipelines',
    description: 'Visual Kanban pipeline tracking prospective tenant conversions.',
    minTier: 'growth',
    domain: '💼 CRM & Tenant Automation',
  },
  {
    id: 'crm_activity_logs',
    name: 'Automated Call, Meeting & Chat Logs',
    description: 'Centralized interaction history for every tenant and prospective lead.',
    minTier: 'growth',
    domain: '💼 CRM & Tenant Automation',
  },
  {
    id: 'broadcast_announcements',
    name: 'Multi-Tenant Broadcast Announcements',
    description: 'Bulk emergency and general alerts across entire buildings or estates.',
    minTier: 'growth',
    domain: '💼 CRM & Tenant Automation',
  },

  // AI & Automation
  {
    id: 'ai_document_ocr',
    name: 'AI Document OCR & Lease Extraction',
    description: 'Scan uploaded paper leases and ID cards to automatically extract data.',
    minTier: 'professional',
    domain: '🤖 AI Assistant & Operational Automation',
  },
  {
    id: 'ai_inspection_scoring',
    name: 'AI Inspection Defect & Damage Scoring',
    description: 'Automated visual analysis and wear-and-tear deposit deduction scoring.',
    minTier: 'professional',
    domain: '🤖 AI Assistant & Operational Automation',
  },
  {
    id: 'ai_pricing_engine',
    name: 'Smart Market Rent Recommendation Engine',
    description: 'Hyper-local comparative market analysis for optimal rental yields.',
    minTier: 'professional',
    domain: '🤖 AI Assistant & Operational Automation',
  },

  // Compliance & Accounting
  {
    id: 'rra_tax_filing',
    name: 'RRA Automated 15-Day Statutory Lease E-Filing',
    description: 'Mandatory Rwanda Revenue Authority digital compliance contract filing.',
    minTier: 'professional',
    domain: '🏛️ Compliance, Accounting & Taxes',
  },
  {
    id: 'vat_tax_invoices',
    name: 'Itemized Official VAT Tax Invoices & Receipts',
    description: 'Downloadable PDF invoices with legal company TIN & RRA QR codes.',
    minTier: 'starter',
    domain: '🏛️ Compliance, Accounting & Taxes',
  },
  {
    id: 'financial_reporting',
    name: 'Real-Time Financial P&L & Expense Exports',
    description: 'Income statements, rent roll exports, and landlord financial statements.',
    minTier: 'growth',
    domain: '🏛️ Compliance, Accounting & Taxes',
  },
  {
    id: 'multi_company_grouping',
    name: 'Multi-Company & Entity Group Metering',
    description: 'Consolidated owner billing groups for property conglomerates.',
    minTier: 'enterprise',
    domain: '🏛️ Compliance, Accounting & Taxes',
  },

  // Developer Platform
  {
    id: 'webhook_streaming',
    name: 'Real-Time Webhook Event Streaming',
    description: 'Stream instant notifications for payments, leases, and maintenance.',
    minTier: 'growth',
    domain: '🔌 Developer Platform & API',
  },
  {
    id: 'rest_api_access',
    name: 'Custom REST API Access',
    description: 'Programmatic API keys to integrate external ERP, accounting, or PMS.',
    minTier: 'professional',
    domain: '🔌 Developer Platform & API',
  },
];

const TIER_RANK: Record<string, number> = {
  trial: 10,
  starter: 1,
  growth: 2,
  professional: 3,
  enterprise: 4,
};

function formatPrice(amountMinor: number, currencyCode: string) {
  const decimals = 2;
  const amount = (amountMinor || 0) / 10 ** decimals;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function BillingPlansSettings() {
  const { activeCompanyId, activeCompany } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { quotas, isLoading: saasAccessLoading } = useSaasAccess();
  const { settings } = useSettings();
  const { convert: convertCurrency } = useExchangeRates('USD');
  const [currency, setCurrency] = useState<string>(() => settings.currencyCode || 'USD');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [pendingVerificationByProduct, setPendingVerificationByProduct] = useState<Record<string, PendingPaymentVerification>>({});

  // Landlord Invoice Views & Controls
  const [invoiceViewMode, setInvoiceViewMode] = useState<'table' | 'cards'>('table');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'paid' | 'open' | 'void'>('all');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);
  const [selectedOfficialInvoice, setSelectedOfficialInvoice] = useState<OfficialInvoiceData | null>(null);
  const [isOfficialInvoiceModalOpen, setIsOfficialInvoiceModalOpen] = useState(false);

  useEffect(() => {
    if (settings.currencyCode) {
      setCurrency(settings.currencyCode);
    }
  }, [settings.currencyCode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(PENDING_VERIFICATIONS_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Record<string, PendingPaymentVerification>;
      if (parsed && typeof parsed === 'object') {
        setPendingVerificationByProduct(parsed);
      }
    } catch {
      window.localStorage.removeItem(PENDING_VERIFICATIONS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (Object.keys(pendingVerificationByProduct).length === 0) {
      window.localStorage.removeItem(PENDING_VERIFICATIONS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      PENDING_VERIFICATIONS_STORAGE_KEY,
      JSON.stringify(pendingVerificationByProduct),
    );
  }, [pendingVerificationByProduct]);

  // Load subscriptions
  const { data: currentSubscriptions = [], isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ['saas-current-subscriptions', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<SubscriptionRow[]> => {
      const { data, error } = await supabase
        .from('saas_company_plan_subscriptions' as never)
        .select('id, company_id, product_id, plan_id, created_at, status, payment_state, dunning_attempt_count, last_dunning_attempt_at, next_renewal_at, next_billing_at, saas_plans:plan_id(id, name, code, tier, saas_products:product_id(code, name))')
        .eq('company_id', activeCompanyId)
        .in('status', ['active', 'trialing', 'grace_period'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SubscriptionRow[];
    },
  });

  // Load invoices
  const { data: recentInvoices = [], isLoading: isInvoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['saas-recent-invoices', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<InvoiceRow[]> => {
      const { data, error } = await supabase
        .from('saas_subscription_invoices' as never)
        .select('id, company_id, subscription_id, invoice_kind, invoice_status, amount_minor, currency_code, due_at, paid_at, external_reference, created_at, invoice_number, customer_details, billing_details, metadata')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as InvoiceRow[];
    },
  });

  // Load events
  const { data: recentEvents = [], isLoading: isEventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['saas-subscription-events', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<SubscriptionEventRow[]> => {
      const { data, error } = await supabase
        .from('saas_subscription_events' as never)
        .select('id, company_id, event_type, details, created_at')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []) as unknown as SubscriptionEventRow[];
    },
  });

  const billingSummary = useMemo(() => {
    let openCount = 0;
    let paidCount = 0;
    let convertedOutstanding = 0;
    let maxDunning = 0;
    let nextBillingAt: string | null = null;

    for (const invoice of recentInvoices) {
      // Exclude void or superseded drafts from outstanding balance
      if (invoice.invoice_status === 'open' && invoice.metadata?.void_reason !== 'superseded_by_new_checkout') {
        openCount += 1;
        const nativeMajor = (invoice.amount_minor || 0) / 100;
        const inActiveCurrency = convertCurrency(nativeMajor, invoice.currency_code || 'USD', currency);
        convertedOutstanding += inActiveCurrency;
      } else if (invoice.invoice_status === 'paid') {
        paidCount += 1;
      }
    }

    for (const sub of currentSubscriptions) {
      if (typeof sub.dunning_attempt_count === 'number' && sub.dunning_attempt_count > maxDunning) {
        maxDunning = sub.dunning_attempt_count;
      }
      const candidateDate = sub.next_billing_at || sub.next_renewal_at;
      if (candidateDate) {
        if (!nextBillingAt || new Date(candidateDate).getTime() < new Date(nextBillingAt).getTime()) {
          nextBillingAt = candidateDate;
        }
      }
    }

    return {
      openCount,
      paidCount,
      convertedOutstanding,
      maxDunning,
      nextBillingAt,
    };
  }, [recentInvoices, currentSubscriptions, convertCurrency, currency]);

  const handleChoosePlan = useCallback(async (plan: PlanRow, productCode: string) => {
    if (!activeCompanyId) return;
    setPendingPlanId(plan.id);

    try {
      if (plan.tier !== 'free') {
        const { data, error } = await supabase.functions.invoke('saas-subscription-checkout', {
          body: {
            companyId: activeCompanyId,
            productCode,
            planCode: plan.code,
            currency,
            callbackUrl: `${window.location.origin}/settings?tab=billing`,
          },
        });

        if (error) throw error;

        const payload = data as {
          checkoutUrl?: string;
          attemptId?: string;
          invoiceId?: string;
          reference?: string;
          amountMinor?: number;
          currency?: 'USD' | 'NGN' | 'GBP';
        } | null;

        if (payload?.checkoutUrl) {
          if (payload.attemptId && payload.reference) {
            setPendingVerificationByProduct((prev) => ({
              ...prev,
              [productCode]: {
                productCode,
                attemptId: payload.attemptId!,
                invoiceId: payload.invoiceId || '',
                gateway: 'paystack',
                reference: payload.reference!,
                amountMinor: payload.amountMinor || 0,
                currency: payload.currency || currency,
              },
            }));
          }
          window.location.href = payload.checkoutUrl;
          return;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to initialize checkout';
      toast({
        variant: 'destructive',
        title: 'Checkout error',
        description: msg,
      });
    } finally {
      setPendingPlanId(null);
    }
  }, [activeCompanyId, currency, toast]);

  const handleVerifyPendingPayment = useCallback(async (productCode: string) => {
    const pendingInfo = pendingVerificationByProduct[productCode];
    if (!pendingInfo) return;

    setPendingPlanId(`verify-${pendingInfo.attemptId}`);
    try {
      let retryCount = 0;
      let isVerified = false;

      while (retryCount < MAX_PAYMENT_VERIFY_RETRIES && !isVerified) {
        const { data, error } = await supabase.functions.invoke('saas-verify-subscription-payment', {
          body: {
            attemptId: pendingInfo.attemptId,
            gateway: pendingInfo.gateway,
            reference: pendingInfo.reference,
          },
        });

        if (error) throw error;

        const payload = data as {
          success?: boolean;
          pending?: boolean;
          verificationStatus?: string;
          retryAfterMs?: number;
          message?: string;
        } | null;

        if (payload?.success && !payload.pending) {
          isVerified = true;
          setPendingVerificationByProduct((prev) => {
            const next = { ...prev };
            delete next[productCode];
            return next;
          });
          toast({
            title: 'Payment verified',
            description: payload.message || 'Your plan upgrade is now active.',
          });
          await queryClient.invalidateQueries({ queryKey: ['saas-current-subscriptions', activeCompanyId] });
          await queryClient.invalidateQueries({ queryKey: ['saas-recent-invoices', activeCompanyId] });
          await queryClient.invalidateQueries({ queryKey: ['saas-subscription-events', activeCompanyId] });
          break;
        }

        if (payload?.pending) {
          retryCount += 1;
          const retryAfterMs = typeof payload.retryAfterMs === 'number' && payload.retryAfterMs > 0
            ? payload.retryAfterMs
            : 1500;
          if (retryCount < MAX_PAYMENT_VERIFY_RETRIES) {
            await wait(retryAfterMs);
          } else {
            toast({
              title: 'Verification pending',
              description: 'Payment is still processing with gateway. Please check again in a few moments.',
            });
          }
        } else {
          throw new Error(payload?.message || 'Verification could not be confirmed.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify subscription payment';
      toast({
        variant: 'destructive',
        title: 'Verification error',
        description: msg,
      });
    } finally {
      setPendingPlanId(null);
    }
  }, [pendingVerificationByProduct, activeCompanyId, queryClient, toast]);

  // Handle URL return params
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const paymentStatus = url.searchParams.get('payment_status');
    const reference = url.searchParams.get('reference');

    if (reference) {
      const matchingProductCode = Object.keys(pendingVerificationByProduct).find((code) => {
        return pendingVerificationByProduct[code]?.reference === reference;
      });

      if (matchingProductCode) {
        void handleVerifyPendingPayment(matchingProductCode);
      }
    }
  }, [pendingVerificationByProduct, handleVerifyPendingPayment]);

  // Determine current active tier
  const activeTier = useMemo(() => {
    const firstSub = currentSubscriptions[0];
    if (!firstSub || firstSub.status === 'trialing') {
      return 'trial'; // 90-Day Free Onboarding Trial
    }
    const code = firstSub.saas_plans?.code?.toLowerCase() || '';
    if (code.includes('enterprise')) return 'enterprise';
    if (code.includes('professional')) return 'professional';
    if (code.includes('growth')) return 'growth';
    if (code.includes('starter')) return 'starter';
    return 'trial';
  }, [currentSubscriptions]);

  const activePlanName = useMemo(() => {
    if (activeTier === 'trial') return '90-Day Free Onboarding Trial';
    return currentSubscriptions[0]?.saas_plans?.name || 'Standard Tier';
  }, [activeTier, currentSubscriptions]);

  // Group features by domain
  const featuresByDomain = useMemo(() => {
    const groups: Record<string, FeatureItem[]> = {};
    for (const item of FEATURE_CATALOG) {
      if (!groups[item.domain]) {
        groups[item.domain] = [];
      }
      groups[item.domain].push(item);
    }
    return groups;
  }, []);

  // Helper to check if a feature is unlocked
  const isFeatureUnlocked = (minTier: FeatureItem['minTier']) => {
    if (activeTier === 'trial') return true;
    const currentRank = TIER_RANK[activeTier] || 1;
    const requiredRank = TIER_RANK[minTier] || 1;
    return currentRank >= requiredRank;
  };

  return (
    <div className="space-y-8">
      {/* 1. Google One / Google Workspace Style Primary Billing Overview */}
      <GoogleStyleBillingOverview />

      {/* Pending Verifications */}
      {Object.keys(pendingVerificationByProduct).length > 0 && (
        <div className="space-y-2">
          {Object.entries(pendingVerificationByProduct).map(([productCode, pending]) => (
            <div key={productCode} className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-foreground">Pending Payment Verification ({productCode})</p>
                <p className="text-muted-foreground">
                  Reference: <span className="font-mono">{pending.reference}</span> · Amount: {formatPrice(pending.amountMinor, pending.currency)}
                </p>
              </div>
              <Button
                size="sm"
                disabled={pendingPlanId === `verify-${pending.attemptId}`}
                onClick={() => void handleVerifyPendingPayment(productCode)}
              >
                {pendingPlanId === `verify-${pending.attemptId}` ? 'Verifying...' : 'Verify Payment'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 2. Foldable Details & Advanced Feature Hub */}
      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Advanced Feature Access & System Envelope
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Granular capabilities, quota telemetry, and lifecycle audit timeline.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="px-3 py-1 font-mono text-xs flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {activePlanName}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <Accordion type="multiple" defaultValue={['features', 'quotas']} className="w-full space-y-4">
            {/* Section A: Feature Entitlements Matrix (Foldable) */}
            <AccordionItem value="features" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Feature Access & Capabilities Matrix
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {activeTier === 'trial'
                        ? 'All features currently unlocked on the 90-Day Free Onboarding Trial'
                        : `Live feature access for the active ${activePlanName} tier`}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6 space-y-6">
                {/* Free Trial Banner */}
                {activeTier === 'trial' && (
                  <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 p-4 flex items-start gap-3">
                    <BadgeCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        90-Day Free Onboarding Trial Active
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        You have unrestricted access to all platform capabilities, automated WhatsApp workflows, AI inspection scoring, RRA tax compliance, and unlimited portals during your trial period.
                      </p>
                    </div>
                  </div>
                )}

                {/* Grouped Feature Domains */}
                <div className="space-y-6">
                  {Object.entries(featuresByDomain).map(([domain, items]) => (
                    <div key={domain} className="space-y-2.5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5">
                        {domain}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {items.map((feature) => {
                          const unlocked = isFeatureUnlocked(feature.minTier);
                          return (
                            <div
                              key={feature.id}
                              className={`rounded-lg border p-3 flex items-start justify-between gap-3 transition-all ${
                                unlocked
                                  ? 'bg-muted/20 border-border/60'
                                  : 'bg-muted/5 border-dashed border-border/40 opacity-70'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  {unlocked ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                  )}
                                  <span className="text-xs font-semibold text-foreground">
                                    {feature.name}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                                  {feature.description}
                                </p>
                              </div>

                              <Badge
                                variant={unlocked ? 'default' : 'outline'}
                                className={`text-[10px] shrink-0 font-medium px-2 py-0.5 ${
                                  unlocked
                                    ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {unlocked ? 'Included' : `Requires ${feature.minTier.toUpperCase()}`}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section B: Current Quota Envelope & Resource Metering (Foldable) */}
            <AccordionItem value="quotas" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      System Quota Envelope & Operational Limits
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Live capacity utilization and envelope limits across your portfolio
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6">
                {!saasAccessLoading && quotas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {quotas.map((quota) => {
                      const isUnlimited = quota.hard_limit <= 0;
                      const percent = isUnlimited
                        ? 0
                        : Math.min(100, Math.round((quota.used_value / quota.hard_limit) * 100));

                      return (
                        <div
                          key={quota.quota_code}
                          className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground capitalize">
                              {quota.quota_code.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {quota.used_value.toLocaleString()} /{' '}
                              {isUnlimited ? '∞ Unlimited' : quota.hard_limit.toLocaleString()}
                            </span>
                          </div>

                          {!isUnlimited && (
                            <div className="space-y-1">
                              <Progress value={percent} className="h-1.5" />
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>{percent}% utilized</span>
                                <span>{quota.remaining.toLocaleString()} remaining</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                    Telemetry envelope calibrated. Quotas update continuously as units and tenants are onboarded.
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Section C: Historical Invoices & Audit Timeline (Foldable) */}
            <AccordionItem value="invoices" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Historical Invoices & Accounting Audit
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Outstanding balance, past invoices, and financial ledger status
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6 space-y-4">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Outstanding Balance
                    </p>
                    <p className="text-lg font-bold mt-1 text-foreground">
                      {formatMoney(billingSummary.convertedOutstanding, currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Open Invoices
                    </p>
                    <p className="text-lg font-bold mt-1 text-foreground">
                      {billingSummary.openCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Paid Invoices
                    </p>
                    <p className="text-lg font-bold mt-1 text-foreground">
                      {billingSummary.paidCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Next Billing Date
                    </p>
                    <p className="text-sm font-semibold mt-1 text-foreground">
                      {formatDate(billingSummary.nextBillingAt)}
                    </p>
                  </div>
                </div>

                {/* Landlord Invoice Controls Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <Select value={invoiceStatusFilter} onValueChange={(val: any) => { setInvoiceStatusFilter(val); setInvoicePage(1); }}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="paid">Paid & Settled</SelectItem>
                        <SelectItem value="open">Open / Unpaid</SelectItem>
                        <SelectItem value="void">Void / Superseded</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchInvoices()}
                      disabled={isInvoicesLoading}
                      className="h-8 text-xs gap-1.5"
                    >
                      <RefreshCw className={`h-3 w-3 ${isInvoicesLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {/* View Mode Toggle: Table vs Cards */}
                  <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
                    <Button
                      variant={invoiceViewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setInvoiceViewMode('table')}
                      className="h-7 text-xs px-2.5 gap-1.5"
                    >
                      <List className="h-3.5 w-3.5" />
                      Table View
                    </Button>
                    <Button
                      variant={invoiceViewMode === 'cards' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setInvoiceViewMode('cards')}
                      className="h-7 text-xs px-2.5 gap-1.5"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Cards View
                    </Button>
                  </div>
                </div>

                {/* View 1: Table Ledger View */}
                {invoiceViewMode === 'table' && (
                  <div className="space-y-2">
                    {isInvoicesLoading ? (
                      <p className="text-xs text-muted-foreground p-4 text-center">Loading invoices...</p>
                    ) : recentInvoices.filter(i => invoiceStatusFilter === 'all' || i.invoice_status === invoiceStatusFilter).length === 0 ? (
                      <div className="p-8 text-center space-y-1 bg-muted/10 rounded-xl border border-dashed border-border">
                        <Receipt className="h-6 w-6 text-muted-foreground mx-auto opacity-50" />
                        <p className="text-xs font-semibold text-muted-foreground">No invoices matching the selected filter.</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/60 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="text-xs font-bold">Invoice #</TableHead>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Plan / Kind</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Amount</TableHead>
                              <TableHead className="text-xs">Reference</TableHead>
                              <TableHead className="text-xs text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentInvoices
                              .filter(i => invoiceStatusFilter === 'all' || i.invoice_status === invoiceStatusFilter)
                              .slice((invoicePage - 1) * invoicePageSize, invoicePage * invoicePageSize)
                              .map((invoice) => {
                                const invNumber = invoice.invoice_number || `FG-INV-${new Date(invoice.created_at).getFullYear()}-${invoice.id.slice(0, 6).toUpperCase()}`;
                                const isPaid = invoice.invoice_status === 'paid';
                                const isVoid = invoice.invoice_status === 'void';
                                return (
                                  <TableRow key={invoice.id} className="hover:bg-muted/20">
                                    <TableCell className="text-xs font-mono font-bold text-foreground">
                                      {invNumber}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {formatDate(invoice.created_at)}
                                    </TableCell>
                                    <TableCell className="text-xs capitalize">
                                      {invoice.metadata?.plan_name || invoice.metadata?.plan_code?.replace('fishgate_', '') || invoice.invoice_kind.replace(/_/g, ' ')}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] font-bold uppercase tracking-wider ${
                                          isPaid
                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                            : isVoid
                                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                              : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                        }`}
                                      >
                                        {invoice.invoice_status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono font-semibold">
                                      {formatPrice(invoice.amount_minor, invoice.currency_code)}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono max-w-[140px] truncate text-muted-foreground">
                                      {invoice.external_reference || '-'}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                        onClick={() => {
                                          setSelectedOfficialInvoice(invoice as unknown as OfficialInvoiceData);
                                          setIsOfficialInvoiceModalOpen(true);
                                        }}
                                      >
                                        <Download className="h-3 w-3" />
                                        Official PDF
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {/* View 2: Receipt Cards View */}
                {invoiceViewMode === 'cards' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {recentInvoices
                      .filter(i => invoiceStatusFilter === 'all' || i.invoice_status === invoiceStatusFilter)
                      .slice((invoicePage - 1) * invoicePageSize, invoicePage * invoicePageSize)
                      .map((invoice) => {
                        const invNumber = invoice.invoice_number || `FG-INV-${new Date(invoice.created_at).getFullYear()}-${invoice.id.slice(0, 6).toUpperCase()}`;
                        const isPaid = invoice.invoice_status === 'paid';
                        const isVoid = invoice.invoice_status === 'void';
                        return (
                          <div
                            key={invoice.id}
                            className="rounded-xl border border-border/70 bg-card p-4 space-y-3 hover:border-primary/40 transition-colors shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono text-xs font-bold text-foreground block">
                                  {invNumber}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {formatDate(invoice.created_at)}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase ${
                                  isPaid
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                    : isVoid
                                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                }`}
                              >
                                {invoice.invoice_status}
                              </Badge>
                            </div>

                            <div className="pt-2 border-t border-border/50 flex justify-between items-end">
                              <div>
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Total Amount</p>
                                <p className="text-base font-extrabold text-foreground font-mono">
                                  {formatPrice(invoice.amount_minor, invoice.currency_code)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-medium gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setSelectedOfficialInvoice(invoice as unknown as OfficialInvoiceData);
                                  setIsOfficialInvoiceModalOpen(true);
                                }}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                View Receipt
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Section D: Subscription Audit & Lifecycle Timeline (Foldable) */}
            <AccordionItem value="audit" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Subscription Timeline & Audit Logs
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Security audit logs of plan adjustments and verification events
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">Recent lifecycle events and billing state changes</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchEvents()}
                    disabled={isEventsLoading}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isEventsLoading ? 'animate-spin' : ''}`} />
                    Refresh Logs
                  </Button>
                </div>

                {recentEvents.length === 0 ? (
                  <div className="rounded-lg bg-muted/20 p-6 text-center space-y-1.5 border border-dashed border-border">
                    <Clock className="h-6 w-6 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-xs font-semibold text-muted-foreground">No plan adjustments or verification events recorded yet.</p>
                    <p className="text-[11px] text-muted-foreground">Events appear automatically as checkouts are initiated, plans adjusted, or payments reconciled.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentEvents.map((event) => {
                      const isPlanChange = event.event_type.includes('plan') || event.event_type.includes('downgrade') || event.event_type.includes('upgrade');
                      const isPayment = event.event_type.includes('payment') || event.event_type.includes('checkout');
                      return (
                        <div
                          key={event.id}
                          className="rounded-lg border border-border/50 bg-muted/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              {isPlanChange ? <Sparkles className="h-3 w-3" /> : isPayment ? <Receipt className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-semibold text-foreground font-mono capitalize">
                                {event.event_type.replace(/_/g, ' ')}
                              </span>
                              {event.details && typeof event.details === 'object' && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-md">
                                  {Object.entries(event.details)
                                    .slice(0, 4)
                                    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                                    .join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                            {new Date(event.created_at).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Official Subscription Invoice Slide-Over / Modal */}
          <OfficialSubscriptionInvoiceModal
            isOpen={isOfficialInvoiceModalOpen}
            onClose={() => setIsOfficialInvoiceModalOpen(false)}
            invoice={selectedOfficialInvoice}
            companyName={activeCompany?.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
