import { Workout, IWorkout } from '../models/Workout';
import { ApiError } from '../errors/ApiError';

interface ListOptions {
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
}

interface ListResult {
  data: IWorkout[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const WorkoutService = {
  async list(userId: string, options: ListOptions): Promise<ListResult> {
    const { page, limit, dateFrom, dateTo } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId };
    if (dateFrom || dateTo) {
      const dateRange: Record<string, Date> = {};
      if (dateFrom) dateRange.$gte = new Date(dateFrom);
      if (dateTo) dateRange.$lte = new Date(dateTo);
      filter.date = dateRange;
    }

    const [data, total] = await Promise.all([
      Workout.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      Workout.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getDistinctTitles(userId: string): Promise<string[]> {
    const titles = await Workout.distinct('title', { userId });
    return titles.sort();
  },

  async getById(userId: string, id: string): Promise<IWorkout> {
    const workout = await Workout.findOne({ _id: id, userId });
    if (!workout) throw new ApiError(404, 'Workout not found');
    return workout;
  },

  async getLatestByTitle(userId: string, title: string): Promise<IWorkout | null> {
    return Workout.findOne({ userId, title }).sort({ date: -1 }).limit(1);
  },

  async create(
    userId: string,
    data: { title: string; date?: string; notes?: string; exercises?: unknown[]; duration?: number },
  ): Promise<IWorkout> {
    return Workout.create({
      userId,
      title: data.title,
      date: data.date ? new Date(data.date) : new Date(),
      notes: data.notes || '',
      exercises: data.exercises || [],
      duration: data.duration || 0,
    });
  },

  async update(userId: string, id: string, data: Record<string, unknown>): Promise<IWorkout> {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.date !== undefined) updates.date = new Date(data.date as string);
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.exercises !== undefined) updates.exercises = data.exercises;
    if (data.duration !== undefined) updates.duration = data.duration;

    const workout = await Workout.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true },
    );
    if (!workout) throw new ApiError(404, 'Workout not found');
    return workout;
  },

  async delete(userId: string, id: string): Promise<void> {
    const workout = await Workout.findOneAndDelete({ _id: id, userId });
    if (!workout) throw new ApiError(404, 'Workout not found');
  },
};
