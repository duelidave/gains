import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../types';
import { sendProblem } from '../middleware/errorHandler';
import { createPlanSchema } from '../validation/schemas';
import { ExerciseService } from '../services/ExerciseService';
import { TrainingPlan } from '../models/TrainingPlan';
import { z } from 'zod';

const router = Router();
const client = new Anthropic();

const generatePlanRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  existingPlanId: z.string().optional(),
});

function validateBody(schema: z.ZodSchema) {
  return (req: any, res: Response, next: any): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const detail = result.error.issues
        .map((i: any) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      sendProblem(res, 400, detail, req.originalUrl);
      return;
    }
    req.body = result.data;
    next();
  };
}

router.post('/', validateBody(generatePlanRequestSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, existingPlanId } = req.body;

    // Fetch context: existing exercise names, existing plans
    const existingNames = await ExerciseService.getNames(req.user!.keycloakId);
    const existingPlans = await TrainingPlan.find({ userId: req.user!.keycloakId });

    // If editing an existing plan, load it
    let existingPlan = null;
    if (existingPlanId) {
      existingPlan = await TrainingPlan.findOne({
        _id: existingPlanId,
        userId: req.user!.keycloakId,
      });
    }

    const existingPlanContext = existingPlan
      ? `\nCURRENT PLAN TO MODIFY:
Name: "${existingPlan.name}"
Workout Title: "${existingPlan.workoutTitle}"
Sections:
${existingPlan.sections.map(s => `  ${s.name}:
${s.exercises.map(e => `    - ${e.name} (${e.setsReps}${e.rest ? `, rest: ${e.rest}` : ''}${e.notes ? `, notes: ${e.notes}` : ''})`).join('\n')}`).join('\n')}
${existingPlan.progressionNotes ? `Progression Notes: ${existingPlan.progressionNotes}` : ''}

The user wants to modify this plan. Apply their requested changes while keeping the rest intact.\n`
      : '';

    const existingPlansContext = existingPlans.length > 0
      ? `\nUSER'S EXISTING PLANS (for reference, avoid duplicating):
${existingPlans.map(p => `- "${p.name}" (${p.workoutTitle}): ${p.sections.map(s => s.name).join(', ')}`).join('\n')}\n`
      : '';

    const exerciseNamesContext = existingNames.length > 0
      ? `\nEXERCISE NAME NORMALIZATION:
The user has previously logged these exercises. Reuse these exact names when applicable:
${existingNames.slice(0, 150).map(n => `- "${n}"`).join('\n')}\n`
      : '';

    const systemPrompt = `You are an expert fitness coach and training plan designer. You create well-structured, effective training plans based on user requests.

KEY EXPERTISE:
- Strength training: progressive overload, periodization, compound movements first
- Hypertrophy: volume optimization, muscle group splits, appropriate rep ranges
- Exercise selection: proper exercise order (compounds before isolations), muscle group balance
- Set/rep schemes: 3-5x3-5 for strength, 3-4x8-12 for hypertrophy, 2-3x12-20 for endurance
- Rest periods: 2-3min for heavy compounds, 60-90s for accessories, 30-60s for isolation
- Common splits: Push/Pull/Legs, Upper/Lower, Full Body, Bro Split

LANGUAGE:
- The user is German-speaking. Use German exercise names where natural (e.g., "Bankdrücken" not "Bench Press", "Kniebeugen" not "Squats")
- But keep internationally recognized names if the user uses them (e.g., "Deadlift", "Dips")
- Plan names and section names should be in the user's language

EXERCISE NAMING:
- Be specific: "Schrägbankdrücken (KH)" not just "Schrägbank"
- Include equipment qualifiers: (KH) = Kurzhanteln/Dumbbells, (LH) = Langhantel/Barbell, (Maschine), (Kabel)
- Use consistent naming across sections

PLAN QUALITY:
- Each section should have 4-8 exercises (not too few, not too many)
- Start each section with the heaviest compound movements
- End with isolation/accessory work
- Include appropriate warm-up notes if relevant
- Set realistic set/rep schemes (e.g., "3x8-10", "4x6", "3x12-15")
- Include rest periods for key exercises
- Add progression notes when useful`;

    const userPrompt = `${existingPlanContext}${existingPlansContext}${exerciseNamesContext}
USER REQUEST:
${prompt}

Generate a training plan as JSON with this exact structure:
{
  "name": "Plan display name",
  "workoutTitle": "Short workout type identifier (e.g., 'Brust', 'Oberkörper', 'Push')",
  "sections": [
    {
      "name": "Section name (e.g., 'Hauptübungen', 'Warm-up')",
      "exercises": [
        {
          "name": "Exercise Name",
          "setsReps": "3x8-10",
          "rest": "90s",
          "notes": "optional notes"
        }
      ]
    }
  ],
  "progressionNotes": "Optional progression guidance"
}

RULES:
- "workoutTitle" must be short (1-2 words), used to categorize workouts
- Each section needs at least 1 exercise
- "setsReps" format: "3x10", "4x6-8", "3x12-15", "3xAMRAP", etc.
- "rest" format: "60s", "90s", "2min", etc. (optional)
- "notes" for exercise-specific tips (optional, keep brief)
- "progressionNotes" for overall plan progression advice (optional)

Return ONLY valid JSON. No markdown fences, no explanation.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const rawParsed = JSON.parse(cleaned);

    // Validate against plan schema
    const validated = createPlanSchema.safeParse(rawParsed);
    if (!validated.success) {
      console.error('LLM returned invalid plan structure:', validated.error.issues);
      sendProblem(res, 502, 'AI returned invalid plan structure, please try again', req.originalUrl);
      return;
    }

    res.json(validated.data);
  } catch (err) {
    console.error('Error generating plan:', err);
    sendProblem(res, 500, 'Failed to generate training plan', req.originalUrl);
  }
});

export default router;
