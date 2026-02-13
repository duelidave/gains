import { Workout } from '../models/Workout';

function getDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const StatsService = {
  async getStreak(userId: string): Promise<{ current: number; longest: number }> {
    const result = await Workout.aggregate([
      { $match: { userId } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } } },
      { $sort: { _id: 1 } },
    ]);

    if (result.length === 0) return { current: 0, longest: 0 };

    const dates = result.map((r) => r._id as string);
    const dateSet = new Set(dates);

    // Current streak: walk backwards from today (or yesterday if no workout today)
    let current = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    if (!dateSet.has(getDateStr(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (dateSet.has(getDateStr(checkDate))) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Longest streak: scan sorted dates for consecutive days
    let longest = 1;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        streak++;
      } else {
        longest = Math.max(longest, streak);
        streak = 1;
      }
    }
    longest = Math.max(longest, streak);

    return { current, longest };
  },

  async getWeekly(userId: string): Promise<Array<{ day: string; count: number }>> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const result = await Workout.aggregate([
      { $match: { userId, date: { $gte: weekStart, $lt: weekEnd } } },
      { $group: { _id: { $isoDayOfWeek: '$date' }, count: { $sum: 1 } } },
    ]);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const countMap = new Map<number, number>();
    for (const doc of result) {
      countMap.set(doc._id, doc.count);
    }
    return days.map((day, i) => ({ day, count: countMap.get(i + 1) || 0 }));
  },

  async getVolume(userId: string): Promise<Array<{ week: string; volume: number }>> {
    const weeksBack = 8;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - weeksBack * 7);
    start.setHours(0, 0, 0, 0);

    const result = await Workout.aggregate([
      { $match: { userId, date: { $gte: start } } },
      { $unwind: '$exercises' },
      { $unwind: '$exercises.sets' },
      {
        $group: {
          _id: {
            $floor: {
              $divide: [{ $subtract: [now, '$date'] }, 604800000],
            },
          },
          volume: {
            $sum: {
              $multiply: [
                { $ifNull: ['$exercises.sets.reps', 0] },
                { $ifNull: ['$exercises.sets.weight', 0] },
              ],
            },
          },
        },
      },
      { $match: { _id: { $gte: 0, $lt: weeksBack } } },
    ]);

    const weekMap = new Map<number, number>();
    for (const doc of result) {
      weekMap.set(doc._id, Math.round(doc.volume));
    }

    return Array.from({ length: weeksBack }, (_, i) => ({
      week: `W${i + 1}`,
      volume: weekMap.get(weeksBack - 1 - i) || 0,
    }));
  },

  async getTopExercises(
    userId: string,
    limit = 10,
  ): Promise<Array<{ name: string; count: number }>> {
    return Workout.aggregate([
      { $match: { userId } },
      { $unwind: '$exercises' },
      { $group: { _id: '$exercises.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ]);
  },

  async getOverview(userId: string): Promise<{
    workoutsThisWeek: number;
    workoutsThisMonth: number;
    totalWorkouts: number;
  }> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await Workout.aggregate([
      { $match: { userId } },
      {
        $facet: {
          week: [{ $match: { date: { $gte: weekStart } } }, { $count: 'count' }],
          month: [{ $match: { date: { $gte: monthStart } } }, { $count: 'count' }],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const facet = result[0];
    return {
      workoutsThisWeek: facet.week[0]?.count || 0,
      workoutsThisMonth: facet.month[0]?.count || 0,
      totalWorkouts: facet.total[0]?.count || 0,
    };
  },

  async getHistory(userId: string): Promise<{ history: Array<{ date: string; count: number }> }> {
    const result = await Workout.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return { history: result.map((r) => ({ date: r._id, count: r.count })) };
  },
};
