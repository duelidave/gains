import { Workout } from '../models/Workout';

export const ExerciseService = {
  async getNames(userId: string): Promise<string[]> {
    const result = await Workout.aggregate([
      { $match: { userId } },
      { $unwind: '$exercises' },
      { $group: { _id: '$exercises.name' } },
      { $sort: { _id: 1 } },
    ]);

    return result.map((r) => r._id as string);
  },
};
