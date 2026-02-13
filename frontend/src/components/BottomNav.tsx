import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, TrendingUp, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

export function BottomNav() {
  const { t } = useTranslation();

  const links = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/workouts', icon: Dumbbell, label: t('nav.workouts') },
    { to: '/progress', icon: TrendingUp, label: t('nav.progress') },
    { to: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2.5 px-3 text-[10px] font-medium min-w-[64px]',
                isActive ? 'text-blue-500' : 'text-zinc-600 dark:text-zinc-500'
              )
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
