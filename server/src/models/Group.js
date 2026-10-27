import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    rules: { type: String, default: '', trim: true, maxlength: 2000 },
    color: { type: String, default: '#6490ff', maxlength: 32 },
    icon: { type: String, default: '↗', maxlength: 8 },
    timezone: { type: String, default: 'UTC', maxlength: 64 },
    requireJoinApproval: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

groupSchema.index({ owner: 1, createdAt: -1 });

export const Group = mongoose.model('Group', groupSchema);
