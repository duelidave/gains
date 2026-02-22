import { Workout } from '../models/Workout';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFromDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case '1M': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case '3M': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '6M': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '1Y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default: return null; // 'All'
  }
}

interface ProgressionPoint {
  date: string;
  value: number;
  isPR: boolean;
  e1rm: number;
  isE1rmPR: boolean;
  bestSet: { reps: number; weight: number; setsCount: number } | null;
  workoutId: string | null;
}

export const ProgressService = {
  async getProgression(
    userId: string,
    exerciseName: string,
    period: string,
  ): Promise<ProgressionPoint[]> {
    if (!exerciseName) return [];

    const fromDate = getFromDate(period);
    const matchStage: Record<string, unknown> = { userId };
    if (fromDate) matchStage.date = { $gte: fromDate };

    const result = await Workout.aggregate([
      { $match: matchStage },
      { $unwind: '$exercises' },
      {
        $match: {
          'exercises.name': { $regex: new RegExp(`^${escapeRegex(exerciseName)}$`, 'i') },
        },
      },
      { $addFields: { workoutId: '$_id' } },
      { $unwind: '$exercises.sets' },
      {
        $addFields: {
          'exercises.sets.e1rm': {
            $cond: {
              if: { $and: [
                { $gt: [{ $ifNull: ['$exercises.sets.weight', 0] }, 0] },
                { $gt: [{ $ifNull: ['$exercises.sets.reps', 0] }, 0] },
              ]},
              then: {
                $multiply: [
                  '$exercises.sets.weight',
                  { $add: [1, { $divide: ['$exercises.sets.reps', 30] }] },
                ],
              },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          bestWeight: { $max: { $ifNull: ['$exercises.sets.weight', 0] } },
          bestE1rm: { $max: '$exercises.sets.e1rm' },
          sets: { $push: {
            reps: { $ifNull: ['$exercises.sets.reps', 0] },
            weight: { $ifNull: ['$exercises.sets.weight', 0] },
            e1rm: '$exercises.sets.e1rm',
            workoutId: '$workoutId',
          }},
        },
      },
      { $sort: { _id: 1 } },
    ]);

    let maxWeight = 0;
    let maxE1rm = 0;

    return result.map((r) => {
      const isPR = r.bestWeight > maxWeight && r.bestWeight > 0;
      if (isPR) maxWeight = r.bestWeight;

      const bestE1rm = Math.round(r.bestE1rm * 10) / 10;
      const isE1rmPR = bestE1rm > maxE1rm && bestE1rm > 0;
      if (isE1rmPR) maxE1rm = bestE1rm;

      // Find the set that produced the best e1RM
      const bestSetData = r.sets.reduce(
        (best: { reps: number; weight: number; e1rm: number; workoutId: unknown } | null, s: { reps: number; weight: number; e1rm: number; workoutId: unknown }) =>
          (!best || s.e1rm > best.e1rm) ? s : best,
        null,
      );

      const setsCount = bestSetData
        ? r.sets.filter((s: { reps: number; weight: number }) =>
            s.reps === bestSetData.reps && s.weight === bestSetData.weight
          ).length
        : 0;

      return {
        date: r._id,
        value: r.bestWeight,
        isPR,
        e1rm: bestE1rm,
        isE1rmPR,
        bestSet: bestSetData ? {
          reps: bestSetData.reps,
          weight: bestSetData.weight,
          setsCount,
        } : null,
        workoutId: bestSetData?.workoutId ? bestSetData.workoutId.toString() : null,
      };
    });
  },
};
