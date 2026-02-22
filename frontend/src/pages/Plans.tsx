import { useEffect, useState } from 'react';
import { Plus, ArrowLeft, Edit, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogTitle } from '../components/ui/Dialog';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { getPlans, createPlan, updatePlan, deletePlan } from '../lib/api';
import type { TrainingPlan, PlanSection, PlanExercise } from '../types';

type ViewState = 'list' | 'view' | 'edit' | 'create';

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
    sections: plan.sections.length > 0 ? plan.sections.map(s => ({
      ...s,
      exercises: s.exercises.length > 0 ? [...s.exercises] : [emptyExercise()],
    })) : [emptySection()],
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
    plan.sections.forEach((_, i) => { expanded[i] = true; });
    setExpandedSections(expanded);
    setViewState('edit');
    setError('');
  };

  const handleView = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    const expanded: Record<number, boolean> = {};
    plan.sections.forEach((_, i) => { expanded[i] = true; });
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
    setForm(f => ({
      ...f,
      sections: f.sections.map((s, i) => i === idx ? { ...s, ...updates } : s),
    }));
  };

  const addSection = () => {
    setForm(f => ({ ...f, sections: [...f.sections, emptySection()] }));
    setExpandedSections(prev => ({ ...prev, [form.sections.length]: true }));
  };

  const removeSection = (idx: number) => {
    if (form.sections.length <= 1) return;
    setForm(f => ({ ...f, sections: f.sections.filter((_, i) => i !== idx) }));
  };

  // Exercise helpers
  const updateExercise = (sIdx: number, eIdx: number, updates: Partial<PlanExercise>) => {
    setForm(f => ({
      ...f,
      sections: f.sections.map((s, si) =>
        si === sIdx
          ? { ...s, exercises: s.exercises.map((e, ei) => ei === eIdx ? { ...e, ...updates } : e) }
          : s
      ),
    }));
  };

  const addExercise = (sIdx: number) => {
    setForm(f => ({
      ...f,
      sections: f.sections.map((s, si) =>
        si === sIdx ? { ...s, exercises: [...s.exercises, emptyExercise()] } : s
      ),
    }));
  };

  const removeExercise = (sIdx: number, eIdx: number) => {
    const section = form.sections[sIdx];
    if (section.exercises.length <= 1) return;
    setForm(f => ({
      ...f,
      sections: f.sections.map((s, si) =>
        si === sIdx ? { ...s, exercises: s.exercises.filter((_, ei) => ei !== eIdx) } : s
      ),
    }));
  };

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const totalExercises = (plan: TrainingPlan) =>
    plan.sections.reduce((sum, s) => sum + s.exercises.length, 0);

  // VIEW: Plan detail
  if (viewState === 'view' && selectedPlan) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 truncate">{selectedPlan.name}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{selectedPlan.workoutTitle}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={() => handleEdit(selectedPlan)}>
              <Edit size={14} /> {t('common.edit')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {selectedPlan.sections.map((section, sIdx) => (
          <Card key={sIdx}>
            <button
              className="w-full flex items-center justify-between"
              onClick={() => toggleSection(sIdx)}
            >
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{section.name}</h3>
                {section.duration && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{section.duration}</p>
                )}
              </div>
              {expandedSections[sIdx] ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
            </button>
            {expandedSections[sIdx] && (
              <div className="mt-3 space-y-2">
                {section.exercises.map((ex, eIdx) => (
                  <div key={eIdx} className="flex items-start gap-3 py-2 border-t border-zinc-200 dark:border-zinc-800 first:border-0 first:pt-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{ex.name}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{ex.setsReps}{ex.rest ? ` · ${ex.rest} ${t('plans.rest')}` : ''}</p>
                      {ex.notes && <p className="text-xs text-zinc-400 dark:text-zinc-500 italic mt-0.5">{ex.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}

        {selectedPlan.progressionNotes && (
          <Card>
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50 mb-2">{t('plans.progression')}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{selectedPlan.progressionNotes}</p>
          </Card>
        )}

        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
          <DialogTitle>{t('plans.deletePlan')}</DialogTitle>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {viewState === 'create' ? t('plans.newPlan') : t('plans.editPlan')}
          </h1>
        </div>

        {/* Plan metadata */}
        <Card>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('plans.planName')}</label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('plans.planNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('plans.workoutTitle')}</label>
              <Input
                value={form.workoutTitle}
                onChange={e => setForm(f => ({ ...f, workoutTitle: e.target.value }))}
                placeholder={t('plans.workoutTitlePlaceholder')}
              />
            </div>
          </div>
        </Card>

        {/* Sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('plans.sections')}</h2>
          </div>
          {form.sections.map((section, sIdx) => (
            <Card key={sIdx}>
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => toggleSection(sIdx)} className="text-zinc-400">
                  {expandedSections[sIdx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <Input
                  className="flex-1"
                  value={section.name}
                  onChange={e => updateSection(sIdx, { name: e.target.value })}
                  placeholder={t('plans.sectionName')}
                />
                <Input
                  className="w-28"
                  value={section.duration || ''}
                  onChange={e => updateSection(sIdx, { duration: e.target.value })}
                  placeholder={t('plans.duration')}
                />
                {form.sections.length > 1 && (
                  <button onClick={() => removeSection(sIdx)} className="text-zinc-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                )}
              </div>

              {expandedSections[sIdx] && (
                <div className="space-y-2 ml-6">
                  {section.exercises.map((ex, eIdx) => (
                    <div key={eIdx} className="flex items-start gap-2 py-2 border-t border-zinc-200 dark:border-zinc-800 first:border-0 first:pt-0">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          value={ex.name}
                          onChange={e => updateExercise(sIdx, eIdx, { name: e.target.value })}
                          placeholder={t('plans.exerciseName')}
                        />
                        <Input
                          value={ex.setsReps}
                          onChange={e => updateExercise(sIdx, eIdx, { setsReps: e.target.value })}
                          placeholder={t('plans.setsReps')}
                        />
                        <Input
                          value={ex.rest || ''}
                          onChange={e => updateExercise(sIdx, eIdx, { rest: e.target.value })}
                          placeholder={t('plans.restPlaceholder')}
                        />
                        <Input
                          value={ex.notes || ''}
                          onChange={e => updateExercise(sIdx, eIdx, { notes: e.target.value })}
                          placeholder={t('plans.notesPlaceholder')}
                        />
                      </div>
                      {section.exercises.length > 1 && (
                        <button onClick={() => removeExercise(sIdx, eIdx)} className="text-zinc-400 hover:text-red-500 mt-2">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addExercise(sIdx)}
                    className="text-xs text-blue-500 hover:text-blue-400 font-medium"
                  >
                    + {t('plans.addExercise')}
                  </button>
                </div>
              )}
            </Card>
          ))}
          <button
            onClick={addSection}
            className="text-xs text-blue-500 hover:text-blue-400 font-medium"
          >
            + {t('plans.addSection')}
          </button>
        </div>

        {/* Progression notes */}
        <Card>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('plans.progression')}</label>
          <textarea
            value={form.progressionNotes}
            onChange={e => setForm(f => ({ ...f, progressionNotes: e.target.value }))}
            placeholder={t('plans.progressionPlaceholder')}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        </Card>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
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

  // LIST: Plan cards
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t('plans.title')}</h1>
        <Button variant="primary" size="sm" onClick={handleCreate}>
          <Plus size={16} /> {t('plans.newPlan')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<Plus size={40} />}
          title={t('plans.noPlansYet')}
          description={t('plans.noPlansDescription')}
        />
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <Card
              key={plan._id}
              className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              onClick={() => handleView(plan)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {plan.workoutTitle} · {totalExercises(plan)} {t('common.exercises')}
                  </p>
                </div>
                <ChevronDown size={16} className="text-zinc-400 rotate-[-90deg]" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
