import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { getWorkouts } from '../lib/api';
import type { Workout } from '../types';
import { formatDate } from '../lib/date';
import { hasChatSession } from '../lib/chatSession';

export default function Workouts() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const hasSession = hasChatSession();

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

  const getTotalSets = (w: Workout) =>
    w.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t('workouts.title')}</h1>
        <Button variant="primary" size="sm" onClick={() => navigate('/workouts/new')}>
          <Plus size={16} /> {hasSession ? t('workouts.continueWorkout') : t('workouts.newWorkout')}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
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
          <div className="space-y-2">
            {workouts.map((w) => (
              <Link key={w._id} to={`/workouts/${w._id}`}>
                <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">{w.title}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {formatDate(w.date, 'short', i18n.language)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge>{t('workouts.ex', { count: w.exercises.length })}</Badge>
                      <Badge>{t('workouts.setsCount', { count: getTotalSets(w) })}</Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Dumbbell size={40} />}
          title={t('workouts.noWorkoutsYet')}
          description={t('workouts.noWorkoutsDescription')}
          action={
            <Button variant="primary" onClick={() => navigate('/workouts/new')}>
              <Plus size={16} /> {t('workouts.logWorkout')}
            </Button>
          }
        />
      )}

    </div>
  );
}
