import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { parseWorkout, createWorkout, getLatestWorkout } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { formatWeight } from '../lib/units';
import { toDisplayExercise } from '../lib/mappers';
import type { WorkoutInput, Workout, ApiSet } from '../types';
import { formatDate } from '../lib/date';

type Phase = 'chat' | 'loading' | 'preview';

const CHAT_SESSION_KEY = 'gains-workout-chat';

interface ChatSessionState {
  messages: string[];
  phase: Phase;
  parsed: WorkoutInput | null;
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

function detectWorkoutTitle(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes('brust') || lower.includes('chest')) return 'Brust';
  if (lower.includes('rücken') || lower.includes('ruecken') || lower.includes('back')) return 'Rücken';
  if (lower.includes('bein') || lower.includes('leg')) return 'Beine';
  return null;
}

function summarizeSets(sets: ApiSet[], targetUnit: 'kg' | 'lbs'): string {
  if (sets.length === 0) return '';
  const reps = sets[0].reps;
  const weight = sets[0].weight;
  const allSame = sets.every(s => s.reps === reps && s.weight === weight);

  if (allSame && weight > 0) {
    return `${sets.length}x${reps} @ ${formatWeight(weight, (sets[0].unit || 'kg') as 'kg' | 'lbs', targetUnit)}`;
  }
  if (allSame) {
    return `${sets.length}x${reps}`;
  }
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
  const [showLastWorkout, setShowLastWorkout] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // On mount, if we have restored messages, fetch last workout reference
  useEffect(() => {
    if (messages.length > 0 && !lastWorkout) {
      const title = detectWorkoutTitle(messages[0]);
      if (title) fetchLastWorkout(title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (phase === 'chat') {
      inputRef.current?.focus();
    }
  }, [phase]);

  // Persist chat state to sessionStorage
  useEffect(() => {
    if (messages.length === 0 && phase === 'chat' && !parsed) {
      clearChatSession();
      return;
    }
    saveChatSession({ messages, phase: phase === 'loading' ? 'chat' : phase, parsed });
  }, [messages, phase, parsed]);

  // Map parsed API exercises to display exercises
  const displayExercises = useMemo(
    () => parsed?.exercises.map(toDisplayExercise) ?? [],
    [parsed]
  );

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    if (messages.length === 0) {
      const title = detectWorkoutTitle(text);
      if (title) fetchLastWorkout(title);
    }
    setMessages((prev) => [...prev, text]);
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
    setShowLastWorkout(true);
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
        <Loader2 size={32} className="text-blue-500 animate-spin" />
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t('workoutChat.parsing')}</p>
      </div>
    );
  }

  // Preview screen
  if (phase === 'preview' && parsed) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToChat}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t('workoutChat.reviewWorkout')}</h1>
        </div>

        {/* Title & date */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{parsed.title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatDate(parsed.date, 'long', i18n.language)}
          </p>
        </div>

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
                      <th className="text-left py-2 pr-4 font-medium">{t('workoutChat.reps')}</th>
                    )}
                    {exercise.category === 'strength' && (
                      <th className="text-left py-2 pr-4 font-medium">{t('workoutChat.weight')}</th>
                    )}
                    {exercise.category === 'cardio' && (
                      <th className="text-left py-2 pr-4 font-medium">{t('workoutChat.duration')}</th>
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
                            ? `${Math.floor(set.durationSeconds / 60)}min`
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

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {t('workoutChat.saving')}
              </>
            ) : (
              t('workoutChat.saveWorkout')
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleBackToChat}
            disabled={saving}
          >
            {t('workoutChat.backToChat')}
          </Button>
        </div>
      </div>
    );
  }

  // Chat screen
  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4">
        <button
          onClick={() => navigate('/workouts')}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">{t('workoutChat.newWorkout')}</h1>
        {messages.length > 0 && (
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <RotateCcw size={12} />
            {t('workoutChat.discard')}
          </button>
        )}
      </div>

      {/* Last workout reference */}
      {lastWorkoutLoading && <Skeleton className="h-20 mb-3" />}
      {lastWorkout && showLastWorkout && (
        <Card className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t('workoutChat.lastWorkout', {
                title: lastWorkout.title,
                date: formatDate(lastWorkout.date, 'compact', i18n.language),
              })}
            </p>
            <button
              onClick={() => setShowLastWorkout(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            {lastWorkout.exercises.map((ex, i) => (
              <div key={i}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{ex.name}</span>
                {' — '}
                <span className="tabular-nums">
                  {summarizeSets(ex.sets, settings.weightUnit)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <p className="text-zinc-600 dark:text-zinc-500 text-sm">
              {t('workoutChat.chooseType')}
            </p>
            <div className="flex justify-center gap-2">
              {([
                { key: 'chest', label: t('workoutChat.chest') },
                { key: 'back', label: t('workoutChat.back') },
                { key: 'legs', label: t('workoutChat.legs') },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setMessages([t('workoutChat.todayWorkout', { type: label })]);
                    setInput('');
                    inputRef.current?.focus();
                    const titleMap: Record<string, string> = { chest: 'Brust', back: 'Rücken', legs: 'Beine' };
                    fetchLastWorkout(titleMap[key]);
                  }}
                  className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-zinc-400 dark:text-zinc-600 text-xs">
              {t('workoutChat.example')}
            </p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="flex justify-end">
            <div className="bg-blue-600 rounded-2xl px-4 py-2 text-sm text-white max-w-[80%]">
              {msg}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-2">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="sticky bottom-0 bg-white dark:bg-zinc-950 pt-2 space-y-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={messages.length === 0 ? t('workoutChat.placeholderFirst') : t('workoutChat.addExercise')}
            className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-base md:text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            variant="primary"
            size="md"
            onClick={sendMessage}
            disabled={!input.trim()}
            className="px-3"
          >
            <Send size={16} />
          </Button>
        </div>
        <Button
          variant="primary"
          className="w-full"
          onClick={handleFinish}
          disabled={messages.length === 0}
        >
          <Check size={16} /> {t('workoutChat.finish')}
        </Button>
      </div>
    </div>
  );
}
