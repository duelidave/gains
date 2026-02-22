import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, ClipboardList, TrendingUp, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { hasChatSession } from '../lib/chatSession';

export function Sidebar() {
  const { t } = useTranslation();
  const hasSession = hasChatSession();

  const links = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard'), dot: false },
    { to: '/workouts', icon: Dumbbell, label: t('nav.workouts'), dot: hasSession },
    { to: '/plans', icon: ClipboardList, label: t('nav.plans'), dot: false },
    { to: '/progress', icon: TrendingUp, label: t('nav.progress'), dot: false },
    { to: '/profile', icon: User, label: t('nav.profile'), dot: false },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 h-screen bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
          <Dumbbell size={20} className="text-blue-500" />
          GAINS
        </h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label, dot }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-blue-500'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50'
              )
            }
          >
            <span className="relative">
              <Icon size={18} />
              {dot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500" />}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
