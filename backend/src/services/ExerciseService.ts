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

  async merge(userId: string, fromName: string, toName: string): Promise<number> {
    const result = await Workout.updateMany(
      { userId, 'exercises.name': fromName },
      { $set: { 'exercises.$[elem].name': toName } },
      { arrayFilters: [{ 'elem.name': fromName }] },
    );
    return result.modifiedCount;
  },
};
