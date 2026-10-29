import multer from 'multer';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import * as chatService from '../services/chatService.js';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
]);

export const uploadChatFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const mimeType = file.mimetype.split(';', 1)[0].toLowerCase();
    if (!allowedMimeTypes.has(mimeType)) {
      callback(new AppError('Choose a supported image or audio file', 400, 'INVALID_CHAT_FILE'));
      return;
    }
    callback(null, true);
  },
}).single('file');

export const list = asyncHandler(async (req, res) => {
  const before = req.query.before;
  if (before && !mongoose.isValidObjectId(before)) {
    throw new AppError('Invalid chat history cursor', 400, 'INVALID_ID');
  }
  res.json({
    success: true,
    data: {
      ...await chatService.listMessages(req.group._id, before),
      mediaConfigured: env.mediaConfigured,
    },
  });
});

export function stream(req, res) {
  res.status(200).set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 5000\n\n');
  chatService.streamGroupMessages(req.group._id, req.user._id, res);
}

export const create = asyncHandler(async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (text.length > 2000) {
    throw new AppError('Messages cannot exceed 2000 characters', 400, 'VALIDATION_ERROR');
  }
  if (!text && !req.file) {
    throw new AppError('Write a message or attach an image or voice note', 400, 'VALIDATION_ERROR');
  }
  if (req.file && !env.mediaConfigured) {
    throw new AppError('Image and voice uploads are not configured on this server', 503, 'MEDIA_UNAVAILABLE');
  }

  const message = await chatService.createMessage({
    groupId: req.group._id,
    userId: req.user._id,
    text,
    file: req.file,
  });
  res.status(201).json({ success: true, data: { message } });
});

export const media = asyncHandler(async (req, res) => {
  await chatService.streamAttachment(req.group._id, req.params.messageId, req, res);
});
