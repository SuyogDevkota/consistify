import mongoose from 'mongoose';
import { ROLES } from '../utils/permissions.js';

const membershipSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
      required: true,
    },
    displayName: { type: String, trim: true, maxlength: 80 },
    notifyTaskCompletions: { type: Boolean, default: false },
    browserPushEnabled: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'pending', 'left', 'removed'],
      default: 'active',
      index: true,
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
  },
  { timestamps: true }
);

membershipSchema.index({ group: 1, user: 1 }, { unique: true });
membershipSchema.index({ user: 1, status: 1 });
membershipSchema.index({ group: 1, status: 1, role: 1 });

export const Membership = mongoose.model('Membership', membershipSchema);
