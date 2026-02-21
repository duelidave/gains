import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../auth/AuthProvider';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { getStreak, getWeeklyStats, getVolumeStats, getWorkouts } from '../lib/api';
import { convertWeight } from '../lib/units';
import type { StreakData, WeeklyData, VolumeData, Workout } from '../types';
import { formatDate } from '../lib/date';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { fullName } = useAuth();
  const { settings } = useSettings();
  const { dark } = useTheme();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData[]>([]);
  const [volume, setVolume] = useState<VolumeData[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const tooltipStyle = {
    backgroundColor: dark ? '#27272a' : '#ffffff',
    border: `1px solid ${dark ? '#3f3f46' : '#e4e4e7'}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: dark ? '#fafafa' : '#18181b',
  };

  useEffect(() => {
    Promise.allSettled([
      getStreak(),
      getWeeklyStats(),
      getVolumeStats(),
      getWorkouts(1, 5),
    ])
      .then(([streakRes, weeklyRes, volumeRes, workoutsRes]) => {
        if (streakRes.status === 'fulfilled') setStreak(streakRes.value);
        if (weeklyRes.status === 'fulfilled') setWeekly(weeklyRes.value);
        if (volumeRes.status === 'fulfilled') setVolume(volumeRes.value);
        if (workoutsRes.status === 'fulfilled') setRecentWorkouts(workoutsRes.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const firstName = fullName?.split(' ')[0] || 'there';
  const totalWeeklyWorkouts = weekly.reduce((sum, d) => sum + d.count, 0);
  const totalMonthWorkouts = recentWorkouts.length;

  const volumeConverted = volume.map((v) => ({
    ...v,
    volume: settings.weightUnit === 'lbs' ? Math.round(convertWeight(v.volume, 'kg', 'lbs')) : v.volume,
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t('dashboard.greeting', { name: firstName })}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {formatDate(new Date().toISOString(), 'longNoYear', i18n.language)}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">{t('dashboard.streak')}</p>
          <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{streak?.current || 0}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-0.5">{t('common.days')}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">{t('dashboard.thisWeek')}</p>
          <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{totalWeeklyWorkouts}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-0.5">{t('common.workouts')}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">{t('dashboard.thisMonth')}</p>
          <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{totalMonthWorkouts}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-0.5">{t('common.workouts')}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">{t('dashboard.bestStreak')}</p>
          <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{streak?.longest || 0}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-0.5">{t('common.days')}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly bar chart */}
        <Card>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">{t('dashboard.thisWeek')}</p>
          {weekly.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekly}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: dark ? '#a1a1aa' : '#71717a', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: dark ? '#27272a' : '#f4f4f5' }} />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  barSize={24}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-500 text-sm text-center py-10">{t('dashboard.noWorkoutsThisWeek')}</p>
          )}
        </Card>

        {/* Volume trend */}
        <Card>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">{t('dashboard.volume')}</p>
          {volumeConverted.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={volumeConverted}>
                <XAxis
                  dataKey="week"
                  tick={{ fill: dark ? '#a1a1aa' : '#71717a', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value.toLocaleString()} ${settings.weightUnit}`, 'Volume']}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-500 text-sm text-center py-10">{t('dashboard.startLogging')}</p>
          )}
        </Card>
      </div>

      {/* Recent workouts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('dashboard.recent')}</h2>
          <Link
            to="/workouts"
            className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 font-medium"
          >
            {t('dashboard.viewAll')} <ArrowRight size={12} />
          </Link>
        </div>
        {recentWorkouts.length > 0 ? (
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <Link
                key={w._id}
                to={`/workouts/${w._id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">{w.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {formatDate(w.date, 'short', i18n.language)}
                  </p>
                </div>
                <Badge>{t('dashboard.exerciseCount', { count: w.exercises.length })}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-zinc-600 dark:text-zinc-500 text-sm text-center py-6">{t('dashboard.noWorkoutsYet')}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
