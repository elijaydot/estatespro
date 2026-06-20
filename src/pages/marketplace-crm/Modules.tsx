import { Link } from 'react-router-dom';
import { CrmWorkspace, CRM_NAV_ITEMS } from '@/components/marketplace-crm/CrmWorkspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MarketplaceCrmModulesPage() {
  return (
    <CrmWorkspace title="Modules" subtitle="All CRM modules in Zoho order for unified execution.">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CRM_NAV_ITEMS.filter((item) => item.label !== 'Overview' && item.label !== 'Modules').map((module) => (
          <Card key={module.href} className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <module.icon className="h-4 w-4" />
                {module.label}
              </CardTitle>
              <CardDescription>Operational workspace for {module.label.toLowerCase()}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={module.href} className="text-sm text-primary hover:underline">
                Open module
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </CrmWorkspace>
  );
}
