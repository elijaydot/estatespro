import { MessageSquare, Mail, Clock, Megaphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CommunicationOverviewProps {
  activeCount: number;
  unreadCount: number;
  pendingResponseCount: number;
  broadcastCount: number;
}

export function CommunicationOverview({
  activeCount,
  unreadCount,
  pendingResponseCount,
  broadcastCount,
}: CommunicationOverviewProps) {
  const cards = [
    {
      title: 'Active Conversations',
      value: activeCount,
      subtitle: 'Resident threads with recent activity',
      icon: MessageSquare,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      title: 'Unread Messages',
      value: unreadCount,
      subtitle: unreadCount > 0 ? 'Inbound messages awaiting review' : 'All inbound messages read',
      icon: Mail,
      iconColor: unreadCount > 0 ? 'text-amber-600' : 'text-slate-600',
      bgColor: unreadCount > 0 ? 'bg-amber-50' : 'bg-slate-50',
      borderColor: unreadCount > 0 ? 'border-amber-200' : 'border-slate-100',
      highlight: unreadCount > 0,
    },
    {
      title: 'Pending Responses',
      value: pendingResponseCount,
      subtitle: pendingResponseCount > 0 ? 'Residents awaiting staff reply' : 'No overdue responses',
      icon: Clock,
      iconColor: pendingResponseCount > 0 ? 'text-rose-600' : 'text-emerald-600',
      bgColor: pendingResponseCount > 0 ? 'bg-rose-50' : 'bg-emerald-50',
      borderColor: pendingResponseCount > 0 ? 'border-rose-200' : 'border-emerald-100',
      highlight: pendingResponseCount > 0,
    },
    {
      title: 'Broadcast Deliveries',
      value: broadcastCount,
      subtitle: 'Portfolio & property announcements',
      icon: Megaphone,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
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
