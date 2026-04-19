/**
 * Local dev seed — populates the dev-user with training plans + historic workouts.
 * Run inside the compose network:
 *   docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm --no-deps \
 *     -v $(pwd)/backend:/app -w /app -e MONGO_URI=mongodb://admin:devsecret@mongodb:27017/fitness?authSource=admin \
 *     --entrypoint sh node:22-alpine -c "npm ci --silent && npx ts-node scripts/dev-seed.ts"
 */
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:devsecret@localhost:27017/fitness?authSource=admin';
const USER_ID = process.argv[2] || 'dev-user';

interface PlanExercise { name: string; setsReps: string; rest?: string; notes?: string }
interface PlanSection { name: string; duration?: string; exercises: PlanExercise[] }
interface PlanDoc {
  userId: string;
  name: string;
  workoutTitle: string;
  sections: PlanSection[];
  progressionNotes?: string;
}

const plans: PlanDoc[] = [
  {
    userId: USER_ID,
    name: 'Push Day',
    workoutTitle: 'Brust',
    sections: [{
      name: 'Hauptteil',
      exercises: [
        { name: 'Bankdrücken', setsReps: '4x6-8', rest: '2min' },
        { name: 'Schrägbankdrücken (KH)', setsReps: '3x8-10', rest: '90s' },
        { name: 'Butterfly (Maschine)', setsReps: '3x12', rest: '60s' },
        { name: 'Dips', setsReps: '3x10', rest: '60s' },
        { name: 'Trizepsdrücken am Kabel', setsReps: '3x12', rest: '60s' },
      ],
    }],
  },
  {
    userId: USER_ID,
    name: 'Pull Day',
    workoutTitle: 'Rücken',
    sections: [{
      name: 'Hauptteil',
      exercises: [
        { name: 'Kreuzheben', setsReps: '3x5', rest: '3min' },
        { name: 'Klimmzüge', setsReps: '4x6-8', rest: '2min' },
        { name: 'Rudern (KH)', setsReps: '3x10', rest: '90s' },
        { name: 'Latzug', setsReps: '3x12', rest: '60s' },
        { name: 'Bizeps Curls (KH)', setsReps: '3x12', rest: '60s' },
      ],
    }],
  },
  {
    userId: USER_ID,
    name: 'Leg Day',
    workoutTitle: 'Beine',
    sections: [{
      name: 'Hauptteil',
      exercises: [
        { name: 'Kniebeugen', setsReps: '4x6-8', rest: '2min' },
        { name: 'Beinpresse', setsReps: '3x10', rest: '90s' },
        { name: 'Rumänisches Kreuzheben', setsReps: '3x8', rest: '90s' },
        { name: 'Beinstrecker', setsReps: '3x12', rest: '60s' },
        { name: 'Wadenheben', setsReps: '4x15', rest: '45s' },
      ],
    }],
  },
];

const baseWeights: Record<string, number> = {
  'Bankdrücken': 70, 'Schrägbankdrücken (KH)': 22, 'Butterfly (Maschine)': 40,
  'Dips': 0, 'Trizepsdrücken am Kabel': 30,
  'Kreuzheben': 100, 'Klimmzüge': 0, 'Rudern (KH)': 22, 'Latzug': 60, 'Bizeps Curls (KH)': 12,
  'Kniebeugen': 80, 'Beinpresse': 120, 'Rumänisches Kreuzheben': 70,
  'Beinstrecker': 50, 'Wadenheben': 60,
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function todayIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}`);

  const Workout = mongoose.model('Workout', new mongoose.Schema({}, { strict: false, timestamps: true, collection: 'workouts' }));
  const Plan = mongoose.model('TrainingPlan', new mongoose.Schema({}, { strict: false, timestamps: true, collection: 'trainingplans' }));

  await Workout.deleteMany({ userId: USER_ID });
  await Plan.deleteMany({ userId: USER_ID });

  await Plan.insertMany(plans);
  console.log(`Seeded ${plans.length} training plans`);

  const workouts: Record<string, unknown>[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 90);

  const cur = new Date(start);
  let idx = 0;
  while (cur <= today) {
    const dow = cur.getDay();
    const skip = (dow === 0 && Math.random() > 0.3) || (dow === 3 && Math.random() > 0.5);
    if (!skip) {
      const plan = plans[idx % plans.length];
      idx++;
      const weekOffset = Math.floor((cur.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000));
      const exercises = plan.sections[0].exercises.map(ex => {
        const base = baseWeights[ex.name] ?? 20;
        const weight = Math.max(0, Math.round((base + weekOffset * 0.5 + (Math.random() * 5 - 2.5)) / 2.5) * 2.5);
        const numSets = rand(3, 4);
        const sets: Array<Record<string, unknown>> = [];
        for (let i = 0; i < numSets; i++) {
          sets.push({
            reps: rand(6, 12),
            weight: weight === 0 ? 0 : Math.max(0, weight - i * 2.5),
            unit: 'kg',
          });
        }
        return { name: ex.name, sets };
      });
      const date = new Date(cur);
      date.setHours(rand(6, 19), rand(0, 59), 0, 0);
      workouts.push({
        userId: USER_ID,
        date: todayIso(date),
        title: plan.workoutTitle,
        notes: Math.random() > 0.75 ? ['Gut gefühlt', 'Schwer', 'Neuer PR!', 'Deload', ''][rand(0, 4)] : '',
        exercises,
        duration: rand(35, 75),
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  await Workout.insertMany(workouts);
  console.log(`Seeded ${workouts.length} workouts for user ${USER_ID}`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
