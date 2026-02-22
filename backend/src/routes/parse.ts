import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../types';
import { sendProblem } from '../middleware/errorHandler';
import { createWorkoutSchema, parseRequestSchema, validateBody } from '../validation/schemas';
import { ExerciseService } from '../services/ExerciseService';
import { TrainingPlan } from '../models/TrainingPlan';

const router = Router();

const client = new Anthropic();

router.post('/', validateBody(parseRequestSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { messages } = req.body;

    // Fetch existing exercise names for normalization
    const existingNames = await ExerciseService.getNames(req.user!.keycloakId);
    const namesList = existingNames.slice(0, 200);

    const exerciseNameSection = namesList.length > 0
      ? `\nEXERCISE NAME NORMALIZATION:
The user has previously logged these exercise names:
${namesList.map(n => `- "${n}"`).join('\n')}

When the user types an exercise that matches one of these (even with different casing, spelling, abbreviation, singular/plural, or missing qualifiers like "(Maschine)" or "(KH)"), you MUST use the EXISTING name from the list above. Only create a new exercise name if it truly does not match any existing name.\n`
      : '';

    // Load user's training plans for dynamic workout types
    const plans = await TrainingPlan.find({ userId: req.user!.keycloakId });

    let workoutTypesSection: string;
    let exerciseHintsSection = '';

    if (plans.length > 0) {
      const typeLines = plans.map(p => {
        const exercises = p.sections.flatMap(s => s.exercises.map(e => e.name));
        return `- "${p.workoutTitle}" — ${p.name} (${exercises.slice(0, 5).join(', ')}${exercises.length > 5 ? ', etc.' : ''})`;
      }).join('\n');
      const titles = plans.map(p => `"${p.workoutTitle}"`).join(', ');
      workoutTypesSection = `WORKOUT TYPES (title must be exactly one of these):\n${typeLines}\n\nAlways map to exactly one of: ${titles} as the title.\nIf the workout type is unclear from context, infer it from the exercises.`;

      // Build exercise hints from plan sections
      const hints = plans.map(p => {
        const sectionHints = p.sections.map(s =>
          `  ${s.name}: ${s.exercises.map(e => `${e.name} (${e.setsReps})`).join(', ')}`
        ).join('\n');
        return `${p.name} (${p.workoutTitle}):\n${sectionHints}`;
      }).join('\n');
      exerciseHintsSection = `\nEXERCISE HINTS FROM TRAINING PLANS:\n${hints}\nUse these as reference for expected exercises and their typical sets/reps.\n`;
    } else {
      workoutTypesSection = `WORKOUT TYPES (title must be exactly one of these):
- "Brust" — chest workouts (Bankdrücken, Fliegende, Butterfly, Dips, etc.)
- "Rücken" — back workouts (Klimmzüge, Rudern, Latzug, Kreuzheben, etc.)
- "Beine" — leg workouts (Kniebeugen, Beinpresse, Ausfallschritte, Wadenheben, etc.)

The user may say things like "heute brust", "brust workout", "chest day", "rücken training", "leg day", "beine" etc.
Always map to exactly one of: "Brust", "Rücken", "Beine" as the title.
If the workout type is unclear from context, infer it from the exercises.`;
    }

    const today = new Date().toISOString().split('T')[0];

    const prompt = `You are a fitness workout parser. Parse the following gym workout messages into structured JSON.
The user logs exercises one message at a time. The first message usually indicates the workout type.
${exerciseNameSection}
${workoutTypesSection}
${exerciseHintsSection}

PARSING RULES:
- Exercise names: use existing names from the list above when possible, otherwise keep the original name
- "5x5 40kg" → 5 separate set objects each with reps: 5, weight: 40, unit: "kg"
- "3x8" without weight → 3 sets of 8 reps, weight: 0
- "pro Hand"/"per hand" → weight_unit: "per_hand". "pro Seite"/"per side" → weight_unit: "per_side"
- "bodyweight"/"bw" → category: "bodyweight", weight: 0
- Dropsets: "20/15/10kg 6+5+4" → 3 sets with type: "dropset", repsDisplay: "6+5+4", reps: 15 (total), weight_kg: [20,15,10], weight: 20 (max)
- If no weight specified for a strength exercise, set weight to 0

CATEGORIES:
- "strength" (default): has reps + weight
- "bodyweight": Dips, Klimmzüge, Liegestütze, Push-ups, Pull-ups without weight → reps only
- "bodyweight" timed: Plank, Wall Sit, Hollow Hold, L-Sit, Dead Hang, Superman Hold → duration in seconds. "Plank 90s" → duration: 90. "Plank 1:30" → duration: 90. Do NOT multiply — "90s" = 90 seconds.
- "cardio": has duration/distance. "10min Rudermaschine" → duration: 600 (seconds)

NOTES AND CONTEXT — IMPORTANT:
Any text in a user message that is NOT exercise name, sets, reps, or weight MUST be captured. Do not silently drop information.
- Rest periods: "90s Pause", "2min Pause" → rest_seconds on that exercise (90, 120)
- Exercise context: "pro Seite", "Stufe 3", "bei 3 eingehakt", "mit Pause oben" → exercise-level "notes" field
- General comments: "hat sich schwer angefühlt", "Schulter zwickt" → exercise-level "notes" if about a specific exercise, otherwise workout-level "notes"
- Multiple pieces of info: "Plank 90s mit 60s Pause" → duration: 90, rest_seconds: 60

Return this exact JSON structure:
{
  "title": "workout title from first message",
  "date": "${today}",
  "notes": "general workout comments if any",
  "exercises": [
    {
      "name": "Exercise Name",
      "category": "strength",
      "notes": "any context the user mentioned for this exercise",
      "rest_seconds": 90,
      "sets": [
        { "reps": 5, "weight": 40, "unit": "kg" }
      ]
    }
  ]
}

Set formats by category:
- strength: { "reps": 5, "weight": 40, "unit": "kg" }
- bodyweight: { "reps": 10, "weight": 0, "unit": "kg" }
- bodyweight timed: { "reps": 0, "weight": 0, "unit": "kg", "duration": 90 } (seconds, NOT minutes)
- cardio: { "duration": 600, "distance": 2.5, "distanceUnit": "km" }

Return ONLY valid JSON. No markdown fences, no explanation.

User messages:
${messages.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the JSON response, stripping any accidental markdown fences
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const rawParsed = JSON.parse(cleaned);

    // Validate LLM output against workout schema before returning
    const validated = createWorkoutSchema.safeParse(rawParsed);
    if (!validated.success) {
      console.error('LLM returned invalid workout structure:', validated.error.issues);
      sendProblem(res, 502, 'AI returned invalid workout structure, please try again', req.originalUrl);
      return;
    }

    res.json(validated.data);
  } catch (err) {
    console.error('Error parsing workout:', err);
    sendProblem(res, 500, 'Failed to parse workout', req.originalUrl);
  }
});

export default router;
