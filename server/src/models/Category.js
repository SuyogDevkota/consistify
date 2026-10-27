import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    order: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

categorySchema.index({ group: 1, name: 1 });

export const Category = mongoose.model('Category', categorySchema);
