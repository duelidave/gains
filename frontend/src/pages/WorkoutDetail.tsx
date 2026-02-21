import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog, DialogTitle } from '../components/ui/Dialog';
import { Skeleton } from '../components/ui/Skeleton';
import WorkoutForm from './WorkoutForm';
import { getWorkout, updateWorkout, deleteWorkout } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { formatWeight, formatDistance } from '../lib/units';
import { toDisplayExercise } from '../lib/mappers';
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

  useEffect(() => {
    if (!id) return;
    getWorkout(id)
      .then(setWorkout)
      .catch(() => setError(t('workoutDetail.failedToLoad')))
      .finally(() => setLoading(false));
  }, [id, t]);

  // Map API exercises to display exercises
  const displayExercises = useMemo(
    () => workout?.exercises.map(toDisplayExercise) ?? [],
    [workout]
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
        <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error || t('workoutDetail.workoutNotFound')}</p>
        <Link to="/workouts" className="text-blue-500 hover:text-blue-400 text-sm font-medium">
          {t('workoutDetail.backToWorkouts')}
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">{t('workoutDetail.editWorkout')}</h1>
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/workouts"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 truncate">{workout.title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatDate(workout.date, 'long', i18n.language)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={() => setEditing(true)}>
            <Edit size={14} /> {t('common.edit')}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Notes */}
      {workout.notes && (
        <Card>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm italic">{workout.notes}</p>
        </Card>
      )}

      {/* Exercises */}
      <div className="space-y-3">
        {displayExercises.map((exercise, idx) => (
          <Card key={idx}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{exercise.name}</h3>
              <Badge>{exercise.category}</Badge>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-600 dark:text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left py-2 pr-4 font-medium">#</th>
                  {(exercise.category === 'strength' ||
                    exercise.category === 'bodyweight') && (
                    <th className="text-left py-2 pr-4 font-medium">{t('workoutDetail.reps')}</th>
                  )}
                  {exercise.category === 'strength' && (
                    <th className="text-left py-2 pr-4 font-medium">{t('workoutDetail.weight')}</th>
                  )}
                  {exercise.category === 'cardio' && (
                    <th className="text-left py-2 pr-4 font-medium">{t('workoutDetail.duration')}</th>
                  )}
                  {exercise.category === 'cardio' && (
                    <th className="text-left py-2 font-medium">{t('workoutDetail.distance')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {exercise.sets.map((set, si) => (
                  <tr key={si} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-500 tabular-nums">{si + 1}</td>
                    {(exercise.category === 'strength' ||
                      exercise.category === 'bodyweight') && (
                      <td className="py-2 pr-4 text-zinc-900 dark:text-zinc-50 font-medium tabular-nums">
                        {set.isDropset && set.repsDisplay
                          ? set.repsDisplay
                          : set.reps || '-'}
                      </td>
                    )}
                    {exercise.category === 'strength' && (
                      <td className="py-2 pr-4 text-zinc-900 dark:text-zinc-50 font-medium tabular-nums">
                        {set.weight > 0
                          ? formatWeight(set.weight, set.unit as 'kg' | 'lbs', settings.weightUnit)
                          : '-'}
                      </td>
                    )}
                    {exercise.category === 'cardio' && (
                      <td className="py-2 pr-4 text-zinc-900 dark:text-zinc-50 font-medium tabular-nums">
                        {set.durationSeconds != null
                          ? set.durationSeconds >= 60
                            ? `${Math.floor(set.durationSeconds / 60)}min ${set.durationSeconds % 60 > 0 ? `${set.durationSeconds % 60}s` : ''}`
                            : `${set.durationSeconds}s`
                          : '-'}
                      </td>
                    )}
                    {exercise.category === 'cardio' && (
                      <td className="py-2 text-zinc-900 dark:text-zinc-50 font-medium tabular-nums">
                        {set.distance != null
                          ? formatDistance(set.distance, (set.distanceUnit || 'km') as 'km' | 'mi', settings.distanceUnit)
                          : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>{t('workoutDetail.deleteWorkout')}</DialogTitle>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
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
