import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../types';
import { sendProblem } from '../middleware/errorHandler';
import { createWorkoutSchema, parseRequestSchema, validateBody } from '../validation/schemas';

const router = Router();

const client = new Anthropic();

router.post('/', validateBody(parseRequestSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { messages } = req.body;

    const today = new Date().toISOString().split('T')[0];

    const prompt = `You are a fitness workout parser. Parse the following gym workout messages into structured JSON.
The user logs exercises one message at a time. The first message usually indicates the workout type.

WORKOUT TYPES (title must be exactly one of these):
- "Brust" — chest workouts (Bankdrücken, Fliegende, Butterfly, Dips, etc.)
- "Rücken" — back workouts (Klimmzüge, Rudern, Latzug, Kreuzheben, etc.)
- "Beine" — leg workouts (Kniebeugen, Beinpresse, Ausfallschritte, Wadenheben, etc.)

The user may say things like "heute brust", "brust workout", "chest day", "rücken training", "leg day", "beine" etc.
Always map to exactly one of: "Brust", "Rücken", "Beine" as the title.
If the workout type is unclear from context, infer it from the exercises.

Rules:
- Exercise names: keep the original name the user typed
- "5x5 40kg" means 5 sets of 5 reps at 40kg
- "3x8" without weight means 3 sets of 8 reps, weight: 0
- "pro Hand" or "per hand" means weight_unit: "per_hand"
- "pro Seite" or "per side" means weight_unit: "per_side"
- "bodyweight" or "bw" means category: "bodyweight", weight: 0
- Dropsets: "20/15/10kg 6+5+4" means 3 sets. Each set has type: "dropset", repsDisplay: "6+5+4", reps: 15 (total), weight_kg: [20,15,10], weight: 20 (max)
- Duration exercises (cardio): "10min Rudermaschine" → category: "cardio", one set with duration_minutes: 10
- rest_seconds if mentioned: "90s Pause" → rest_seconds: 90 on the preceding exercise
- If no weight specified for a strength exercise, set weight to 0
- Detect category: "strength" (default), "cardio" (has duration/minutes), "bodyweight" (explicitly stated or exercises like Dips, Klimmzüge, Liegestütze, Push-ups, Pull-ups without weight)
- For each exercise, create individual set objects. "5x5 40kg" → 5 separate set objects each with reps: 5, weight: 40, unit: "kg"

Return this exact JSON structure:
{
  "title": "workout title from first message",
  "date": "${today}",
  "notes": "",
  "exercises": [
    {
      "name": "Exercise Name",
      "category": "strength",
      "sets": [
        { "reps": 5, "weight": 40, "unit": "kg" }
      ]
    }
  ]
}

For cardio exercises, sets look like:
{ "duration": 600, "distance": 0, "distanceUnit": "km" }
where duration is in seconds.

For bodyweight exercises, sets look like:
{ "reps": 10, "weight": 0, "unit": "kg" }

Return ONLY valid JSON. No markdown fences, no explanation, no extra text.

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
