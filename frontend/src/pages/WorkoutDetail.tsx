import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Clock, Dumbbell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import WorkoutForm from './WorkoutForm';
import { getWorkout, updateWorkout, deleteWorkout } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { formatWeight, formatDistance, formatDuration } from '../lib/units';
import { toDisplayExercise, detectColumns } from '../lib/mappers';
import type { Workout, WorkoutInput } from '../types';
import { formatDate } from '../lib/date';

export default function WorkoutDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const highlightExercise = searchParams.get('highlight');
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getWorkout(id)
      .then(setWorkout)
      .catch(() => setError(t('workoutDetail.failedToLoad')))
      .finally(() => setLoading(false));
  }, [id, t]);

  // Auto-scroll to highlighted exercise
  useEffect(() => {
    if (highlightExercise && highlightRef.current && !loading) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightExercise, loading]);

  // Map API exercises to display exercises
  const displayExercises = useMemo(
    () => workout?.exercises.map(toDisplayExercise) ?? [],
    [workout],
  );

  const handleUpdate = async (data: WorkoutInput) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const updated = await updateWorkout(id, data);
      setWorkout(updated);
      setEditing(false);
    } catch {
      setError(t('workoutDetail.failedToUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await deleteWorkout(id);
      navigate('/workouts');
    } catch {
      setError(t('workoutDetail.failedToDelete'));
      setSubmitting(false);
    }
  };

  // Compute total volume (sets x weight) and total sets
  const totalSets = useMemo(
    () => displayExercises.reduce((sum, ex) => sum + ex.sets.length, 0),
    [displayExercises],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-sm mb-4">{error || t('workoutDetail.workoutNotFound')}</p>
        <Link
          to="/workouts"
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
        >
          {t('workoutDetail.backToWorkouts')}
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          {t('workoutDetail.editWorkout')}
        </h1>
        <WorkoutForm
          initial={{
            title: workout.title,
            date: workout.date.split('T')[0],
            notes: workout.notes,
            exercises: workout.exercises,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitting={submitting}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-colors"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-400 rounded-full p-2 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Hero header card */}
      <section className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl -mr-16 -mt-16 rounded-full"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1">
            {workout.title}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {formatDate(workout.date, 'long', i18n.language)}
          </p>
          {workout.notes && <p className="text-slate-500 text-sm italic mt-2">{workout.notes}</p>}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell size={14} className="text-slate-500" />
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  {t('workouts.exercises', { defaultValue: 'Exercises' })}
                </p>
              </div>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {displayExercises.length}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-slate-500" />
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  {t('workouts.totalSets', { defaultValue: 'Total Sets' })}
                </p>
              </div>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {totalSets}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Exercises */}
      <div className="space-y-4">
        {displayExercises.map((exercise, idx) => {
          const isHighlighted = highlightExercise?.toLowerCase() === exercise.name.toLowerCase();
          const cols = detectColumns(exercise.sets);

          // Calculate total volume for this exercise
          const exerciseVolume = exercise.sets.reduce((sum, s) => {
            if (s.weight > 0 && s.reps) {
              return sum + s.weight * s.reps;
            }
            return sum;
          }, 0);

          return (
            <div key={idx} ref={isHighlighted ? highlightRef : undefined}>
              <div
                className={`bg-white dark:bg-slate-900 border rounded-xl overflow-hidden ${isHighlighted ? 'ring-2 ring-yellow-500/50 border-yellow-500/30' : 'border-slate-200 dark:border-slate-800'}`}
              >
                {/* Exercise header */}
                <div className="flex items-center gap-3 p-4 pb-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">
                      {exercise.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      {exercise.category}
                    </p>
                  </div>
                </div>
                {exercise.notes && (
                  <p className="text-xs text-slate-500 italic px-4 pt-2">{exercise.notes}</p>
                )}

                {/* Sets table */}
                <div className="mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-2 px-4 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                          #
                        </th>
                        {cols.showReps && (
                          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                            {t('workoutDetail.reps')}
                          </th>
                        )}
                        {cols.showWeight && (
                          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                            {t('workoutDetail.weight')}
                          </th>
                        )}
                        {cols.showDuration && (
                          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                            {t('workoutDetail.duration')}
                          </th>
                        )}
                        {cols.showDistance && (
                          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                            {t('workoutDetail.distance')}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {exercise.sets.map((set, si) => (
                        <tr
                          key={si}
                          className={si % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/20' : ''}
                        >
                          <td className="py-2 px-4 text-slate-500 tabular-nums">{si + 1}</td>
                          {cols.showReps && (
                            <td className="py-2 px-4 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {set.isDropset && set.repsDisplay ? set.repsDisplay : set.reps || '-'}
                            </td>
                          )}
                          {cols.showWeight && (
                            <td className="py-2 px-4 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {set.weight > 0
                                ? formatWeight(
                                    set.weight,
                                    set.unit as 'kg' | 'lbs',
                                    settings.weightUnit,
                                  )
                                : '-'}
                            </td>
                          )}
                          {cols.showDuration && (
                            <td className="py-2 px-4 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {set.durationSeconds != null && set.durationSeconds > 0
                                ? formatDuration(set.durationSeconds)
                                : '-'}
                            </td>
                          )}
                          {cols.showDistance && (
                            <td className="py-2 px-4 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {set.distance != null
                                ? formatDistance(
                                    set.distance,
                                    (set.distanceUnit || 'km') as 'km' | 'mi',
                                    settings.distanceUnit,
                                  )
                                : '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total volume footer */}
                  {exerciseVolume > 0 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        {t('workoutDetail.totalVolume', { defaultValue: 'Total Volume' })}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                        {formatWeight(
                          exerciseVolume,
                          exercise.sets[0]?.unit as 'kg' | 'lbs',
                          settings.weightUnit,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>{t('workoutDetail.deleteWorkout')}</DialogTitle>
        <p className="text-slate-400 text-sm mb-6">
          {t('workoutDetail.confirmDelete', { title: workout.title })}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="default" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={submitting}>
            {submitting ? t('workoutDetail.deleting') : t('common.delete')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
