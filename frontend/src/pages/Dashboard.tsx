import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Flame, Dumbbell, CalendarDays, Trophy, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../auth/AuthProvider';
import { useSettings } from '../context/SettingsContext';
import { getStreak, getWeeklyStats, getVolumeStats, getWorkouts } from '../lib/api';
import { convertWeight } from '../lib/units';
import type { StreakData, WeeklyData, VolumeData, Workout } from '../types';
import { formatDate } from '../lib/date';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { fullName } = useAuth();
  const { settings } = useSettings();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData[]>([]);
  const [volume, setVolume] = useState<VolumeData[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#f1f5f9',
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
  const weeklyGoal = 4;
  const weeklyProgress = Math.min((totalWeeklyWorkouts / weeklyGoal) * 100, 100);

  const volumeConverted = volume.map((v) => ({
    ...v,
    volume: settings.weightUnit === 'lbs' ? Math.round(convertWeight(v.volume, 'kg', 'lbs')) : v.volume,
  }));

  // Calculate volume trend percentage
  const volumeTrend = volumeConverted.length >= 2
    ? Math.round(((volumeConverted[volumeConverted.length - 1].volume - volumeConverted[volumeConverted.length - 2].volume) / (volumeConverted[volumeConverted.length - 2].volume || 1)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('dashboard.greeting', { name: firstName })}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
          {formatDate(new Date().toISOString(), 'longNoYear', i18n.language)}
        </p>
      </div>

      {/* Stats grid - 2x2 bento */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('dashboard.streak')}</span>
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">{streak?.current || 0}</span>
            <span className="text-slate-500 text-sm ml-1 font-medium">{t('common.days')}</span>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('dashboard.thisWeek')}</span>
            <Dumbbell className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">{totalWeeklyWorkouts}</span>
              <span className="text-slate-500 text-sm font-medium">/ {weeklyGoal}</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('dashboard.thisMonth')}</span>
            <CalendarDays className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">{totalMonthWorkouts}</span>
            <span className="text-slate-500 text-sm ml-1 font-medium">{t('common.workouts')}</span>
          </div>
        </div>

        {/* Best Streak */}
        <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('dashboard.bestStreak')}</span>
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">{streak?.longest || 0}</span>
            <span className="text-slate-500 text-sm ml-1 font-medium">{t('common.days')}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Activity bar chart */}
        <section className="bg-white dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">{t('dashboard.thisWeek')}</h2>
          {weekly.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekly}>
                <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                <Bar
                  dataKey="count"
                  barSize={28}
                  radius={[6, 6, 0, 0]}
                  fill="#1e293b"
                  shape={(props: unknown) => {
                    const { x, y, width, height, payload } = props as {
                      x: number;
                      y: number;
                      width: number;
                      height: number;
                      payload: { count: number };
                    };
                    const isActive = payload.count > 0;
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        rx={6}
                        ry={6}
                        fill={isActive ? '#6366f1' : '#1e293b'}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">{t('dashboard.noWorkoutsThisWeek')}</p>
          )}
        </section>

        {/* Volume trend */}
        <section className="bg-white dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('dashboard.volume')}</h2>
            {volumeTrend !== 0 && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                {volumeTrend > 0 ? '+' : ''}{volumeTrend}%
              </span>
            )}
          </div>
          {volumeConverted.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={volumeConverted}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(99, 102, 241, 0.2)" />
                    <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value.toLocaleString()} ${settings.weightUnit}`, 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">{t('dashboard.startLogging')}</p>
          )}
        </section>
      </div>

      {/* Recent workouts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('dashboard.recent')}</h2>
          <Link
            to="/workouts"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {recentWorkouts.length > 0 ? (
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <Link
                key={w._id}
                to={`/workouts/${w._id}`}
                className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all active:scale-[0.98] hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{w.title}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {formatDate(w.date, 'short', i18n.language)} &bull; {t('dashboard.exerciseCount', { count: w.exercises.length })}
                  </p>
                </div>
                <ChevronRight className="text-slate-400 dark:text-slate-600 w-4 h-4 shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 text-sm text-center">{t('dashboard.noWorkoutsYet')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
