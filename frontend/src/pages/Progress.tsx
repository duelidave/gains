import { useEffect, useState } from 'react';
import {
  XAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, Trophy, Search, GitMerge, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog, DialogTitle } from '../components/ui/Dialog';
import { EmptyState } from '../components/EmptyState';
import { useNavigate } from 'react-router-dom';
import { getExerciseNames, getWorkoutTitles, getProgress, mergeExercises } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { convertWeight } from '../lib/units';
import type { ProgressPoint } from '../types';

const periods = ['1M', '3M', '6M', '1Y', 'All'] as const;
type ChartMode = 'weight' | 'e1rm';

export default function Progress() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { dark } = useTheme();
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [period, setPeriod] = useState<string>('3M');
  const [chartMode, setChartMode] = useState<ChartMode>('weight');
  const [data, setData] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingNames, setLoadingNames] = useState(true);
  const [workoutTitles, setWorkoutTitles] = useState<string[]>([]);
  const [titleFilter, setTitleFilter] = useState('');
  const [mergeFrom, setMergeFrom] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const tooltipStyle = {
    backgroundColor: dark ? '#27272a' : '#ffffff',
    border: `1px solid ${dark ? '#3f3f46' : '#e4e4e7'}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: dark ? '#fafafa' : '#18181b',
  };

  const fetchNames = (workoutTitle?: string) => {
    setLoadingNames(true);
    getExerciseNames(workoutTitle || undefined)
      .then(setExerciseNames)
      .catch(() => {})
      .finally(() => setLoadingNames(false));
  };

  useEffect(() => {
    getWorkoutTitles().then(setWorkoutTitles).catch(() => {});
    fetchNames();
  }, []);

  useEffect(() => {
    fetchNames(titleFilter);
    setSelectedExercise('');
    setSearchQuery('');
  }, [titleFilter]);

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
    e1rm: p.e1rm != null
      ? (settings.weightUnit === 'lbs' ? Number(convertWeight(p.e1rm, 'kg', 'lbs').toFixed(1)) : Math.round(p.e1rm * 10) / 10)
      : 0,
    bestSetWeight: p.bestSet?.weight != null
      ? (settings.weightUnit === 'lbs' ? Number(convertWeight(p.bestSet.weight, 'kg', 'lbs').toFixed(1)) : p.bestSet.weight)
      : 0,
  }));

  const prs = chartMode === 'e1rm'
    ? dataConverted.filter((p) => p.isE1rmPR)
    : dataConverted.filter((p) => p.isPR);

  const chartDataKey = chartMode === 'e1rm' ? 'e1rm' : 'value';

  const handleMerge = async (to: string) => {
    if (!mergeFrom || mergeFrom === to) return;
    setMerging(true);
    try {
      await mergeExercises(mergeFrom, to);
      setMergeFrom(null);
      if (selectedExercise === mergeFrom) setSelectedExercise(to);
      fetchNames(titleFilter || undefined);
    } catch {
      // ignore
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-5 min-w-0 w-full">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t('progress.title')}</h1>

      {/* Workout type filter */}
      {workoutTitles.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTitleFilter('')}
            className={`shrink-0 py-1.5 px-3 rounded-full text-xs font-medium transition-colors ${
              !titleFilter
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
            }`}
          >
            {t('progress.all')}
          </button>
          {workoutTitles.map((title) => (
            <button
              key={title}
              onClick={() => setTitleFilter(titleFilter === title ? '' : title)}
              className={`shrink-0 py-1.5 px-3 rounded-full text-xs font-medium transition-colors ${
                titleFilter === title
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      )}

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
              <div
                key={name}
                className="flex items-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <button
                  type="button"
                  className="flex-1 text-left px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50"
                  onMouseDown={() => {
                    setSelectedExercise(name);
                    setSearchQuery('');
                    setShowDropdown(false);
                  }}
                >
                  {name}
                </button>
                <button
                  type="button"
                  className="px-2 py-2.5 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400"
                  title={t('progress.mergeExercise')}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setMergeFrom(name);
                    setShowDropdown(false);
                  }}
                >
                  <GitMerge size={14} />
                </button>
              </div>
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

          {/* Chart mode toggle */}
          <div className="flex gap-1.5">
            {(['weight', 'e1rm'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  chartMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
                }`}
              >
                {mode === 'weight' ? t('progress.weight') : t('progress.estimatedOneRM')}
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
                  formatter={(value: number) => [
                    `${value} ${settings.weightUnit}`,
                    chartMode === 'e1rm' ? 'est. 1RM' : '',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey={chartDataKey}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#progressGradient)"
                  dot={false}
                />
                {prs.map((pr, i) => (
                  <ReferenceDot
                    key={i}
                    x={pr.date}
                    y={chartMode === 'e1rm' ? pr.e1rm : pr.value}
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
                  <div
                    key={i}
                    className={`flex items-center justify-between py-2.5 ${pr.workoutId ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-4 px-4 rounded-lg transition-colors' : ''}`}
                    onClick={() => pr.workoutId && navigate(`/workouts/${pr.workoutId}?highlight=${encodeURIComponent(selectedExercise)}`)}
                  >
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      {pr.date}
                      {pr.workoutId && <ExternalLink size={12} className="text-zinc-400" />}
                    </span>
                    <Badge variant="warning">
                      <span className="tabular-nums font-bold">
                        {chartMode === 'e1rm' ? pr.e1rm : pr.value} {settings.weightUnit}
                      </span>
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* History Table */}
          <Card>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              {t('progress.history')}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-600 dark:text-zinc-500 text-xs uppercase tracking-wide">
                    <th className="text-left py-2 pr-4 font-medium">{t('progress.date')}</th>
                    <th className="text-left py-2 pr-4 font-medium">{t('progress.sets')}</th>
                    <th className="text-right py-2 pr-4 font-medium">{t('progress.weight')}</th>
                    <th className="text-right py-2 font-medium">{t('progress.e1rm')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...dataConverted].reverse().map((point, i) => (
                    <tr
                      key={i}
                      className={`border-t border-zinc-200 dark:border-zinc-800 ${point.workoutId ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors' : ''}`}
                      onClick={() => point.workoutId && navigate(`/workouts/${point.workoutId}?highlight=${encodeURIComponent(selectedExercise)}`)}
                    >
                      <td className="py-2.5 pr-4 text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {point.date.slice(5)}
                      </td>
                      <td className="py-2.5 pr-4 text-zinc-900 dark:text-zinc-50 tabular-nums">
                        {point.bestSet
                          ? `${point.bestSet.setsCount}x${point.bestSet.reps}`
                          : '-'}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-zinc-900 dark:text-zinc-50 font-medium tabular-nums">
                        {point.bestSetWeight > 0
                          ? `${point.bestSetWeight} ${settings.weightUnit}`
                          : '-'}
                      </td>
                      <td className="py-2.5 text-right text-zinc-900 dark:text-zinc-50 font-medium tabular-nums">
                        {point.e1rm > 0
                          ? `${point.e1rm} ${settings.weightUnit}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Merge Exercise Dialog */}
      <Dialog open={!!mergeFrom} onClose={() => setMergeFrom(null)}>
        <DialogTitle>{t('progress.mergeExercise')}</DialogTitle>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
          {t('progress.mergeInto', { from: mergeFrom })}
        </p>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {exerciseNames
            .filter((n) => n !== mergeFrom)
            .map((name) => (
              <button
                key={name}
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                onClick={() => handleMerge(name)}
                disabled={merging}
              >
                {name}
              </button>
            ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="default" size="sm" onClick={() => setMergeFrom(null)} disabled={merging}>
            {t('common.cancel')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
