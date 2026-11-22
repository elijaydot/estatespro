import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Wrench,
  MessageSquare,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';

export interface MobileBottomNavProps {
  onOpenMenu: () => void;
  className?: string;
}

export function MobileBottomNav({ onOpenMenu, className }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: unreadNotifications = 0 } = useUnreadNotificationsCount();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      active: location.pathname === '/dashboard',
      onClick: () => navigate('/dashboard'),
    },
    {
      id: 'payments',
      label: 'Rent & Pay',
      icon: CreditCard,
      active: location.pathname.startsWith('/payments'),
      onClick: () => navigate('/payments?view=collections'),
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: Wrench,
      active: location.pathname.startsWith('/maintenance'),
      onClick: () => navigate('/maintenance'),
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      active: location.pathname.startsWith('/messages'),
      onClick: () => navigate('/messages'),
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: Menu,
      active: false,
      onClick: onOpenMenu,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-1 dark:border-slate-800 dark:bg-slate-900/95 shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                'flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-lg text-xs font-medium transition-colors relative',
                item.active
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', item.active && 'stroke-[2.25]')} />
                {item.id === 'messages' && unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
