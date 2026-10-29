import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, maxlength: 40 },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 500 },
    actorName: { type: String, default: '', maxlength: 80 },
    taskName: { type: String, default: '', maxlength: 120 },
    points: { type: Number, default: null, min: 0 },
    url: { type: String, default: '/app', maxlength: 200 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, group: 1, createdAt: -1 });
notificationSchema.index({ user: 1, group: 1, readAt: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
