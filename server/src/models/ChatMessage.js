import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['image', 'audio'], required: true },
    publicId: { type: String, required: true, maxlength: 255 },
    resourceType: { type: String, enum: ['image', 'video'], required: true },
    format: { type: String, required: true, maxlength: 20 },
    version: { type: Number, required: true },
    mimeType: { type: String, required: true, maxlength: 100 },
    bytes: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', trim: true, maxlength: 2000 },
    attachment: { type: attachmentSchema, default: null },
  },
  { timestamps: true }
);

chatMessageSchema.index({ group: 1, createdAt: -1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
