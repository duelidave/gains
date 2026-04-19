import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, ClipboardList, TrendingUp, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { useDraft } from '../context/DraftContext';

export function BottomNav() {
  const { t } = useTranslation();
  const { hasDraft } = useDraft();

  const links = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard'), dot: false },
    {
      to: hasDraft ? '/workouts/new' : '/workouts',
      icon: Dumbbell,
      label: t('nav.workouts'),
      dot: hasDraft,
    },
    { to: '/plans', icon: ClipboardList, label: t('nav.plans'), dot: false },
    { to: '/progress', icon: TrendingUp, label: t('nav.progress'), dot: false },
    { to: '/profile', icon: User, label: t('nav.profile'), dot: false },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 w-full z-50 rounded-t-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-around items-center h-20 px-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {links.map(({ to, icon: Icon, label, dot }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center transition-all active:scale-90 duration-200',
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-300',
            )
          }
        >
          <span className="relative mb-1">
            <Icon size={20} />
            {dot && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </span>
          <span className="text-[10px] font-medium tracking-wide">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
