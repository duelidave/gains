import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { Card } from '../components/ui/Card';
import { getExerciseNames } from '../lib/api';
import type { ApiExercise, ApiSet, WorkoutInput } from '../types';

interface WorkoutFormProps {
  initial?: WorkoutInput;
  onSubmit: (data: WorkoutInput) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const emptySet: ApiSet = { reps: 0, weight: 0, unit: 'kg' };

const emptyExercise: ApiExercise = {
  name: '',
  category: 'strength',
  sets: [{ ...emptySet }],
};

const categoryFields: Record<string, string[]> = {
  strength: ['reps', 'weight'],
  bodyweight: ['reps'],
  cardio: ['duration', 'distance'],
  flexibility: ['duration'],
};

export default function WorkoutForm({ initial, onSubmit, onCancel, submitting }: WorkoutFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title || '');
  const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [exercises, setExercises] = useState<ApiExercise[]>(
    initial?.exercises?.length ? initial.exercises : [{ ...emptyExercise, sets: [{ ...emptySet }] }]
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeAutocomplete, setActiveAutocomplete] = useState<number | null>(null);

  useEffect(() => {
    getExerciseNames().then(setSuggestions).catch(() => {});
  }, []);

  const updateExercise = (idx: number, updates: Partial<ApiExercise>) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, ...updates } : ex))
    );
  };

  const addExercise = () => {
    setExercises((prev) => [...prev, { ...emptyExercise, sets: [{ ...emptySet }] }]);
  };

  const removeExercise = (idx: number) => {
    if (exercises.length <= 1) return;
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSet = (exIdx: number, setIdx: number, updates: Partial<ApiSet>) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, ...updates } : s)) }
          : ex
      )
    );
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx ? { ...ex, sets: [...ex.sets, { ...emptySet }] } : ex
      )
    );
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx && ex.sets.length > 1
          ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
          : ex
      )
    );
  };

  const filteredSuggestions = (query: string) =>
    suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase())).slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({ title: title.trim(), date, notes: notes.trim() || undefined, exercises });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title & Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="title">{t('workoutForm.titleLabel')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('workoutForm.titlePlaceholder')}
            required
          />
        </div>
        <div>
          <Label htmlFor="date">{t('workoutForm.dateLabel')}</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">{t('workoutForm.notesLabel')}</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('workoutForm.notesPlaceholder')}
        />
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t('workoutForm.exercises')}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={addExercise}>
            <Plus size={14} /> {t('workoutForm.addExercise')}
          </Button>
        </div>

        {exercises.map((exercise, exIdx) => (
          <Card key={exIdx} className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Exercise name with autocomplete */}
                <div className="relative">
                  <Label>{t('workoutForm.name')}</Label>
                  <Input
                    value={exercise.name}
                    onChange={(e) => {
                      updateExercise(exIdx, { name: e.target.value });
                      setActiveAutocomplete(exIdx);
                    }}
                    onFocus={() => setActiveAutocomplete(exIdx)}
                    onBlur={() => setTimeout(() => setActiveAutocomplete(null), 200)}
                    placeholder={t('workoutForm.namePlaceholder')}
                  />
                  {activeAutocomplete === exIdx &&
                    exercise.name.length > 0 &&
                    filteredSuggestions(exercise.name).length > 0 && (
                      <div className="absolute z-10 w-full mt-1 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
                        {filteredSuggestions(exercise.name).map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                            onMouseDown={() => {
                              updateExercise(exIdx, { name: s });
                              setActiveAutocomplete(null);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                <div>
                  <Label>{t('workoutForm.category')}</Label>
                  <Select
                    value={exercise.category || 'strength'}
                    onChange={(e) =>
                      updateExercise(exIdx, {
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="strength">{t('workoutForm.strength')}</option>
                    <option value="bodyweight">{t('workoutForm.bodyweight')}</option>
                    <option value="cardio">{t('workoutForm.cardio')}</option>
                    <option value="flexibility">{t('workoutForm.flexibility')}</option>
                  </Select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeExercise(exIdx)}
                className="w-9 h-9 mt-6 rounded-lg flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                disabled={exercises.length <= 1}
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* Sets */}
            <div className="space-y-2">
              {/* Set headers */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-widest px-1">
                <span className="w-8">{t('workoutForm.set')}</span>
                {categoryFields[exercise.category || 'strength']?.includes('reps') && (
                  <span className="flex-1">{t('workoutForm.reps')}</span>
                )}
                {categoryFields[exercise.category || 'strength']?.includes('weight') && (
                  <span className="flex-1">{t('workoutForm.weight')}</span>
                )}
                {categoryFields[exercise.category || 'strength']?.includes('duration') && (
                  <span className="flex-1">{t('workoutForm.durationSeconds')}</span>
                )}
                {categoryFields[exercise.category || 'strength']?.includes('distance') && (
                  <span className="flex-1">{t('workoutForm.distance')}</span>
                )}
                <span className="w-9" />
              </div>

              {exercise.sets.map((set, setIdx) => (
                <div key={setIdx} className="flex items-center gap-2">
                  <span className="w-8 text-xs text-zinc-600 dark:text-zinc-500 font-medium text-center tabular-nums">
                    {setIdx + 1}
                  </span>
                  {categoryFields[exercise.category || 'strength']?.includes('reps') && (
                    <Input
                      type="number"
                      className="flex-1"
                      placeholder="0"
                      min={0}
                      value={set.reps || ''}
                      onChange={(e) =>
                        updateSet(exIdx, setIdx, {
                          reps: e.target.value ? Number(e.target.value) : 0,
                        })
                      }
                    />
                  )}
                  {categoryFields[exercise.category || 'strength']?.includes('weight') && (
                    <div className="flex-1 flex gap-1.5">
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        step={0.5}
                        value={set.weight || ''}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, {
                            weight: e.target.value ? Number(e.target.value) : 0,
                          })
                        }
                      />
                      <Select
                        className="w-18"
                        value={set.unit || 'kg'}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, { unit: e.target.value })
                        }
                      >
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                      </Select>
                    </div>
                  )}
                  {categoryFields[exercise.category || 'strength']?.includes('duration') && (
                    <Input
                      type="number"
                      className="flex-1"
                      placeholder="0"
                      min={0}
                      value={set.duration ?? ''}
                      onChange={(e) =>
                        updateSet(exIdx, setIdx, {
                          duration: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  )}
                  {categoryFields[exercise.category || 'strength']?.includes('distance') && (
                    <div className="flex-1 flex gap-1.5">
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        step={0.1}
                        value={set.distance ?? ''}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, {
                            distance: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                      <Select
                        className="w-18"
                        value={set.distanceUnit || 'km'}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, {
                            distanceUnit: e.target.value,
                          })
                        }
                      >
                        <option value="km">km</option>
                        <option value="mi">mi</option>
                      </Select>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSet(exIdx, setIdx)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    disabled={exercise.sets.length <= 1}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              <Button type="button" variant="ghost" size="sm" onClick={() => addSet(exIdx)}>
                <Plus size={13} /> {t('workoutForm.addSet')}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Button type="button" variant="default" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={submitting || !title.trim()}>
          {submitting ? t('workoutForm.saving') : initial ? t('workoutForm.updateWorkout') : t('workoutForm.saveWorkout')}
        </Button>
      </div>
    </form>
  );
}
