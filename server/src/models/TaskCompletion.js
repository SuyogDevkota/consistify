import mongoose from 'mongoose';

/**
 * Auditable completion / point-award record.
 * pointsAwarded is a snapshot at completion time so historical charts stay correct
 * even if the task's point value is later edited.
 */
const taskCompletionSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
    dateKey: { type: String, required: true },
    occurrence: { type: Number, required: true, min: 1, default: 1 },
    pointsAwarded: { type: Number, required: true, min: 0 },
    taskNameSnapshot: { type: String, required: true },
    undoneAt: { type: Date, default: null },
    undoneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// One active row per occurrence; undone rows remain available for audit history.
taskCompletionSchema.index(
  { group: 1, user: 1, task: 1, dateKey: 1, occurrence: 1 },
  {
    unique: true,
    partialFilterExpression: { undoneAt: null },
    name: 'uniq_active_completion_occurrence',
  }
);
taskCompletionSchema.index({ group: 1, dateKey: 1, undoneAt: 1 });
taskCompletionSchema.index({ group: 1, user: 1, dateKey: 1, undoneAt: 1 });
taskCompletionSchema.index({ user: 1, dateKey: 1 });

export const TaskCompletion = mongoose.model('TaskCompletion', taskCompletionSchema);
