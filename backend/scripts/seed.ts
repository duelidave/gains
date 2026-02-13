import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:secret@localhost:27017/fitness?authSource=admin';
const KEYCLOAK_ID = process.argv[2] || 'demo-user-id';

interface ExerciseSet {
  reps: number;
  weight: number;
}

interface Exercise {
  name: string;
  sets: ExerciseSet[];
  distance?: number;
  duration?: number;
}

interface WorkoutDoc {
  userId: string;
  date: Date;
  title: string;
  notes: string;
  exercises: Exercise[];
  duration: number;
}

const workoutTemplates: Array<{ title: string; exercises: Array<{ name: string; type: 'strength' | 'cardio' }> }> = [
  {
    title: 'Upper Body Push',
    exercises: [
      { name: 'Bench Press', type: 'strength' },
      { name: 'Overhead Press', type: 'strength' },
      { name: 'Incline Dumbbell Press', type: 'strength' },
      { name: 'Tricep Dips', type: 'strength' },
    ],
  },
  {
    title: 'Upper Body Pull',
    exercises: [
      { name: 'Barbell Row', type: 'strength' },
      { name: 'Pull-Ups', type: 'strength' },
      { name: 'Face Pulls', type: 'strength' },
      { name: 'Bicep Curls', type: 'strength' },
    ],
  },
  {
    title: 'Leg Day',
    exercises: [
      { name: 'Squat', type: 'strength' },
      { name: 'Romanian Deadlift', type: 'strength' },
      { name: 'Leg Press', type: 'strength' },
      { name: 'Calf Raises', type: 'strength' },
    ],
  },
  {
    title: 'Full Body',
    exercises: [
      { name: 'Deadlift', type: 'strength' },
      { name: 'Bench Press', type: 'strength' },
      { name: 'Squat', type: 'strength' },
      { name: 'Barbell Row', type: 'strength' },
    ],
  },
  {
    title: 'Cardio & Core',
    exercises: [
      { name: 'Running', type: 'cardio' },
      { name: 'Plank', type: 'strength' },
      { name: 'Russian Twists', type: 'strength' },
    ],
  },
];

const baseWeights: Record<string, number> = {
  'Bench Press': 60, 'Overhead Press': 40, 'Incline Dumbbell Press': 20,
  'Tricep Dips': 0, 'Barbell Row': 50, 'Pull-Ups': 0, 'Face Pulls': 15,
  'Bicep Curls': 12, 'Squat': 80, 'Romanian Deadlift': 70, 'Leg Press': 120,
  'Calf Raises': 40, 'Deadlift': 100, 'Plank': 0, 'Russian Twists': 5,
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateExercise(template: { name: string; type: string }, weekOffset: number): Exercise {
  if (template.type === 'cardio') {
    return {
      name: template.name,
      sets: [{ reps: 1, weight: 0 }],
      distance: +(3 + Math.random() * 7).toFixed(1),
      duration: rand(20, 45),
    };
  }

  const base = baseWeights[template.name] || 20;
  // Slight progressive overload over 3 months
  const progression = weekOffset * 0.5;
  const weight = Math.round((base + progression + (Math.random() * 5 - 2.5)) / 2.5) * 2.5;

  const numSets = rand(3, 5);
  const sets: ExerciseSet[] = [];
  for (let i = 0; i < numSets; i++) {
    sets.push({
      reps: rand(6, 12),
      weight: Math.max(0, weight - i * 2.5),
    });
  }

  return { name: template.name, sets };
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Workout = mongoose.model('Workout', new mongoose.Schema({}, { strict: false, timestamps: true, collection: 'workouts' }));

  // Delete existing data for this user
  await Workout.deleteMany({ userId: KEYCLOAK_ID });

  const workouts: WorkoutDoc[] = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 90);

  const current = new Date(startDate);
  let templateIdx = 0;

  while (current <= now) {
    const dayOfWeek = current.getDay();

    // Workout on ~4-5 days per week (skip some Sundays and Wednesdays randomly)
    const skip = (dayOfWeek === 0 && Math.random() > 0.3) || (dayOfWeek === 3 && Math.random() > 0.5);

    if (!skip) {
      const template = workoutTemplates[templateIdx % workoutTemplates.length];
      templateIdx++;

      const weekOffset = Math.floor((current.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

      const exercises = template.exercises.map((e) => generateExercise(e, weekOffset));
      const duration = rand(35, 75);

      const notes = Math.random() > 0.7
        ? ['Felt great today!', 'Tough session', 'New PR on main lift!', 'Easy deload', 'Pushed hard'][rand(0, 4)]
        : '';

      const workoutDate = new Date(current);
      workoutDate.setHours(rand(6, 19), rand(0, 59), 0, 0);

      workouts.push({
        userId: KEYCLOAK_ID,
        date: workoutDate,
        title: template.title,
        notes,
        exercises,
        duration,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  await Workout.insertMany(workouts);
  console.log(`Seeded ${workouts.length} workouts for user ${KEYCLOAK_ID}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
