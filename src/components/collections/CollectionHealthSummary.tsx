import { DollarSign, Percent, AlertCircle, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CollectionHealthSummaryProps {
  collectedThisMonth: number;
  expectedThisMonth: number;
  collectionRate: number;
  totalOutstanding: number;
  accountsRequiringFollowUp: number;
  currency?: string;
}

export function CollectionHealthSummary({
  collectedThisMonth,
  expectedThisMonth,
  collectionRate,
  totalOutstanding,
  accountsRequiringFollowUp,
  currency = 'RWF',
}: CollectionHealthSummaryProps) {
  const isHealthyRate = collectionRate >= 90;
  const hasArrears = totalOutstanding > 0;

  const cards = [
    {
      title: 'Collected This Month',
      value: `${currency} ${collectedThisMonth.toLocaleString()}`,
      subtitle: `Target: ${currency} ${expectedThisMonth.toLocaleString()}`,
      icon: DollarSign,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
    {
      title: 'Collection Rate',
      value: `${collectionRate.toFixed(1)}%`,
      subtitle: isHealthyRate ? 'Optimal portfolio velocity' : 'Requires intervention',
      icon: Percent,
      iconColor: isHealthyRate ? 'text-blue-600' : 'text-amber-600',
      bgColor: isHealthyRate ? 'bg-blue-50' : 'bg-amber-50',
      borderColor: isHealthyRate ? 'border-blue-100' : 'border-amber-200',
    },
    {
      title: 'Outstanding Balances',
      value: `${currency} ${totalOutstanding.toLocaleString()}`,
      subtitle: hasArrears ? 'Active overdue receivables' : 'Zero outstanding balance',
      icon: AlertCircle,
      iconColor: hasArrears ? 'text-rose-600' : 'text-emerald-600',
      bgColor: hasArrears ? 'bg-rose-50' : 'bg-emerald-50',
      borderColor: hasArrears ? 'border-rose-200' : 'border-emerald-100',
      highlight: hasArrears,
    },
    {
      title: 'Accounts Requiring Follow-Up',
      value: accountsRequiringFollowUp,
      subtitle: accountsRequiringFollowUp > 0 ? 'Accounts flagged for collection' : 'All accounts settled',
      icon: Users,
      iconColor: accountsRequiringFollowUp > 0 ? 'text-amber-600' : 'text-slate-600',
      bgColor: accountsRequiringFollowUp > 0 ? 'bg-amber-50' : 'bg-slate-50',
      borderColor: accountsRequiringFollowUp > 0 ? 'border-amber-200' : 'border-slate-100',
      highlight: accountsRequiringFollowUp > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={cn(
              'border transition-all duration-150 shadow-sm hover:shadow-md bg-white',
              card.highlight && card.borderColor
            )}
          >
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </p>
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                  {card.value}
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">{card.subtitle}</p>
              </div>
              <div className={cn('p-2.5 rounded-lg shrink-0', card.bgColor)}>
                <Icon className={cn('w-5 h-5', card.iconColor)} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
