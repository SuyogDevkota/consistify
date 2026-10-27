import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    icon: { type: String, default: '✦', maxlength: 8 },
    points: { type: Number, required: true, min: 1, max: 1000, default: 10 },
    active: { type: Boolean, default: true },
    dailyLimit: { type: Number, default: 1, min: 1, max: 50 },
    scheduleDays: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.every((d) => d >= 0 && d <= 6);
        },
      },
    },
    startDate: { type: String, default: null },
    endDate: { type: String, default: null },
    notes: { type: String, default: '', maxlength: 2000 },
    order: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

taskSchema.index({ group: 1, active: 1, archivedAt: 1 });
taskSchema.index({ group: 1, category: 1 });

export const Task = mongoose.model('Task', taskSchema);
