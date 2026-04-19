import { useEffect, useState } from 'react';
import {
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Zap,
  Dumbbell,
  Timer,
  BookOpen,
  Sparkles,
  Loader2,
  Send,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Dialog, DialogTitle } from '../components/ui/Dialog';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { getPlans, createPlan, updatePlan, deletePlan, generatePlan } from '../lib/api';
import type { TrainingPlan, PlanSection, PlanExercise } from '../types';

type ViewState = 'list' | 'view' | 'edit' | 'create' | 'generate';

const sectionIcons = [Zap, Dumbbell, Timer, BookOpen];

function getSectionIcon(idx: number) {
  return sectionIcons[idx % sectionIcons.length];
}

function emptyExercise(): PlanExercise {
  return { name: '', setsReps: '', rest: '', notes: '' };
}

function emptySection(): PlanSection {
  return { name: '', duration: '', exercises: [emptyExercise()] };
}

interface PlanFormData {
  name: string;
  workoutTitle: string;
  sections: PlanSection[];
  progressionNotes: string;
}

function emptyForm(): PlanFormData {
  return { name: '', workoutTitle: '', sections: [emptySection()], progressionNotes: '' };
}

function planToForm(plan: TrainingPlan): PlanFormData {
  return {
    name: plan.name,
    workoutTitle: plan.workoutTitle,
    sections:
      plan.sections.length > 0
        ? plan.sections.map((s) => ({
            ...s,
            exercises: s.exercises.length > 0 ? [...s.exercises] : [emptyExercise()],
          }))
        : [emptySection()],
    progressionNotes: plan.progressionNotes || '',
  };
}

export default function Plans() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await getPlans();
      setPlans(data);
    } catch {
      setError(t('plans.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setForm(emptyForm());
    setExpandedSections({ 0: true });
    setViewState('create');
    setError('');
  };

  const handleEdit = (plan: TrainingPlan) => {
    setForm(planToForm(plan));
    setSelectedPlan(plan);
    const expanded: Record<number, boolean> = {};
    plan.sections.forEach((_, i) => {
      expanded[i] = true;
    });
    setExpandedSections(expanded);
    setViewState('edit');
    setError('');
  };

  const handleView = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    const expanded: Record<number, boolean> = {};
    if (plan.sections.length > 0) expanded[0] = true;
    setExpandedSections(expanded);
    setViewState('view');
  };

  const handleBack = () => {
    setViewState('list');
    setSelectedPlan(null);
    setError('');
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (viewState === 'create') {
        await createPlan(form);
      } else if (viewState === 'edit' && selectedPlan) {
        await updatePlan(selectedPlan._id, form);
      }
      await loadPlans();
      setViewState('list');
      setSelectedPlan(null);
    } catch {
      setError(t('plans.failedToSave'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      await deletePlan(selectedPlan._id);
      await loadPlans();
      setViewState('list');
      setSelectedPlan(null);
      setConfirmDelete(false);
    } catch {
      setError(t('plans.failedToDelete'));
    } finally {
      setSubmitting(false);
    }
  };

  // Section helpers
  const updateSection = (idx: number, updates: Partial<PlanSection>) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) => (i === idx ? { ...s, ...updates } : s)),
    }));
  };

  const addSection = () => {
    setForm((f) => ({ ...f, sections: [...f.sections, emptySection()] }));
    setExpandedSections((prev) => ({ ...prev, [form.sections.length]: true }));
  };

  const removeSection = (idx: number) => {
    if (form.sections.length <= 1) return;
    setForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== idx) }));
  };

  // Exercise helpers
  const updateExercise = (sIdx: number, eIdx: number, updates: Partial<PlanExercise>) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, si) =>
        si === sIdx
          ? {
              ...s,
              exercises: s.exercises.map((e, ei) => (ei === eIdx ? { ...e, ...updates } : e)),
            }
          : s,
      ),
    }));
  };

  const addExercise = (sIdx: number) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, si) =>
        si === sIdx ? { ...s, exercises: [...s.exercises, emptyExercise()] } : s,
      ),
    }));
  };

  const removeExercise = (sIdx: number, eIdx: number) => {
    const section = form.sections[sIdx];
    if (section.exercises.length <= 1) return;
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, si) =>
        si === sIdx ? { ...s, exercises: s.exercises.filter((_, ei) => ei !== eIdx) } : s,
      ),
    }));
  };

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const totalExercises = (plan: TrainingPlan) =>
    plan.sections.reduce((sum, s) => sum + s.exercises.length, 0);

  const sectionPreview = (plan: TrainingPlan) =>
    plan.sections
      .map((s) => s.name)
      .filter(Boolean)
      .join(', ');

  /** Estimate total workout duration in minutes */
  const estimateDuration = (plan: TrainingPlan): number => {
    let totalSeconds = 0;
    for (const section of plan.sections) {
      for (const ex of section.exercises) {
        // Parse sets count from setsReps (e.g. "3x10", "4x6-8", "3xAMRAP")
        const setsMatch = ex.setsReps.match(/^(\d+)/);
        const sets = setsMatch ? parseInt(setsMatch[1], 10) : 3;

        // Time per set: ~40s for execution (including setup, reps, controlled tempo)
        const secondsPerSet = 40;
        totalSeconds += sets * secondsPerSet;

        // Rest between sets (not after the last set)
        const restStr = ex.rest || '60s';
        let restSeconds = 60; // default
        const restMatch = restStr.match(/(\d+)\s*s/i);
        const restMinMatch = restStr.match(/(\d+)\s*min/i);
        if (restMatch) restSeconds = parseInt(restMatch[1], 10);
        else if (restMinMatch) restSeconds = parseInt(restMinMatch[1], 10) * 60;
        totalSeconds += (sets - 1) * restSeconds;

        // Transition time between exercises (~30s)
        totalSeconds += 30;
      }
    }
    return Math.round(totalSeconds / 60);
  };

  const formatEstimatedDuration = (minutes: number): string => {
    if (minutes < 60) return `~${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `~${h}h ${m}min` : `~${h}h`;
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setError('');
    try {
      const generated = await generatePlan({ prompt: aiPrompt });
      // Pre-fill the form with the AI result and switch to create/edit view
      setForm({
        name: generated.name,
        workoutTitle: generated.workoutTitle,
        sections: generated.sections.map((s) => ({
          ...s,
          exercises: s.exercises.map((e) => ({ ...e })),
        })),
        progressionNotes: generated.progressionNotes || '',
      });
      const expanded: Record<number, boolean> = {};
      generated.sections.forEach((_, i) => {
        expanded[i] = true;
      });
      setExpandedSections(expanded);
      setViewState('create');
    } catch {
      setError(
        t('plans.failedToGenerate', { defaultValue: 'Failed to generate plan. Please try again.' }),
      );
    } finally {
      setAiGenerating(false);
    }
  };

  // VIEW: AI Generate
  if (viewState === 'generate') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setViewState('list');
              setAiPrompt('');
              setError('');
            }}
            className="text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t('plans.aiGenerate', { defaultValue: 'AI Plan Generator' })}
            </h1>
            <p className="text-sm text-slate-500">
              {t('plans.aiGenerateDescription', {
                defaultValue: 'Describe your training goals and get a plan.',
              })}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t('plans.whatDoYouWant', { defaultValue: 'What kind of plan do you need?' })}
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t('plans.aiPlaceholder', {
                defaultValue:
                  'e.g., "Erstelle einen Push/Pull/Legs Plan für Hypertrophie, 3x pro Woche. Fokus auf Brust und Rücken."',
              })}
              rows={4}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-3 space-y-1.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('plans.aiTips', { defaultValue: 'Tips for better results' })}
            </p>
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <li>
                •{' '}
                {t('plans.aiTip1', {
                  defaultValue: 'Mention your split (PPL, Upper/Lower, Full Body, ...)',
                })}
              </li>
              <li>
                •{' '}
                {t('plans.aiTip2', {
                  defaultValue: 'Specify your goal (Hypertrophie, Kraft, Ausdauer)',
                })}
              </li>
              <li>
                •{' '}
                {t('plans.aiTip3', { defaultValue: 'Add constraints (equipment, time, injuries)' })}
              </li>
              <li>
                •{' '}
                {t('plans.aiTip4', {
                  defaultValue: 'Mention focus areas (more chest, less legs, ...)',
                })}
              </li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!aiPrompt.trim() || aiGenerating}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {aiGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('plans.generating', { defaultValue: 'Generating plan...' })}
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {t('plans.generate', { defaultValue: 'Generate Plan' })}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // VIEW: Plan detail
  if (viewState === 'view' && selectedPlan) {
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('plans.title')}
        </button>

        {/* Expanded plan card */}
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/30 rounded-xl overflow-hidden shadow-xl shadow-indigo-950/20">
          {/* Plan header */}
          <div className="p-4 bg-indigo-500/5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                {selectedPlan.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-indigo-400/80 flex-wrap">
                <span>{selectedPlan.workoutTitle}</span>
                <span className="w-1 h-1 rounded-full bg-indigo-400/40"></span>
                <span className="flex items-center gap-1">
                  <Timer size={12} /> {formatEstimatedDuration(estimateDuration(selectedPlan))}
                </span>
                <span className="w-1 h-1 rounded-full bg-indigo-400/40"></span>
                <span>
                  {totalExercises(selectedPlan)} {t('common.exercises')}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleEdit(selectedPlan)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Accordion sections */}
          {selectedPlan.sections.map((section, sIdx) => {
            const Icon = getSectionIcon(sIdx);
            const isExpanded = expandedSections[sIdx];

            return (
              <div
                key={sIdx}
                className="border-b border-slate-200 dark:border-slate-800 last:border-b-0"
              >
                <button
                  className={`w-full p-4 flex items-center justify-between transition-colors ${
                    isExpanded
                      ? 'bg-slate-50 dark:bg-slate-50 dark:bg-slate-800/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'
                  }`}
                  onClick={() => toggleSection(sIdx)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isExpanded ? 'bg-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={isExpanded ? 'text-indigo-400' : 'text-slate-400'}
                      />
                    </div>
                    <div className="text-left">
                      <span
                        className={`font-bold ${isExpanded ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        {section.name}
                      </span>
                      {section.duration && (
                        <p className="text-xs text-slate-500">{section.duration}</p>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-600" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 py-2 space-y-1">
                    {section.exercises.map((ex, eIdx) => (
                      <div
                        key={eIdx}
                        className="py-3 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 last:border-b-0"
                      >
                        <div>
                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                            {ex.name}
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {ex.setsReps}
                            {ex.rest ? ` \u2022 ${ex.rest} ${t('plans.rest')}` : ''}
                          </p>
                          {ex.notes && (
                            <p className="text-xs text-slate-600 italic mt-0.5">{ex.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progression notes */}
        {selectedPlan.progressionNotes && (
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t('plans.progression')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
              {selectedPlan.progressionNotes}
            </p>
          </div>
        )}

        {/* AI Edit Section */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {t('plans.aiEdit', { defaultValue: 'Edit with AI' })}
            </h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && aiPrompt.trim() && !aiGenerating) {
                  e.preventDefault();
                  setAiGenerating(true);
                  setError('');
                  generatePlan({ prompt: aiPrompt, existingPlanId: selectedPlan._id })
                    .then((generated) => {
                      setForm({
                        name: generated.name,
                        workoutTitle: generated.workoutTitle,
                        sections: generated.sections.map((s) => ({
                          ...s,
                          exercises: s.exercises.map((e) => ({ ...e })),
                        })),
                        progressionNotes: generated.progressionNotes || '',
                      });
                      const expanded: Record<number, boolean> = {};
                      generated.sections.forEach((_, i) => {
                        expanded[i] = true;
                      });
                      setExpandedSections(expanded);
                      setSelectedPlan(selectedPlan);
                      setViewState('edit');
                      setAiPrompt('');
                    })
                    .catch(() =>
                      setError(
                        t('plans.failedToGenerate', {
                          defaultValue: 'Failed to generate. Try again.',
                        }),
                      ),
                    )
                    .finally(() => setAiGenerating(false));
                }
              }}
              placeholder={t('plans.aiEditPlaceholder', {
                defaultValue:
                  'e.g., "Ersetze Leg Curls durch Nordic Hamstring Curls" or "Mehr Mobility Übungen"',
              })}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => {
                if (!aiPrompt.trim() || aiGenerating) return;
                setAiGenerating(true);
                setError('');
                generatePlan({ prompt: aiPrompt, existingPlanId: selectedPlan._id })
                  .then((generated) => {
                    setForm({
                      name: generated.name,
                      workoutTitle: generated.workoutTitle,
                      sections: generated.sections.map((s) => ({
                        ...s,
                        exercises: s.exercises.map((e) => ({ ...e })),
                      })),
                      progressionNotes: generated.progressionNotes || '',
                    });
                    const expanded: Record<number, boolean> = {};
                    generated.sections.forEach((_, i) => {
                      expanded[i] = true;
                    });
                    setExpandedSections(expanded);
                    setSelectedPlan(selectedPlan);
                    setViewState('edit');
                    setAiPrompt('');
                  })
                  .catch(() =>
                    setError(
                      t('plans.failedToGenerate', {
                        defaultValue: 'Failed to generate. Try again.',
                      }),
                    ),
                  )
                  .finally(() => setAiGenerating(false));
              }}
              disabled={!aiPrompt.trim() || aiGenerating}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-40"
            >
              {aiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
          <DialogTitle>{t('plans.deletePlan')}</DialogTitle>
          <p className="text-slate-400 text-sm mb-6">
            {t('plans.confirmDelete', { name: selectedPlan.name })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="default" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={submitting}>
              {t('common.delete')}
            </Button>
          </div>
        </Dialog>
      </div>
    );
  }

  // EDIT/CREATE: Plan form
  if (viewState === 'edit' || viewState === 'create') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('plans.title')}
        </button>

        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {viewState === 'create' ? t('plans.newPlan') : t('plans.editPlan')}
        </h1>

        {/* Plan metadata */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              {t('plans.planName')}
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('plans.planNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              {t('plans.workoutTitle')}
            </label>
            <Input
              value={form.workoutTitle}
              onChange={(e) => setForm((f) => ({ ...f, workoutTitle: e.target.value }))}
              placeholder={t('plans.workoutTitlePlaceholder')}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t('plans.sections')}
            </h2>
          </div>
          {form.sections.map((section, sIdx) => {
            const Icon = getSectionIcon(sIdx);
            const isExpanded = expandedSections[sIdx];

            return (
              <div
                key={sIdx}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
              >
                {/* Section header */}
                <div className="p-4 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30">
                  <button
                    onClick={() => toggleSection(sIdx)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isExpanded ? 'bg-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={isExpanded ? 'text-indigo-400' : 'text-slate-400'}
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-600 shrink-0" />
                    )}
                  </button>
                  <Input
                    className="flex-1"
                    value={section.name}
                    onChange={(e) => updateSection(sIdx, { name: e.target.value })}
                    placeholder={t('plans.sectionName')}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Input
                    className="w-28"
                    value={section.duration || ''}
                    onChange={(e) => updateSection(sIdx, { duration: e.target.value })}
                    placeholder={t('plans.duration')}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {form.sections.length > 1 && (
                    <button
                      onClick={() => removeSection(sIdx)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Section exercises */}
                {isExpanded && (
                  <div className="px-4 py-3 space-y-2">
                    {section.exercises.map((ex, eIdx) => (
                      <div
                        key={eIdx}
                        className="flex items-start gap-2 py-2 border-b border-slate-200/50 dark:border-slate-800/50 last:border-b-0 last:pb-0 first:pt-0"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <Input
                            value={ex.name}
                            onChange={(e) => updateExercise(sIdx, eIdx, { name: e.target.value })}
                            placeholder={t('plans.exerciseName')}
                          />
                          <Input
                            value={ex.setsReps}
                            onChange={(e) =>
                              updateExercise(sIdx, eIdx, { setsReps: e.target.value })
                            }
                            placeholder={t('plans.setsReps')}
                          />
                          <Input
                            value={ex.rest || ''}
                            onChange={(e) => updateExercise(sIdx, eIdx, { rest: e.target.value })}
                            placeholder={t('plans.restPlaceholder')}
                          />
                          <Input
                            value={ex.notes || ''}
                            onChange={(e) => updateExercise(sIdx, eIdx, { notes: e.target.value })}
                            placeholder={t('plans.notesPlaceholder')}
                          />
                        </div>
                        {section.exercises.length > 1 && (
                          <button
                            onClick={() => removeExercise(sIdx, eIdx)}
                            className="text-slate-400 hover:text-red-400 mt-2 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addExercise(sIdx)}
                      className="text-xs text-indigo-500 hover:text-indigo-400 font-medium mt-2"
                    >
                      + {t('plans.addExercise')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={addSection}
            className="text-xs text-indigo-500 hover:text-indigo-400 font-medium"
          >
            + {t('plans.addSection')}
          </button>
        </div>

        {/* Progression notes */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            {t('plans.progression')}
          </label>
          <textarea
            value={form.progressionNotes}
            onChange={(e) => setForm((f) => ({ ...f, progressionNotes: e.target.value }))}
            placeholder={t('plans.progressionPlaceholder')}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="default" className="flex-1" onClick={handleBack} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSave}
            disabled={submitting || !form.name.trim() || !form.workoutTitle.trim()}
          >
            {submitting ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </div>
    );
  }

  // LIST: Plan cards with stats bento
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t('plans.title')}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setViewState('generate');
              setAiPrompt('');
              setError('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors active:scale-95"
          >
            <Sparkles size={14} /> AI
          </button>
          <Button variant="primary" size="sm" onClick={handleCreate}>
            <Plus size={16} /> {t('plans.newPlan')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<Plus size={40} />}
          title={t('plans.noPlansYet')}
          description={t('plans.noPlansDescription')}
        />
      ) : (
        <>
          {/* Stats bento */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                {t('plans.title')}
              </p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {plans.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                {t('common.exercises')}
              </p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {plans.reduce((sum, p) => sum + totalExercises(p), 0)}
              </p>
            </div>
          </div>

          {/* Plan cards */}
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan._id}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                onClick={() => handleView(plan)}
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    {plan.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Timer size={12} className="text-slate-400" />
                      {formatEstimatedDuration(estimateDuration(plan))}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                    <span>
                      {totalExercises(plan)} {t('common.exercises')}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                    <span className="truncate max-w-[200px]">
                      {sectionPreview(plan) || plan.workoutTitle}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-slate-400 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
