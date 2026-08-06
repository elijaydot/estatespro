import type { ReactNode } from 'react';

type DashboardAIInsightsPanelProps = {
  smartSearch: ReactNode;
  financial: ReactNode;
  predictive: ReactNode;
};

function InsightSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`dashboard-ai-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3 id={`dashboard-ai-${label.toLowerCase().replace(/\s+/g, '-')}`} className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </h3>
      {children}
    </section>
  );
}

export function DashboardAIInsightsPanel({ smartSearch, financial, predictive }: DashboardAIInsightsPanelProps) {
  return (
    <section
      aria-labelledby="dashboard-ai-title"
      className="dashboard-ai-glass overflow-hidden rounded-2xl p-4 sm:p-6"
      style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Decision support</p>
        <h2 id="dashboard-ai-title" className="mt-1 text-xl font-semibold text-foreground">AI Insights</h2>
      </div>
      <div className="space-y-8">
        <InsightSection label="Smart Search">{smartSearch}</InsightSection>
        <InsightSection label="Financial Intelligence">{financial}</InsightSection>
        <InsightSection label="Predictive Analytics">{predictive}</InsightSection>
      </div>
    </section>
  );
}