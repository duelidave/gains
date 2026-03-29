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
    { to: hasSession ? '/workouts/new' : '/workouts', icon: Dumbbell, label: t('nav.workouts'), dot: hasSession },
    { to: '/plans', icon: ClipboardList, label: t('nav.plans'), dot: false },
    { to: '/progress', icon: TrendingUp, label: t('nav.progress'), dot: false },
    { to: '/profile', icon: User, label: t('nav.profile'), dot: false },
  ];

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 fixed left-0 top-0 z-40">
      <div className="p-6">
        <h1 className="text-2xl font-black tracking-tighter text-indigo-400">Pulse Fitness</h1>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {links.map(({ to, icon: Icon, label, dot }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg mx-2',
                isActive
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-500'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50'
              )
            }
          >
            <span className="relative">
              <Icon size={18} />
              {dot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500" />}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
