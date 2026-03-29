import { useEffect, useState } from 'react';
import {
  XAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Area,
  AreaChart,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Trophy, Dumbbell, ChevronDown, GitMerge, ExternalLink, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Dialog, DialogTitle } from '../components/ui/Dialog';
import { EmptyState } from '../components/EmptyState';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getExerciseNames, getWorkoutTitles, getProgress, mergeExercises } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { convertWeight } from '../lib/units';
import type { ProgressPoint } from '../types';

const periods = ['1M', '3M', '6M', '1Y', 'All'] as const;
type ChartMode = 'weight' | 'e1rm';

export default function Progress() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState(searchParams.get('exercise') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [period, setPeriod] = useState<string>(searchParams.get('period') || '3M');
  const [chartMode, setChartMode] = useState<ChartMode>((searchParams.get('mode') as ChartMode) || 'weight');
  const [data, setData] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingNames, setLoadingNames] = useState(true);
  const [workoutTitles, setWorkoutTitles] = useState<string[]>([]);
  const [titleFilter, setTitleFilter] = useState(searchParams.get('title') || '');
  const [mergeFrom, setMergeFrom] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#f8fafc',
  };

  const fetchNames = (workoutTitle?: string) => {
    setLoadingNames(true);
    getExerciseNames(workoutTitle || undefined)
      .then(setExerciseNames)
      .catch(() => {})
      .finally(() => setLoadingNames(false));
  };

  // Sync state to URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedExercise) params.set('exercise', selectedExercise);
    if (period !== '3M') params.set('period', period);
    if (chartMode !== 'weight') params.set('mode', chartMode);
    if (titleFilter) params.set('title', titleFilter);
    setSearchParams(params, { replace: true });
  }, [selectedExercise, period, chartMode, titleFilter, setSearchParams]);

  useEffect(() => {
    getWorkoutTitles().then(setWorkoutTitles).catch(() => {});
    fetchNames(searchParams.get('title') || undefined);
  }, []);

  useEffect(() => {
    fetchNames(titleFilter);
    if (!searchParams.get('exercise')) {
      setSelectedExercise('');
      setSearchQuery('');
    }
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

  // Compute stats for chart header
  const latestValue = dataConverted.length > 0 ? dataConverted[dataConverted.length - 1][chartDataKey] : 0;
  const firstValue = dataConverted.length > 1 ? dataConverted[0][chartDataKey] : 0;
  const changePct = firstValue > 0 ? (((latestValue as number) - (firstValue as number)) / (firstValue as number) * 100) : 0;
  const allTimeBest = dataConverted.length > 0 ? Math.max(...dataConverted.map((d) => d[chartDataKey] as number)) : 0;
  const recentBest = prs.length > 0 ? (chartMode === 'e1rm' ? prs[prs.length - 1].e1rm : prs[prs.length - 1].value) : 0;

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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('progress.title')}</h1>

      {/* Workout type filter */}
      {workoutTitles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTitleFilter('')}
            className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              !titleFilter
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
            }`}
          >
            {t('progress.all')}
          </button>
          {workoutTitles.map((title) => (
            <button
              key={title}
              onClick={() => setTitleFilter(titleFilter === title ? '' : title)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                titleFilter === title
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      )}

      {/* Exercise search */}
      <div className="relative">
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 gap-3 focus-within:border-indigo-500 transition-colors">
          <Dumbbell className="text-slate-500 w-5 h-5 shrink-0" />
          <input
            className="bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-slate-900 dark:text-slate-50 w-full font-medium text-sm placeholder:text-slate-500"
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
          <ChevronDown className="text-slate-500 w-5 h-5 shrink-0" />
        </div>
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xl">
            {filtered.map((name) => (
              <div
                key={name}
                className="flex items-center hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <button
                  type="button"
                  className="flex-1 text-left px-4 py-2.5 text-sm text-slate-900 dark:text-slate-50"
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
                  className="px-3 py-2.5 text-slate-500 hover:text-indigo-400"
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
          {/* Period selector pills */}
          <div className="flex gap-2">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2 rounded-full text-sm transition-colors ${
                  period === p
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chart mode toggle */}
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {(['weight', 'e1rm'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                  chartMode === mode
                    ? 'font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-sm'
                    : 'font-medium text-slate-500'
                }`}
              >
                {mode === 'weight' ? t('progress.weight') : t('progress.estimatedOneRM')}
              </button>
            ))}
          </div>

          {/* Main chart card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {chartMode === 'e1rm' ? t('progress.estimatedOneRM') : t('progress.weight')} {t('progress.title')}
                </h3>
                <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {latestValue} <span className="text-sm text-slate-500">{settings.weightUnit}</span>
                </p>
              </div>
              {changePct !== 0 && (
                <div className="text-right">
                  <span className={`text-xs font-bold flex items-center gap-1 ${changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <TrendingUp size={14} /> {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dataConverted}>
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(79, 70, 229, 0.3)" stopOpacity={1} />
                    <stop offset="100%" stopColor="rgba(79, 70, 229, 0)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
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
                  stroke="#4f46e5"
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
                    fill="#fbbf24"
                    stroke="#18181b"
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            {prs.length > 0 && (
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                {t('progress.personalRecord')}
              </div>
            )}
          </section>

          {/* PR highlight cards - 2-column grid */}
          {prs.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4">
                <h4 className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1">
                  {t('progress.allTimeBest') || 'All-Time Best'}
                </h4>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{allTimeBest}</span>{' '}
                <span className="text-sm font-bold text-indigo-300">{settings.weightUnit}</span>
              </div>
              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4">
                <h4 className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1">
                  {t('progress.latestPR') || 'Latest PR'}
                </h4>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{recentBest}</span>{' '}
                <span className="text-sm font-bold text-indigo-300">{settings.weightUnit}</span>
              </div>
            </div>
          )}

          {/* PR List */}
          {prs.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} className="text-amber-400" />
                <p className="text-sm font-medium text-slate-400">{t('progress.personalRecords')}</p>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {prs.map((pr, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between py-2.5 ${pr.workoutId ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 -mx-4 px-4 rounded-lg transition-colors' : ''}`}
                    onClick={() => pr.workoutId && navigate(`/workouts/${pr.workoutId}?highlight=${encodeURIComponent(selectedExercise)}`)}
                  >
                    <span className="text-sm text-slate-400 flex items-center gap-1.5">
                      {pr.date}
                      {pr.workoutId && <ExternalLink size={12} className="text-slate-500" />}
                    </span>
                    <span className="text-sm tabular-nums font-bold text-amber-400">
                      {chartMode === 'e1rm' ? pr.e1rm : pr.value} {settings.weightUnit}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* History table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  <th className="px-4 py-3">{t('progress.date')}</th>
                  <th className="px-4 py-3">{t('progress.sets')} x Reps @ {t('progress.weight')}</th>
                  <th className="px-4 py-3 text-right">{t('progress.volume') || 'Volume'}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[...dataConverted].reverse().map((point, i) => {
                  const isPR = chartMode === 'e1rm' ? point.isE1rmPR : point.isPR;
                  const setsDisplay = point.bestSet
                    ? `${point.bestSet.setsCount}x${point.bestSet.reps} @ ${point.bestSetWeight > 0 ? `${point.bestSetWeight} ${settings.weightUnit}` : '-'}`
                    : '-';
                  const volume = point.bestSet && point.bestSetWeight > 0
                    ? (point.bestSet.setsCount * point.bestSet.reps * point.bestSetWeight).toFixed(0)
                    : '-';
                  return (
                    <tr
                      key={i}
                      className={`border-t border-slate-200 dark:border-slate-800 ${isPR ? 'bg-amber-500/5' : ''} ${point.workoutId ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors' : ''}`}
                      onClick={() => point.workoutId && navigate(`/workouts/${point.workoutId}?highlight=${encodeURIComponent(selectedExercise)}`)}
                    >
                      <td className={`px-4 py-4 font-medium ${isPR ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500'}`}>
                        {point.date.slice(5)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-slate-700 dark:text-slate-300">{setsDisplay}</span>
                        {isPR && <Star className="text-amber-500 w-4 h-4 inline ml-2" />}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-slate-400">
                        {volume !== '-' ? `${volume} ${settings.weightUnit}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Merge button */}
          {exerciseNames.length > 1 && (
            <div className="flex justify-center">
              <button
                onClick={() => setMergeFrom(selectedExercise)}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-900 dark:hover:text-slate-50 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <GitMerge className="w-4 h-4" /> {t('progress.mergeExercise')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Merge Exercise Dialog */}
      <Dialog open={!!mergeFrom} onClose={() => setMergeFrom(null)}>
        <DialogTitle>{t('progress.mergeExercise')}</DialogTitle>
        <p className="text-slate-400 text-sm mb-4">
          {t('progress.mergeInto', { from: mergeFrom })}
        </p>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {exerciseNames
            .filter((n) => n !== mergeFrom)
            .map((name) => (
              <button
                key={name}
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 text-slate-50"
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
