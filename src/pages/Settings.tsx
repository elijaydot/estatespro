import { useEffect, useState, useMemo } from "react";
import {
  Settings as SettingsIcon,
  Globe,
  Building2,
  Palette,
  FileText,
  Bell,
  ClipboardCheck,
  User,
  CreditCard,
  Shield,
  BellRing,
  Search,
  X,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useActiveCompany } from "@/contexts/useActiveCompany";
import { useSettings } from "@/contexts/useSettings";
import { useSaasAccess } from "@/hooks/useSaasAccess";
import { PageContainer, PageHeader, PageActions } from "@/design-system/LayoutFramework";

import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { LeaseDocumentSettings } from "@/components/settings/LeaseDocumentSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { InspectionChecklistSettings } from "@/components/settings/InspectionChecklistSettings";
import { PaymentSettings } from "@/components/settings/PaymentSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { BillingPlansSettings } from "@/components/settings/BillingPlansSettings";
import { AlertSettings } from "@/components/settings/AlertSettings";

export interface SettingsTabItem {
  id: string;
  label: string;
  pillar: "Account" | "Organization" | "Operations" | "Subscriptions";
  icon: React.ElementType;
  description: string;
  keywords: string[];
}

const tabs: SettingsTabItem[] = [
  {
    id: "profile",
    label: "Profile",
    pillar: "Account",
    icon: User,
    description: "Account details & avatar",
    keywords: ["name", "email", "phone", "avatar", "profile", "contact", "identity"],
  },
  {
    id: "security",
    label: "Security",
    pillar: "Account",
    icon: Shield,
    description: "MFA & account protection",
    keywords: ["mfa", "2fa", "authenticator", "password", "security", "recovery codes", "devices"],
  },
  {
    id: "appearance",
    label: "Appearance",
    pillar: "Account",
    icon: Palette,
    description: "Theme & accent colors",
    keywords: ["theme", "dark mode", "light mode", "color", "accent", "appearance"],
  },
  {
    id: "general",
    label: "General",
    pillar: "Organization",
    icon: Globe,
    description: "Language, regional & currency",
    keywords: ["language", "locale", "ururimi", "kinyarwanda", "french", "swahili", "english", "currency", "rwf", "usd", "kes", "timezone", "kigali", "region", "date format", "country"],
  },
  {
    id: "company",
    label: "Company",
    pillar: "Organization",
    icon: Building2,
    description: "Company details & RDB compliance",
    keywords: ["company", "tin", "rdb", "rra", "kyb", "registration", "license", "director", "address"],
  },
  {
    id: "lease",
    label: "Lease Documents",
    pillar: "Operations",
    icon: FileText,
    description: "PDF styling & bilingual branding",
    keywords: ["lease", "pdf", "contract", "bilingual", "kinyarwanda", "english", "styling", "font"],
  },
  {
    id: "payments",
    label: "Payments",
    pillar: "Operations",
    icon: CreditCard,
    description: "Gateway, MoMo & EBM v2",
    keywords: ["payment", "momo", "mtn", "airtel", "mobile money", "rra", "ebm", "vsdc", "paystack", "stripe", "bank"],
  },
  {
    id: "inspections",
    label: "Inspections",
    pillar: "Operations",
    icon: ClipboardCheck,
    description: "Checklists & room audits",
    keywords: ["inspection", "checklist", "exit", "move in", "move out", "inventory", "condition"],
  },
  {
    id: "billing",
    label: "Billing & Plans",
    pillar: "Subscriptions",
    icon: CreditCard,
    description: "Pricing, access & usage quotas",
    keywords: ["billing", "plan", "subscription", "pricing", "upgrade", "quota", "invoice", "license"],
  },
  {
    id: "alerts",
    label: "Operational Alerts",
    pillar: "Subscriptions",
    icon: BellRing,
    description: "Detection thresholds & alarms",
    keywords: ["alerts", "threshold", "vacant", "overdue", "arrears", "lease expiry", "vendor insurance"],
  },
  {
    id: "notifications",
    label: "Notifications",
    pillar: "Subscriptions",
    icon: Bell,
    description: "Email & SMS channel dispatch",
    keywords: ["notification", "email", "sms", "alert", "reminders", "messages", "in-app"],
  },
];

const tabGroups = [
  { title: "Account", description: "Personal credentials & visual preferences", tabIds: ["profile", "security", "appearance"] },
  { title: "Organization", description: "Company registration & regional format", tabIds: ["general", "company"] },
  { title: "Operations", description: "Lease workflows, payment rails & checklists", tabIds: ["lease", "payments", "inspections"] },
  { title: "Subscriptions", description: "SaaS plan, quota limits & operational alarms", tabIds: ["billing", "alerts", "notifications"] },
];

const PILLARS = [
  { id: "all", label: "All Settings" },
  { id: "Account", label: "Account" },
  { id: "Organization", label: "Organization" },
  { id: "Operations", label: "Operations" },
  { id: "Subscriptions", label: "Subscriptions" },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPillar, setSelectedPillar] = useState<string>("all");

  const { activeCompanyId } = useActiveCompany();
  const { data: companyData } = useCompanySettings(activeCompanyId);
  const { settings: generalSettings } = useSettings();
  const saasAccess = useSaasAccess();
  const planName = saasAccess.data?.activePlanName || "Professional";

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (!requestedTab) return;

    const exists = tabs.some((tab) => tab.id === requestedTab);
    if (exists) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const matchingTabs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return tabs.filter(
      (tab) =>
        tab.label.toLowerCase().includes(q) ||
        tab.description.toLowerCase().includes(q) ||
        tab.pillar.toLowerCase().includes(q) ||
        tab.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  const CurrentIcon = currentTab.icon;

  const mobileTabs = useMemo(() => {
    if (selectedPillar === "all") return tabs;
    return tabs.filter((t) => t.pillar === selectedPillar);
  }, [selectedPillar]);

  return (
    <PageContainer maxWidth="7xl" className="space-y-6 pb-12">
      <PageHeader
        title="Settings & System Configuration"
        description="Personal preferences, Rwandan RDB / RRA compliance, mobile money rails & automation"
        badge={
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Control Center
          </span>
        }
        actions={
          <div className="relative w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search settings (MFA, TIN, MoMo, Currency)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 bg-card border-border rounded-lg text-xs sm:text-sm focus-visible:ring-primary/40 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Instant Search Results Dropdown */}
            {searchQuery.trim() && (
              <div className="absolute z-30 left-0 right-0 mt-2 p-2 bg-card border border-border rounded-lg shadow-lg space-y-1 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-2 py-1">
                  <span>Matching Settings ({matchingTabs.length})</span>
                  <span>Select to open</span>
                </div>
                {matchingTabs.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">
                    No settings found matching "{searchQuery}".
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {matchingTabs.map((tab) => {
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            handleTabChange(tab.id);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-primary/10 hover:text-primary text-left text-xs transition-colors group border border-transparent hover:border-primary/20"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary">
                              <TabIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground group-hover:text-primary truncate">
                                {tab.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {tab.description}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      {/* Mobile Screen Category Selector (< lg) */}
      <div className="lg:hidden space-y-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {PILLARS.map((p) => {
            const isSelected = selectedPillar === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPillar(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Mobile Tab Grid */}
        <div className="grid grid-cols-2 gap-2">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border/70 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-xs font-semibold truncate", isActive && "text-primary-foreground")}>
                    {tab.label}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] truncate",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Desktop Sidebar Navigation (lg:block) */}
        <nav className="hidden lg:block lg:w-64 shrink-0">
          <div className="sticky top-6 space-y-6 bg-card/60 backdrop-blur-sm p-3 rounded-2xl border border-border/70 shadow-sm">
            {tabGroups.map((group) => {
              const groupTabs = tabs.filter((t) => group.tabIds.includes(t.id));
              if (groupTabs.length === 0) return null;

              return (
                <div key={group.title} className="space-y-1">
                  <div className="flex items-center justify-between px-3 py-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
                      {group.title}
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      {groupTabs.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {groupTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all group",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "p-1.5 rounded-lg transition-colors shrink-0",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-muted text-muted-foreground group-hover:text-foreground"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className={cn("text-xs font-semibold truncate", isActive && "text-primary-foreground")}>
                                {tab.label}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] truncate",
                                  isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                                )}
                              >
                                {tab.description}
                              </p>
                            </div>
                          </div>

                          {/* Quick Live Status Indicators */}
                          {tab.id === "company" && (
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              )}
                            >
                              RDB
                            </span>
                          )}
                          {tab.id === "payments" && (
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              )}
                            >
                              MoMo
                            </span>
                          )}
                          {tab.id === "general" && (
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-muted text-muted-foreground border border-border/60"
                              )}
                            >
                              {generalSettings.currencyCode}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Content Panel Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Active Tab Context Header Card */}
          <div className="p-4 rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-muted/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <CurrentIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/60">
                    {currentTab.pillar}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {currentTab.label}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentTab.description}
                </p>
              </div>
            </div>

            {/* Context Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {activeTab === "company" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  RDB Compliant
                </span>
              )}
              {activeTab === "general" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <Globe className="h-3.5 w-3.5" />
                  {generalSettings.currencyCode} • Africa/Kigali
                </span>
              )}
              {activeTab === "billing" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  {planName}
                </span>
              )}
              {activeTab === "payments" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <CreditCard className="h-3.5 w-3.5 text-blue-400" />
                  MTN MoMo & EBM v2
                </span>
              )}
              {activeTab === "security" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  <Shield className="h-3.5 w-3.5 text-indigo-400" />
                  MFA Guard
                </span>
              )}
              {activeTab === "appearance" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/30">
                  <Palette className="h-3.5 w-3.5 text-violet-400" />
                  Visual Theme & Contrast
                </span>
              )}
              {activeTab === "lease" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  Bilingual PDF Templates
                </span>
              )}
              {activeTab === "inspections" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  <ClipboardCheck className="h-3.5 w-3.5 text-teal-400" />
                  Property Audits & Inventories
                </span>
              )}
              {activeTab === "alerts" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <BellRing className="h-3.5 w-3.5 text-rose-400" />
                  Operational SLA Alarms
                </span>
              )}
              {activeTab === "notifications" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  <Bell className="h-3.5 w-3.5 text-sky-400" />
                  Omnichannel Dispatch
                </span>
              )}
            </div>
          </div>

          {/* Active Settings Panel */}
          <div className="transition-all duration-200">
            {activeTab === "profile" && <ProfileSettings />}
            {activeTab === "security" && <SecuritySettingsWrapper />}
            {activeTab === "general" && <GeneralSettings />}
            {activeTab === "company" && <CompanySettingsWrapper />}
            {activeTab === "appearance" && <AppearanceSettings />}
            {activeTab === "lease" && <LeaseDocumentSettings />}
            {activeTab === "payments" && <PaymentSettingsWrapper />}
            {activeTab === "billing" && <BillingPlansSettingsWrapper />}
            {activeTab === "notifications" && <NotificationSettings />}
            {activeTab === "alerts" && <AlertSettings />}
            {activeTab === "inspections" && <InspectionChecklistWrapper />}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function CompanySettingsWrapper() {
  return (
    <div className="space-y-6">
      <CompanySettings />
    </div>
  );
}

function PaymentSettingsWrapper() {
  return (
    <div className="space-y-6">
      <PaymentSettings />
    </div>
  );
}

function InspectionChecklistWrapper() {
  return (
    <div className="space-y-6">
      <InspectionChecklistSettings />
    </div>
  );
}

function SecuritySettingsWrapper() {
  return (
    <div className="space-y-6">
      <SecuritySettings />
    </div>
  );
}

function BillingPlansSettingsWrapper() {
  return (
    <div className="space-y-6">
      <BillingPlansSettings />
    </div>
  );
}
