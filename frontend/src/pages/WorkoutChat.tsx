import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Check,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Plus,
  Timer,
  Dumbbell,
  X,
  Undo2,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../components/ui/Skeleton';
import {
  parseWorkout,
  createWorkout,
  getLatestWorkout,
  getPlans,
  getDraft,
  putDraft,
  deleteDraft,
} from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { useDraft } from '../context/DraftContext';
import { formatWeight, formatDuration } from '../lib/units';
import type { ApiExercise, ApiSet, TrainingPlan, Workout, WorkoutInput } from '../types';

type SetEntry = {
  id: string;
  order: number;
  kind: 'set';
  exerciseName: string;
  reps: string;
  weight: string;
  unit: 'kg' | 'lbs';
  duration?: string;
  confirmed: boolean;
};

type NoteEntry = {
  id: string;
  order: number;
  kind: 'note';
  text: string;
};

type Entry = SetEntry | NoteEntry;

type PersistedDraft = {
  version: 2;
  title: string;
  planId: string | null;
  skipped: string[];
  entries: Entry[];
};

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeName(n: string): string {
  return n.trim().toLowerCase();
}

function detectWorkoutTitle(message: string, plans?: TrainingPlan[]): string | null {
  const lower = message.toLowerCase();
  if (plans && plans.length > 0) {
    for (const plan of plans) {
      if (
        lower.includes(plan.name.toLowerCase()) ||
        lower.includes(plan.workoutTitle.toLowerCase())
      ) {
        return plan.workoutTitle;
      }
    }
  }
  if (lower.includes('brust') || lower.includes('chest')) return 'Brust';
  if (lower.includes('rücken') || lower.includes('ruecken') || lower.includes('back'))
    return 'Rücken';
  if (lower.includes('bein') || lower.includes('leg')) return 'Beine';
  return null;
}

function summarizeSets(sets: ApiSet[], targetUnit: 'kg' | 'lbs'): string {
  if (sets.length === 0) return '';
  const hasDuration = sets.some((s) => (s.duration ?? 0) > 0);
  if (hasDuration) {
    const durations = sets.map((s) => s.duration ?? 0);
    const allSame = durations.every((d) => d === durations[0]);
    if (allSame) return `${sets.length}x ${formatDuration(durations[0])}`;
    return sets.map((s) => formatDuration(s.duration ?? 0)).join(', ');
  }
  const reps = sets[0].reps;
  const weight = sets[0].weight;
  const allSame = sets.every((s) => s.reps === reps && s.weight === weight);
  if (allSame && weight > 0) {
    return `${sets.length}x${reps} @ ${formatWeight(weight, (sets[0].unit || 'kg') as 'kg' | 'lbs', targetUnit)}`;
  }
  if (allSame) return `${sets.length}x${reps}`;
  return sets.map((s) => (s.weight > 0 ? `${s.reps}@${s.weight}` : `${s.reps}`)).join(', ');
}

function summarizeConfirmedEntries(sets: SetEntry[], targetUnit: 'kg' | 'lbs'): string {
  const apiSets: ApiSet[] = sets.map((s) => ({
    reps: Number(s.reps) || 0,
    weight: Number(s.weight) || 0,
    unit: s.unit,
    duration: s.duration ? Number(s.duration) || 0 : undefined,
  }));
  return summarizeSets(apiSets, targetUnit);
}

function entryToPromptLine(e: Entry): string | null {
  if (e.kind === 'note') return e.text;
  if (!e.confirmed) return null;
  const { exerciseName, reps, weight, unit, duration } = e;
  if (duration && duration.trim()) return `${exerciseName}: ${duration}`;
  if (weight && Number(weight) > 0) return `${exerciseName}: ${reps}x ${weight}${unit}`;
  return `${exerciseName}: ${reps}x`;
}

export default function WorkoutChat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { refresh: refreshDraftCtx } = useDraft();

  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState('');
  const [planId, setPlanId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [started, setStarted] = useState(false);

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);
  const [lastWorkoutLoading, setLastWorkoutLoading] = useState(false);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const orderRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadSavedDraftRef = useRef(false);

  const selectedPlan = useMemo(
    () => (planId ? (plans.find((p) => p._id === planId) ?? null) : null),
    [planId, plans],
  );

  const fetchLastWorkout = useCallback(async (workoutTitle: string) => {
    setLastWorkoutLoading(true);
    try {
      const workout = await getLatestWorkout(workoutTitle);
      setLastWorkout(workout);
    } catch {
      // non-critical
    } finally {
      setLastWorkoutLoading(false);
    }
  }, []);

  const nextOrder = () => orderRef.current++;

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const saved = await getDraft();
        if (saved?.state) {
          const s = saved.state as Partial<PersistedDraft>;
          if (Array.isArray(s.entries)) setEntries(s.entries as Entry[]);
          if (typeof s.title === 'string') setTitle(s.title);
          if (typeof s.planId === 'string' || s.planId === null) setPlanId(s.planId ?? null);
          if (Array.isArray(s.skipped)) setSkipped(s.skipped);
          const arr = Array.isArray(s.entries) ? (s.entries as Entry[]) : [];
          const maxOrder = arr.reduce((m, e) => Math.max(m, e.order), -1);
          orderRef.current = maxOrder + 1;
          if (arr.length > 0 || s.title || s.planId) {
            setStarted(true);
            hadSavedDraftRef.current = true;
          }
          if (s.title) fetchLastWorkout(s.title);
        }
      } catch {
        // ignore
      } finally {
        setHydrated(true);
      }
    })();
  }, [fetchLastWorkout]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const isEmpty = entries.length === 0 && !title && !planId && skipped.length === 0;
      if (isEmpty) {
        if (hadSavedDraftRef.current) {
          deleteDraft()
            .catch(() => {})
            .finally(() => {
              hadSavedDraftRef.current = false;
              refreshDraftCtx();
            });
        }
      } else {
        const state: PersistedDraft = { version: 2, title, planId, skipped, entries };
        putDraft(state)
          .catch(() => {})
          .finally(() => {
            hadSavedDraftRef.current = true;
            refreshDraftCtx();
          });
      }
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [entries, title, planId, skipped, hydrated, refreshDraftCtx]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const getLastExerciseData = useCallback(
    (exerciseName: string) => {
      if (!lastWorkout) return null;
      return (
        lastWorkout.exercises.find((e) => e.name.toLowerCase() === exerciseName.toLowerCase()) ??
        null
      );
    },
    [lastWorkout],
  );

  const getSetsFor = useCallback(
    (name: string) =>
      entries.filter(
        (e): e is SetEntry =>
          e.kind === 'set' && normalizeName(e.exerciseName) === normalizeName(name),
      ),
    [entries],
  );

  const startDraftFromPlan = (plan: TrainingPlan) => {
    setTitle(plan.workoutTitle);
    setPlanId(plan._id);
    setSkipped([]);
    setStarted(true);
    fetchLastWorkout(plan.workoutTitle);
  };

  const startDraftFromTitle = (newTitle: string) => {
    setTitle(newTitle);
    setPlanId(null);
    setSkipped([]);
    setStarted(true);
    fetchLastWorkout(newTitle);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    if (!started) {
      const detected = detectWorkoutTitle(text, plans);
      const plan = detected ? plans.find((p) => p.workoutTitle === detected) : undefined;
      setTitle(detected ?? '');
      setPlanId(plan?._id ?? null);
      setStarted(true);
      if (detected) fetchLastWorkout(detected);
    }
    const note: NoteEntry = { id: newId(), order: nextOrder(), kind: 'note', text };
    setEntries((prev) => [...prev, note]);
    setInput('');
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const skipExercise = (name: string) => {
    setSkipped((prev) => (prev.includes(name) ? prev : [...prev, name]));
    if (expandedExercise === name) setExpandedExercise(null);
  };

  const unskipExercise = (name: string) => {
    setSkipped((prev) => prev.filter((n) => n !== name));
  };

  const seedSetsFromLast = (name: string): SetEntry[] => {
    const last = getLastExerciseData(name);
    if (!last || last.sets.length === 0) {
      return [
        {
          id: newId(),
          order: nextOrder(),
          kind: 'set',
          exerciseName: name,
          reps: '',
          weight: '',
          unit: settings.weightUnit,
          confirmed: false,
        },
      ];
    }
    return last.sets.map((s) => ({
      id: newId(),
      order: nextOrder(),
      kind: 'set' as const,
      exerciseName: name,
      reps: String(s.reps ?? ''),
      weight: s.weight > 0 ? String(s.weight) : '',
      unit: settings.weightUnit,
      confirmed: false,
    }));
  };

  const expandExercise = (name: string) => {
    if (expandedExercise === name) {
      setExpandedExercise(null);
      return;
    }
    if (getSetsFor(name).length === 0) {
      const seeded = seedSetsFromLast(name);
      setEntries((prev) => [...prev, ...seeded]);
    }
    setExpandedExercise(name);
  };

  const updateSetEntry = (id: string, field: 'reps' | 'weight', value: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id || e.kind !== 'set') return e;
        return { ...e, [field]: value };
      }),
    );
  };

  const addSetRow = (name: string) => {
    const existing = getSetsFor(name);
    const last = existing[existing.length - 1];
    const lastEx = getLastExerciseData(name);
    const nextIdx = existing.length;
    let defaultReps = '';
    let defaultWeight = '';
    if (last) {
      defaultReps = last.reps;
      defaultWeight = last.weight;
    } else if (lastEx && lastEx.sets[nextIdx]) {
      defaultReps = String(lastEx.sets[nextIdx].reps ?? '');
      defaultWeight = lastEx.sets[nextIdx].weight > 0 ? String(lastEx.sets[nextIdx].weight) : '';
    }
    const entry: SetEntry = {
      id: newId(),
      order: nextOrder(),
      kind: 'set',
      exerciseName: name,
      reps: defaultReps,
      weight: defaultWeight,
      unit: settings.weightUnit,
      confirmed: false,
    };
    setEntries((prev) => [...prev, entry]);
  };

  const toggleConfirmSet = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id || e.kind !== 'set') return e;
        if (!e.confirmed) {
          const reps = Number(e.reps);
          if (!Number.isFinite(reps) || reps <= 0) return e;
        }
        return { ...e, confirmed: !e.confirmed };
      }),
    );
  };

  const buildWorkoutFromEntries = (): WorkoutInput | null => {
    const sorted = [...entries].sort((a, b) => a.order - b.order);
    const confirmedSets = sorted.filter((e): e is SetEntry => e.kind === 'set' && e.confirmed);
    if (confirmedSets.length === 0) return null;

    const notes = sorted.filter((e): e is NoteEntry => e.kind === 'note').map((n) => n.text);

    const grouped = new Map<string, { name: string; sets: ApiSet[] }>();
    for (const s of confirmedSets) {
      const key = normalizeName(s.exerciseName);
      const set: ApiSet =
        s.duration && s.duration.trim()
          ? { reps: 0, weight: 0, unit: s.unit, duration: Number(s.duration) || 0 }
          : {
              reps: Number(s.reps) || 0,
              weight: Number(s.weight) || 0,
              unit: s.unit,
            };
      const bucket = grouped.get(key);
      if (bucket) bucket.sets.push(set);
      else grouped.set(key, { name: s.exerciseName, sets: [set] });
    }

    const exercises: ApiExercise[] = [...grouped.values()].map((g) => ({
      name: g.name,
      sets: g.sets,
    }));

    return {
      title: title || 'Workout',
      date: todayIso(),
      notes: notes.join('\n'),
      exercises,
    };
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      let payload = buildWorkoutFromEntries();

      if (!payload) {
        const messages = [...entries]
          .sort((a, b) => a.order - b.order)
          .map(entryToPromptLine)
          .filter((s): s is string => !!s);
        if (messages.length === 0) {
          setError(t('workoutChat.failedToSave'));
          setSaving(false);
          return;
        }
        const parsed = await parseWorkout(messages);
        if (!parsed.title && title) parsed.title = title;
        if (!parsed.exercises || parsed.exercises.length === 0) {
          setError(t('workoutChat.failedToSave'));
          setSaving(false);
          return;
        }
        payload = parsed;
      }

      const created = await createWorkout(payload);
      await deleteDraft().catch(() => {});
      hadSavedDraftRef.current = false;
      refreshDraftCtx();
      navigate(`/workouts/${created._id}`);
    } catch {
      setError(t('workoutChat.failedToSave'));
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setEntries([]);
    setTitle('');
    setPlanId(null);
    setSkipped([]);
    setStarted(false);
    setInput('');
    setError('');
    setLastWorkout(null);
    setExpandedExercise(null);
    deleteDraft()
      .catch(() => {})
      .finally(() => {
        hadSavedDraftRef.current = false;
        refreshDraftCtx();
      });
  };

  // --- Render ---

  if (!hydrated) {
    return (
      <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)]">
        <div className="flex items-center gap-3 pb-4">
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="flex-1 rounded-xl" />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)]">
        <div className="flex items-center gap-3 pb-4">
          <button
            onClick={() => navigate('/workouts')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {t('workoutChat.newWorkout')}
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 py-6">
          <p className="text-slate-500 text-sm text-center">{t('workoutChat.chooseType')}</p>
          <div className="flex flex-col gap-2 w-full max-w-sm mx-auto">
            {plans.length > 0
              ? plans.map((plan) => (
                  <button
                    key={plan._id}
                    onClick={() => startDraftFromPlan(plan)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.98] transition-all flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Dumbbell size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold">{plan.name}</span>
                      <span className="text-xs text-slate-500">
                        {plan.sections.flatMap((s) => s.exercises).length}{' '}
                        {t('workoutChat.exercises', {
                          count: plan.sections.flatMap((s) => s.exercises).length,
                        })}
                      </span>
                    </div>
                  </button>
                ))
              : [
                  { key: 'chest', label: t('workoutChat.chest'), title: 'Brust' },
                  { key: 'back', label: t('workoutChat.back'), title: 'Rücken' },
                  { key: 'legs', label: t('workoutChat.legs'), title: 'Beine' },
                ].map(({ key, label, title: titleLabel }) => (
                  <button
                    key={key}
                    onClick={() => startDraftFromTitle(titleLabel)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.98] transition-all"
                  >
                    {label}
                  </button>
                ))}
          </div>
          <p className="text-slate-600 text-xs text-center">{t('workoutChat.example')}</p>
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-slate-950 pt-3">
          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3 border border-dashed border-slate-300 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('workoutChat.placeholderFirst')}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const planExercises = selectedPlan ? selectedPlan.sections.flatMap((s) => s.exercises) : [];
  const hasConfirmedSets = entries.some((e) => e.kind === 'set' && e.confirmed);
  const hasNotes = entries.some((e) => e.kind === 'note');
  const canFinish = hasConfirmedSets || hasNotes;
  const finishDisabled = !canFinish || saving;
  const sortedEntries = [...entries].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)]">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workouts')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {t('workoutChat.newWorkout')}
            </h1>
            {selectedPlan && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                {selectedPlan.name}
              </span>
            )}
            {!selectedPlan && title && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                {title}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleDiscard}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          <RotateCcw size={12} />
          {t('workoutChat.discard')}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
        {selectedPlan && (
          <div className="space-y-2">
            {lastWorkoutLoading && <Skeleton className="h-16 rounded-xl" />}
            {planExercises.map((ex, i) => {
              const sets = getSetsFor(ex.name);
              const used = sets.some((s) => s.confirmed);
              const isSkipped = skipped.includes(ex.name);
              const lastEx = getLastExerciseData(ex.name);
              const lastSummary = lastEx ? summarizeSets(lastEx.sets, settings.weightUnit) : null;
              const isExpanded = expandedExercise === ex.name;
              const confirmedSummary = used
                ? summarizeConfirmedEntries(
                    sets.filter((s) => s.confirmed),
                    settings.weightUnit,
                  )
                : '';

              if (isSkipped) {
                return (
                  <div
                    key={i}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/30 p-3 flex items-center justify-between opacity-40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600">
                        <X size={14} />
                      </div>
                      <span className="text-sm text-slate-600 line-through">{ex.name}</span>
                    </div>
                    <button
                      onClick={() => unskipExercise(ex.name)}
                      className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    >
                      <Undo2 size={12} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className={`rounded-xl overflow-hidden transition-all ${
                    isExpanded
                      ? 'bg-white dark:bg-slate-900 border border-indigo-500/30 shadow-2xl'
                      : used
                        ? 'bg-white dark:bg-slate-900/50 border border-emerald-500/20'
                        : 'bg-white dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50'
                  }`}
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => expandExercise(ex.name)}
                      className="flex-1 p-4 flex items-center gap-3 text-left"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          used
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isExpanded
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {used ? <Check size={14} strokeWidth={3} /> : <Dumbbell size={14} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          {ex.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {used
                            ? confirmedSummary
                            : ex.setsReps || (lastSummary ? `Last: ${lastSummary}` : '')}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 pr-3">
                      {!used && !isExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            skipExercise(ex.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Skip exercise"
                        >
                          <X size={14} />
                        </button>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-600" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="flex gap-3 mb-2">
                        {ex.setsReps && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                            Target: {ex.setsReps}
                          </span>
                        )}
                        {lastSummary && (
                          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                            Last: {lastSummary}
                          </span>
                        )}
                      </div>

                      {sets.map((row, si) => (
                        <div
                          key={row.id}
                          className={`flex items-center gap-3 p-2 rounded-lg border ${
                            row.confirmed
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="w-6 font-mono text-xs text-slate-500 font-bold">
                            {si + 1}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="relative">
                              <input
                                type="number"
                                inputMode="decimal"
                                value={row.weight}
                                onChange={(e) => updateSetEntry(row.id, 'weight', e.target.value)}
                                placeholder="kg"
                                className="w-full bg-white dark:bg-slate-900 border-none rounded-md text-sm font-mono text-center focus:ring-1 focus:ring-indigo-500 py-2 text-slate-900 dark:text-slate-50"
                              />
                              <span className="absolute right-2 top-2.5 text-[10px] text-slate-600 font-bold">
                                KG
                              </span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                inputMode="numeric"
                                value={row.reps}
                                onChange={(e) => updateSetEntry(row.id, 'reps', e.target.value)}
                                placeholder="reps"
                                className="w-full bg-white dark:bg-slate-900 border-none rounded-md text-sm font-mono text-center focus:ring-1 focus:ring-indigo-500 py-2 text-slate-900 dark:text-slate-50"
                              />
                              <span className="absolute right-2 top-2.5 text-[10px] text-slate-600 font-bold">
                                REPS
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleConfirmSet(row.id)}
                            disabled={!row.reps.trim() || Number(row.reps) <= 0}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center active:scale-95 transition-transform ${
                              row.confirmed
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            } disabled:opacity-30`}
                          >
                            <Check size={18} strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => deleteEntry(row.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete set"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => addSetRow(ex.name)}
                          className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider py-2 px-3 rounded-lg hover:bg-indigo-500/10 transition-colors"
                        >
                          <Plus size={14} />
                          Add Set
                        </button>
                        {ex.rest && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <Timer size={12} className="text-indigo-400" />
                            <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300">
                              {ex.rest} Rest
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {sortedEntries.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Log</h4>
            {sortedEntries.map((e) => {
              if (e.kind === 'note') {
                return (
                  <div key={e.id} className="flex justify-end">
                    <div className="flex items-center gap-2 bg-indigo-100 text-indigo-800 dark:bg-indigo-600/20 dark:text-indigo-300 rounded-lg px-3 py-1.5 text-xs max-w-[80%] font-mono">
                      <span className="break-all">{e.text}</span>
                      <button
                        onClick={() => deleteEntry(e.id)}
                        className="text-indigo-400 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              }
              if (!e.confirmed) return null;
              const summary =
                e.duration && e.duration.trim()
                  ? e.duration
                  : e.weight && Number(e.weight) > 0
                    ? `${e.reps}x ${e.weight}${e.unit}`
                    : `${e.reps}x`;
              return (
                <div key={e.id} className="flex justify-end">
                  <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-600/20 dark:text-emerald-300 rounded-lg px-3 py-1.5 text-xs max-w-[80%] font-mono">
                    <span className="break-all">
                      {e.exerciseName} — {summary}
                    </span>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="text-emerald-400 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-2">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 bg-white dark:bg-slate-950 pt-3 space-y-2">
        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3 border border-dashed border-slate-300 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('workoutChat.addExercise')}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={handleFinish}
          disabled={finishDisabled}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-600/20 active:translate-y-0.5 transition-all text-sm uppercase tracking-[0.2em] disabled:opacity-30"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> {t('workoutChat.saving')}
            </span>
          ) : (
            t('workoutChat.finish')
          )}
        </button>
      </div>
    </div>
  );
}
