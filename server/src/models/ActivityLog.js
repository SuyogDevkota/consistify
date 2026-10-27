import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: [
        'task_completed',
        'task_undone',
        'task_created',
        'task_updated',
        'task_archived',
        'member_joined',
        'member_left',
        'member_removed',
        'role_changed',
        'ownership_transferred',
        'group_updated',
        'invite_created',
        'invite_revoked',
      ],
      required: true,
    },
    message: { type: String, required: true, maxlength: 500 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ group: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
