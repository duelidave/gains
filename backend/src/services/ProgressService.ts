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

export const ProgressService = {
  async getProgression(
    userId: string,
    exerciseName: string,
    period: string,
  ): Promise<Array<{ date: string; value: number; isPR: boolean }>> {
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
      { $unwind: '$exercises.sets' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          bestWeight: { $max: { $ifNull: ['$exercises.sets.weight', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Compute PR flags using a running maximum
    let maxValue = 0;
    return result.map((r) => {
      const isPR = r.bestWeight > maxValue && r.bestWeight > 0;
      if (isPR) maxValue = r.bestWeight;
      return { date: r._id, value: r.bestWeight, isPR };
    });
  },
};
