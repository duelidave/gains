import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Check, Loader2, RotateCcw, ChevronDown, ChevronUp, Plus, Timer, Dumbbell, X, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../components/ui/Skeleton';
import { parseWorkout, createWorkout, getLatestWorkout, getPlans } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { formatWeight, formatDuration } from '../lib/units';
import { toDisplayExercise, detectColumns } from '../lib/mappers';
import type { WorkoutInput, Workout, ApiSet, TrainingPlan } from '../types';
import { formatDate } from '../lib/date';
import { CHAT_SESSION_KEY } from '../lib/chatSession';

type Phase = 'chat' | 'loading' | 'preview';

interface ChatSessionState {
  messages: string[];
  phase: Phase;
  parsed: WorkoutInput | null;
  selectedPlanId: string | null;
}

function loadChatSession(): ChatSessionState | null {
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChatSessionState;
  } catch {
    return null;
  }
}

function saveChatSession(state: ChatSessionState): void {
  try {
    sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable
  }
}

function clearChatSession(): void {
  sessionStorage.removeItem(CHAT_SESSION_KEY);
}

function detectWorkoutTitle(message: string, plans?: TrainingPlan[]): string | null {
  const lower = message.toLowerCase();
  if (plans && plans.length > 0) {
    for (const plan of plans) {
      if (lower.includes(plan.name.toLowerCase()) || lower.includes(plan.workoutTitle.toLowerCase())) {
        return plan.workoutTitle;
      }
    }
  }
  if (lower.includes('brust') || lower.includes('chest')) return 'Brust';
  if (lower.includes('rücken') || lower.includes('ruecken') || lower.includes('back')) return 'Rücken';
  if (lower.includes('bein') || lower.includes('leg')) return 'Beine';
  return null;
}

function summarizeSets(sets: ApiSet[], targetUnit: 'kg' | 'lbs'): string {
  if (sets.length === 0) return '';
  const hasDuration = sets.some(s => (s.duration ?? 0) > 0);
  if (hasDuration) {
    const durations = sets.map(s => s.duration ?? 0);
    const allSame = durations.every(d => d === durations[0]);
    if (allSame) return `${sets.length}x ${formatDuration(durations[0])}`;
    return sets.map(s => formatDuration(s.duration ?? 0)).join(', ');
  }
  const reps = sets[0].reps;
  const weight = sets[0].weight;
  const allSame = sets.every(s => s.reps === reps && s.weight === weight);
  if (allSame && weight > 0) {
    return `${sets.length}x${reps} @ ${formatWeight(weight, (sets[0].unit || 'kg') as 'kg' | 'lbs', targetUnit)}`;
  }
  if (allSame) return `${sets.length}x${reps}`;
  return sets.map(s => s.weight > 0 ? `${s.reps}@${s.weight}` : `${s.reps}`).join(', ');
}

export default function WorkoutChat() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const saved = loadChatSession();
  const [messages, setMessages] = useState<string[]>(saved?.messages ?? []);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>(saved?.phase === 'preview' ? 'preview' : 'chat');
  const [parsed, setParsed] = useState<WorkoutInput | null>(saved?.parsed ?? null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);
  const [lastWorkoutLoading, setLastWorkoutLoading] = useState(false);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [setInputs, setSetInputs] = useState<Record<string, { reps: string; weight: string }[]>>({});
  const [skippedExercises, setSkippedExercises] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedPlanIdRef = useRef<string | null>(saved?.selectedPlanId ?? null);

  const fetchLastWorkout = useCallback(async (title: string) => {
    setLastWorkoutLoading(true);
    try {
      const workout = await getLatestWorkout(title);
      setLastWorkout(workout);
    } catch {
      // non-critical
    } finally {
      setLastWorkoutLoading(false);
    }
  }, []);

  useEffect(() => {
    getPlans().then((loaded) => {
      setPlans(loaded);
      if (savedPlanIdRef.current && !selectedPlan) {
        const match = loaded.find(p => p._id === savedPlanIdRef.current);
        if (match) setSelectedPlan(match);
        savedPlanIdRef.current = null;
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length > 0 && !lastWorkout) {
      const title = detectWorkoutTitle(messages[0], plans);
      if (title) fetchLastWorkout(title);
    }
  }, [plans]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const prevPhaseRef = useRef<Phase | null>(null);
  useEffect(() => {
    if (prevPhaseRef.current && prevPhaseRef.current !== 'chat' && phase === 'chat') {
      inputRef.current?.focus();
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (messages.length === 0 && phase === 'chat' && !parsed) {
      clearChatSession();
      return;
    }
    saveChatSession({
      messages,
      phase: phase === 'loading' ? 'chat' : phase,
      parsed,
      selectedPlanId: selectedPlan?._id ?? null,
    });
  }, [messages, phase, parsed, selectedPlan]);

  const displayExercises = useMemo(
    () => parsed?.exercises.map(toDisplayExercise) ?? [],
    [parsed]
  );

  const getLastExerciseData = useCallback((exerciseName: string) => {
    if (!lastWorkout) return null;
    return lastWorkout.exercises.find(
      e => e.name.toLowerCase() === exerciseName.toLowerCase()
    ) ?? null;
  }, [lastWorkout]);

  const isExerciseUsed = useCallback((name: string) => {
    return messages.some(m => m.toLowerCase().includes(name.toLowerCase()));
  }, [messages]);

  const handleConfirmSet = (exerciseName: string, setIndex: number) => {
    const inputs = setInputs[exerciseName];
    if (!inputs || !inputs[setIndex]) return;
    const { reps, weight } = inputs[setIndex];
    if (!reps.trim()) return;

    const text = weight.trim()
      ? `${exerciseName}: ${reps}x ${weight}kg`
      : `${exerciseName}: ${reps}x`;
    setMessages(prev => [...prev, text]);
    setError('');
  };

  const handleAddSet = (exerciseName: string) => {
    setSetInputs(prev => {
      const current = prev[exerciseName] || [];
      // Prefill from last workout data or copy last input
      const lastEx = getLastExerciseData(exerciseName);
      const nextIdx = current.length;
      let defaultReps = '';
      let defaultWeight = '';
      if (lastEx && lastEx.sets[nextIdx]) {
        defaultReps = String(lastEx.sets[nextIdx].reps ?? '');
        defaultWeight = String(lastEx.sets[nextIdx].weight ?? '');
      } else if (current.length > 0) {
        defaultReps = current[current.length - 1].reps;
        defaultWeight = current[current.length - 1].weight;
      }
      return { ...prev, [exerciseName]: [...current, { reps: defaultReps, weight: defaultWeight }] };
    });
  };

  const handleExpandExercise = (exerciseName: string) => {
    if (expandedExercise === exerciseName) {
      setExpandedExercise(null);
      return;
    }
    setExpandedExercise(exerciseName);
    // Initialize set inputs if not already done
    if (!setInputs[exerciseName]) {
      const lastEx = getLastExerciseData(exerciseName);
      if (lastEx && lastEx.sets.length > 0) {
        setSetInputs(prev => ({
          ...prev,
          [exerciseName]: lastEx.sets.map(s => ({
            reps: String(s.reps ?? ''),
            weight: String(s.weight ?? ''),
          }))
        }));
      } else {
        setSetInputs(prev => ({
          ...prev,
          [exerciseName]: [{ reps: '', weight: '' }]
        }));
      }
    }
  };

  const updateSetInput = (exerciseName: string, setIndex: number, field: 'reps' | 'weight', value: string) => {
    setSetInputs(prev => {
      const current = [...(prev[exerciseName] || [])];
      current[setIndex] = { ...current[setIndex], [field]: value };
      return { ...prev, [exerciseName]: current };
    });
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    if (messages.length === 0) {
      const title = detectWorkoutTitle(text, plans);
      if (title) {
        fetchLastWorkout(title);
        const match = plans.find(p => p.workoutTitle === title);
        if (match) setSelectedPlan(match);
      }
    }
    setMessages(prev => [...prev, text]);
    setInput('');
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFinish = async () => {
    if (messages.length === 0) return;
    setPhase('loading');
    setError('');
    try {
      const result = await parseWorkout(messages);
      setParsed(result);
      setPhase('preview');
    } catch {
      setError(t('workoutChat.failedToParse'));
      setPhase('chat');
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setSaving(true);
    setError('');
    try {
      const created = await createWorkout(parsed);
      clearChatSession();
      navigate(`/workouts/${created._id}`);
    } catch {
      setError(t('workoutChat.failedToSave'));
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    clearChatSession();
    setMessages([]);
    setPhase('chat');
    setParsed(null);
    setError('');
    setLastWorkout(null);
    setSelectedPlan(null);
    setExpandedExercise(null);
    setSetInputs({});
    setSkippedExercises(new Set());
  };

  const handleBackToChat = () => {
    setPhase('chat');
    setParsed(null);
    setError('');
  };

  // Loading screen
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">{t('workoutChat.parsing')}</p>
      </div>
    );
  }

  // Preview screen
  if (phase === 'preview' && parsed) {
    return (
      <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4">
          <button
            onClick={handleBackToChat}
            className="w-9 h-9 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 truncate">{parsed.title}</h1>
            <p className="text-sm text-slate-400">
              {formatDate(parsed.date, 'long', i18n.language)}
            </p>
          </div>
        </div>

        {/* Exercises — scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {displayExercises.map((exercise, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{exercise.name}</h3>
                    <span className="text-xs text-slate-500">{exercise.category}</span>
                  </div>
                </div>
              </div>
              {exercise.notes && (
                <p className="px-4 pb-2 text-xs text-slate-500 italic">{exercise.notes}</p>
              )}
              {(() => {
                const cols = detectColumns(exercise.sets);
                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                        <th className="py-3 px-4 text-left">#</th>
                        {cols.showReps && <th className="py-3 px-4 text-left">{t('workoutChat.reps')}</th>}
                        {cols.showWeight && <th className="py-3 px-4 text-right">{t('workoutChat.weight')}</th>}
                        {cols.showDuration && <th className="py-3 px-4 text-right">{t('workoutChat.duration')}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {exercise.sets.map((set, si) => (
                        <tr key={si} className={si % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/20' : ''}>
                          <td className="py-3 px-4 text-slate-500 font-mono">{si + 1}</td>
                          {cols.showReps && (
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {set.isDropset && set.repsDisplay ? set.repsDisplay : set.reps || '-'}
                            </td>
                          )}
                          {cols.showWeight && (
                            <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {set.weight > 0
                                ? formatWeight(set.weight, set.unit as 'kg' | 'lbs', settings.weightUnit)
                                : '-'}
                            </td>
                          )}
                          {cols.showDuration && (
                            <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {set.durationSeconds != null && set.durationSeconds > 0
                                ? formatDuration(set.durationSeconds) : '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 bg-white dark:bg-slate-950 pt-2 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-600/20 active:translate-y-0.5 transition-all text-sm uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> {t('workoutChat.saving')}
              </span>
            ) : (
              t('workoutChat.saveWorkout')
            )}
          </button>
          <button
            onClick={handleBackToChat}
            disabled={saving}
            className="w-full py-3 text-slate-500 font-bold text-sm hover:text-slate-300 transition-colors"
          >
            {t('workoutChat.backToChat')}
          </button>
        </div>
      </div>
    );
  }

  // Chat screen — main workout tracking UI
  const planExercises = selectedPlan
    ? selectedPlan.sections.flatMap(s => s.exercises)
    : [];

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workouts')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{t('workoutChat.newWorkout')}</h1>
            {selectedPlan && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{selectedPlan.name}</span>
            )}
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <RotateCcw size={12} />
            {t('workoutChat.discard')}
          </button>
        )}
      </div>

      {/* Main scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
        {/* Plan selection (when no messages yet) */}
        {messages.length === 0 && (
          <div className="space-y-4 py-6">
            <p className="text-slate-500 text-sm text-center">
              {t('workoutChat.chooseType')}
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm mx-auto">
              {plans.length > 0 ? (
                plans.map((plan) => (
                  <button
                    key={plan._id}
                    onClick={() => {
                      setMessages([t('workoutChat.todayWorkout', { type: plan.name })]);
                      setInput('');
                      setSelectedPlan(plan);
                      fetchLastWorkout(plan.workoutTitle);
                    }}
                    className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.98] transition-all flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Dumbbell size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold">{plan.name}</span>
                      <span className="text-xs text-slate-500">
                        {plan.sections.flatMap(s => s.exercises).length} {t('workoutChat.exercises', { count: plan.sections.flatMap(s => s.exercises).length })}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                [
                  { key: 'chest', label: t('workoutChat.chest') },
                  { key: 'back', label: t('workoutChat.back') },
                  { key: 'legs', label: t('workoutChat.legs') },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setMessages([t('workoutChat.todayWorkout', { type: label })]);
                      setInput('');
                      const titleMap: Record<string, string> = { chest: 'Brust', back: 'Rücken', legs: 'Beine' };
                      fetchLastWorkout(titleMap[key]);
                    }}
                    className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.98] transition-all"
                  >
                    {label}
                  </button>
                ))
              )}
            </div>
            <p className="text-slate-600 text-xs text-center">
              {t('workoutChat.example')}
            </p>
          </div>
        )}

        {/* Exercise Tracker Panel — replaces chips */}
        {selectedPlan && messages.length > 0 && (
          <div className="space-y-2">
            {lastWorkoutLoading && <Skeleton className="h-16 rounded-xl" />}
            {planExercises.map((ex, i) => {
              const used = isExerciseUsed(ex.name);
              const isSkipped = skippedExercises.has(ex.name);
              const lastEx = getLastExerciseData(ex.name);
              const lastSummary = lastEx ? summarizeSets(lastEx.sets, settings.weightUnit) : null;
              const isExpanded = expandedExercise === ex.name;
              const currentSets = setInputs[ex.name] || [];

              // Skipped exercise — compact row with undo
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
                      onClick={() => setSkippedExercises(prev => {
                        const next = new Set(prev);
                        next.delete(ex.name);
                        return next;
                      })}
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
                        ? 'bg-white dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 opacity-60'
                        : 'bg-white dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50'
                  }`}
                >
                  {/* Exercise header — always visible */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleExpandExercise(ex.name)}
                      className="flex-1 p-4 flex items-center gap-3 text-left"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        used
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isExpanded
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {used ? (
                          <Check size={14} strokeWidth={3} />
                        ) : (
                          <Dumbbell size={14} />
                        )}
                      </div>
                      <div>
                        <h3 className={`font-bold text-sm ${used ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {ex.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {used && lastSummary
                            ? lastSummary
                            : ex.setsReps || (lastSummary ? `Last: ${lastSummary}` : '')
                          }
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 pr-3">
                      {!used && !isExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSkippedExercises(prev => new Set(prev).add(ex.name));
                            if (expandedExercise === ex.name) setExpandedExercise(null);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Skip exercise"
                        >
                          <X size={14} />
                        </button>
                      )}
                      {isExpanded
                        ? <ChevronUp size={16} className="text-slate-400" />
                        : <ChevronDown size={16} className="text-slate-600" />
                      }
                    </div>
                  </div>

                  {/* Expanded: Set logging interface */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Target & last workout info */}
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

                      {/* Set rows */}
                      {currentSets.map((setInput, si) => {
                        const isConfirmed = messages.some(m =>
                          m.toLowerCase().includes(ex.name.toLowerCase()) &&
                          m.includes(`${setInput.reps}x`)
                        );
                        return (
                          <div
                            key={si}
                            className={`flex items-center gap-3 p-2 rounded-lg border ${
                              isConfirmed
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="w-6 font-mono text-xs text-slate-500 font-bold">{si + 1}</div>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={setInput.weight}
                                  onChange={e => updateSetInput(ex.name, si, 'weight', e.target.value)}
                                  placeholder="kg"
                                  className="w-full bg-white dark:bg-slate-900 border-none rounded-md text-sm font-mono text-center focus:ring-1 focus:ring-indigo-500 py-2 text-slate-900 dark:text-slate-50"
                                />
                                <span className="absolute right-2 top-2.5 text-[10px] text-slate-600 font-bold">KG</span>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={setInput.reps}
                                  onChange={e => updateSetInput(ex.name, si, 'reps', e.target.value)}
                                  placeholder="reps"
                                  className="w-full bg-white dark:bg-slate-900 border-none rounded-md text-sm font-mono text-center focus:ring-1 focus:ring-indigo-500 py-2 text-slate-900 dark:text-slate-50"
                                />
                                <span className="absolute right-2 top-2.5 text-[10px] text-slate-600 font-bold">REPS</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleConfirmSet(ex.name, si)}
                              disabled={!setInput.reps.trim()}
                              className={`w-10 h-10 rounded-lg flex items-center justify-center active:scale-95 transition-transform ${
                                isConfirmed
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-emerald-500 text-slate-950'
                              } disabled:opacity-30`}
                            >
                              <Check size={18} strokeWidth={3} />
                            </button>
                          </div>
                        );
                      })}

                      {/* Footer: Add Set + Rest Timer */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handleAddSet(ex.name)}
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

        {/* Message log (compact, below exercise panel) */}
        {messages.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Log</h4>
            {messages.map((msg, idx) => (
              <div key={idx} className="flex justify-end">
                <div className="bg-indigo-100 text-indigo-800 dark:bg-indigo-600/20 dark:text-indigo-300 rounded-lg px-3 py-1.5 text-xs max-w-[80%] font-mono">
                  {msg}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-2">
          {error}
        </div>
      )}

      {/* Bottom input area */}
      <div className="sticky bottom-0 bg-white dark:bg-slate-950 pt-3 space-y-2">
        {/* Quick add text input */}
        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3 border border-dashed border-slate-300 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={messages.length === 0 ? t('workoutChat.placeholderFirst') : t('workoutChat.addExercise')}
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

        {/* Finish Workout button */}
        {messages.length > 0 && (
          <button
            onClick={handleFinish}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-600/20 active:translate-y-0.5 transition-all text-sm uppercase tracking-[0.2em]"
          >
            {t('workoutChat.finish')}
          </button>
        )}
      </div>
    </div>
  );
}
