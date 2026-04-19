import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { getWorkouts } from '../lib/api';
import type { Workout } from '../types';
import { formatDate } from '../lib/date';
import { useDraft } from '../context/DraftContext';

export default function Workouts() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const { hasDraft } = useDraft();
  const hasSession = hasDraft;

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getWorkouts(page, 10);
      setWorkouts(res.data);
      setTotalPages(res.totalPages);
    } catch {
      setError(t('workouts.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  useEffect(() => {
    if (page > 1) {
      setSearchParams({ page: String(page) }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [page, setSearchParams]);

  const getTotalSets = (w: Workout) =>
    w.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('workouts.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('workouts.subtitle', { defaultValue: '' })}</p>
        </div>
        <button
          onClick={() => navigate('/workouts/new')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-90 transition-all duration-200 flex items-center gap-2"
        >
          <Plus size={16} />
          <span className="text-sm font-bold">
            {hasSession ? t('workouts.continueWorkout') : t('workouts.newWorkout')}
          </span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : workouts.length > 0 ? (
        <>
          <div className="space-y-3">
            {workouts.map((w) => (
              <Link key={w._id} to={`/workouts/${w._id}`}>
                <div className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300 active:scale-[0.98]">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{w.title}</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
                        {formatDate(w.date, 'short', i18n.language)}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2 border border-slate-200 dark:border-slate-800/30">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{t('workouts.exercises', { defaultValue: 'Exercises' })}</p>
                      <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{w.exercises.length}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2 border border-slate-200 dark:border-slate-800/30">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{t('workouts.totalSets', { defaultValue: 'Total Sets' })}</p>
                      <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{getTotalSets(w)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 rounded-xl p-2 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-slate-400 tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 rounded-xl p-2 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Dumbbell size={40} />}
          title={t('workouts.noWorkoutsYet')}
          description={t('workouts.noWorkoutsDescription')}
          action={
            <button
              onClick={() => navigate('/workouts/new')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-90 transition-all duration-200 flex items-center gap-2"
            >
              <Plus size={16} /> <span className="text-sm font-bold">{t('workouts.logWorkout')}</span>
            </button>
          }
        />
      )}

    </div>
  );
}
