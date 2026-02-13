import { useEffect, useState } from 'react';
import {
  XAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, Trophy, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/EmptyState';
import { getExerciseNames, getProgress } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { convertWeight } from '../lib/units';
import type { ProgressPoint } from '../types';

const periods = ['1M', '3M', '6M', '1Y', 'All'] as const;

export default function Progress() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { dark } = useTheme();
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [period, setPeriod] = useState<string>('3M');
  const [data, setData] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingNames, setLoadingNames] = useState(true);

  const tooltipStyle = {
    backgroundColor: dark ? '#27272a' : '#ffffff',
    border: `1px solid ${dark ? '#3f3f46' : '#e4e4e7'}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: dark ? '#fafafa' : '#18181b',
  };

  useEffect(() => {
    getExerciseNames()
      .then(setExerciseNames)
      .catch(() => {})
      .finally(() => setLoadingNames(false));
  }, []);

  useEffect(() => {
    if (!selectedExercise) return;
    setLoading(true);
    getProgress(selectedExercise, period)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [selectedExercise, period]);

  const filtered = searchQuery
    ? exerciseNames.filter((n) => n.toLowerCase().includes(searchQuery.toLowerCase()))
    : exerciseNames;

  const dataConverted = data.map((p) => ({
    ...p,
    value: settings.weightUnit === 'lbs' ? Number(convertWeight(p.value, 'kg', 'lbs').toFixed(1)) : p.value,
  }));

  const prs = dataConverted.filter((p) => p.isPR);

  return (
    <div className="space-y-5 min-w-0 w-full">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t('progress.title')}</h1>

      {/* Exercise search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10"
        />
        <Input
          className="pl-9"
          placeholder={t('progress.searchExercise')}
          value={searchQuery || selectedExercise}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
            if (!e.target.value) setSelectedExercise('');
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-xl">
            {filtered.map((name) => (
              <button
                key={name}
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                onMouseDown={() => {
                  setSelectedExercise(name);
                  setSearchQuery('');
                  setShowDropdown(false);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingNames ? (
        <Skeleton className="h-64" />
      ) : !selectedExercise ? (
        <EmptyState
          icon={<TrendingUp size={40} />}
          title={t('progress.selectExercise')}
          description={t('progress.selectExerciseDescription')}
        />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : dataConverted.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={40} />}
          title={t('progress.noData')}
          description={t('progress.noDataDescription', { exercise: selectedExercise })}
        />
      ) : (
        <>
          {/* Period selector */}
          <div className="flex gap-1.5">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chart */}
          <Card>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">{selectedExercise}</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dataConverted}>
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: dark ? '#a1a1aa' : '#71717a', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.slice(5)}
                  interval="preserveStartEnd"
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value} ${settings.weightUnit}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#progressGradient)"
                  dot={false}
                />
                {prs.map((pr, i) => (
                  <ReferenceDot
                    key={i}
                    x={pr.date}
                    y={pr.value}
                    r={6}
                    fill="#eab308"
                    stroke={dark ? '#18181b' : '#ffffff'}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            {prs.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                {t('progress.personalRecord')}
              </div>
            )}
          </Card>

          {/* PR List */}
          {prs.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} className="text-yellow-500" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('progress.personalRecords')}</p>
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {prs.map((pr, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{pr.date}</span>
                    <Badge variant="warning">
                      <span className="tabular-nums font-bold">{pr.value} {settings.weightUnit}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
