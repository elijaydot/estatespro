import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/contexts/useI18n';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { PageContainer, PageHeader, PageActions } from '@/design-system/LayoutFramework';

export function CrmWorkspace({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();

  // Map common English CRM titles to their localized keys if applicable
  const localizedTitle = (() => {
    const lower = title.toLowerCase();
    if (lower === 'overview') return t('overview', title);
    if (lower === 'leads') return t('crm_leads_title', title);
    if (lower === 'deals') return t('crm_deals_title', title);
    if (lower === 'projects') return t('crm_projects_title', title);
    if (lower === 'contacts') return t('crm_contacts_title', title);
    if (lower === 'accounts') return t('crm_accounts_title', title);
    if (lower === 'visits') return t('crm_visits_title', title);
    if (lower === 'meetings') return t('crm_meetings_title', title);
    if (lower === 'tasks') return t('crm_tasks_title', title);
    if (lower === 'calls') return t('crm_calls_title', title);
    if (lower === 'automation') return t('crm_automation_title', title);
    if (lower === 'documents') return t('crm_documents_title', title);
    if (lower === 'reports') return t('crm_reports_title', title);
    return title;
  })();

  return (
    <PageContainer maxWidth="7xl" className="space-y-6">
      <div className="space-y-3">
        <Breadcrumb className="overflow-x-auto pb-0.5">
          <BreadcrumbList className="w-max flex-nowrap text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/marketplace/manage">{t('workspace_marketplace', 'Marketplace')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/marketplace/crm">{t('workspace_crm', 'CRM')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{localizedTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <PageHeader
          title={localizedTitle}
          description={subtitle}
          actions={actions ? <PageActions>{actions}</PageActions> : undefined}
        />
      </div>

      <section className="space-y-6">{children}</section>
    </PageContainer>
  );
}
