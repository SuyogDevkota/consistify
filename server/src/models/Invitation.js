import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    code: { type: String, required: true, uppercase: true, index: true },
    expiresAt: { type: Date, required: true },
    maxUses: { type: Number, default: null },
    useCount: { type: Number, default: 0 },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

invitationSchema.index({ group: 1, revokedAt: 1 });

invitationSchema.statics.generateToken = function generateToken() {
  return crypto.randomBytes(24).toString('hex');
};

invitationSchema.statics.hashToken = function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

invitationSchema.statics.generateCode = function generateCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

invitationSchema.methods.isUsable = function isUsable() {
  if (this.revokedAt) return { ok: false, reason: 'revoked' };
  if (this.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
  if (this.maxUses != null && this.useCount >= this.maxUses) {
    return { ok: false, reason: 'exhausted' };
  }
  return { ok: true };
};

export const Invitation = mongoose.model('Invitation', invitationSchema);
