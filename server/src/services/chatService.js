import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ChatMessage } from '../models/ChatMessage.js';
import { Membership } from '../models/Membership.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

const groupStreams = new Map();

if (env.mediaConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
}

function serializeMessage(message) {
  return {
    id: message._id.toString(),
    text: message.text,
    createdAt: message.createdAt,
    sender: {
      id: message.sender._id.toString(),
      name: message.sender.name,
      avatarColor: message.sender.avatarColor,
    },
    attachment: message.attachment
      ? {
          kind: message.attachment.kind,
          mimeType: message.attachment.mimeType,
          bytes: message.attachment.bytes,
        }
      : null,
  };
}

async function broadcastMessage(groupId, message) {
  const streams = groupStreams.get(groupId.toString());
  if (!streams) return;
  const activeMemberships = await Membership.find({ group: groupId, status: 'active' })
    .select('user')
    .lean();
  const activeUserIds = new Set(activeMemberships.map(({ user }) => user.toString()));
  const event = `event: chat-message\ndata: ${JSON.stringify(message)}\n\n`;
  for (const [response, userId] of streams) {
    if (response.destroyed || response.writableEnded) {
      streams.delete(response);
      continue;
    }
    if (!activeUserIds.has(userId)) {
      response.end();
      streams.delete(response);
      continue;
    }
    response.write(event);
  }
  if (!streams.size) groupStreams.delete(groupId.toString());
}

export async function listMessages(groupId, before) {
  const filter = { group: groupId };
  if (before) {
    const cursor = await ChatMessage.findOne({ _id: before, group: groupId })
      .select('_id createdAt')
      .lean();
    if (!cursor) throw new AppError('Chat history cursor not found', 404, 'NOT_FOUND');
    filter.$or = [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
    ];
  }
  const records = await ChatMessage.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(51)
    .populate('sender', 'name avatarColor')
    .lean();
  const hasMore = records.length > 50;
  const messages = records.slice(0, 50).reverse().map(serializeMessage);
  return { messages, hasMore };
}

export async function createMessage({ groupId, userId, text, file }) {
  let attachment = null;
  if (file) {
    const mimeType = file.mimetype.split(';', 1)[0].toLowerCase();
    const kind = mimeType.startsWith('image/') ? 'image' : 'audio';
    const uploadResult = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: `consistify/groups/${groupId}/chat`,
          resource_type: kind === 'image' ? 'image' : 'video',
          type: 'authenticated',
          allowed_formats:
            kind === 'image'
              ? ['jpg', 'jpeg', 'png', 'webp', 'gif']
              : ['webm', 'ogg', 'mp3', 'wav', 'm4a', 'mp4'],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      upload.end(file.buffer);
    }).catch((error) => {
      logger.error('Chat media upload failed', {
        groupId: groupId.toString(),
        message: error.message,
      });
      throw error;
    });

    attachment = {
      kind,
      publicId: uploadResult.public_id,
      resourceType: uploadResult.resource_type,
      format: uploadResult.format,
      version: uploadResult.version,
      mimeType,
      bytes: file.size,
    };
  }

  const message = await ChatMessage.create({
    group: groupId,
    sender: userId,
    text: text || '',
    attachment,
  });
  await message.populate('sender', 'name avatarColor');
  const serialized = serializeMessage(message);
  try {
    await broadcastMessage(groupId, serialized);
  } catch (error) {
    logger.error('Failed to broadcast chat message', {
      groupId: groupId.toString(),
      error: error.message,
    });
  }
  return serialized;
}

export async function streamAttachment(groupId, messageId, request, response) {
  const message = await ChatMessage.findOne({ _id: messageId, group: groupId })
    .select('attachment')
    .lean();
  if (!message?.attachment) {
    throw new AppError('Chat attachment not found', 404, 'NOT_FOUND');
  }
  if (!env.mediaConfigured) {
    throw new AppError('Chat media storage is not configured', 503, 'MEDIA_UNAVAILABLE');
  }

  const attachment = message.attachment;
  const mediaUrl = cloudinary.url(attachment.publicId, {
    secure: true,
    resource_type: attachment.resourceType,
    type: 'authenticated',
    sign_url: true,
    version: attachment.version,
    format: attachment.format,
  });
  const requestHeaders = {};
  const range = request.headers.range;
  if (range && /^bytes=\d*-\d*(,\d*-\d*)*$/.test(range)) {
    requestHeaders.Range = range;
  }
  const upstream = await fetch(mediaUrl, { headers: requestHeaders });
  if (!upstream.ok || !upstream.body) {
    if (upstream.status === 404) {
      throw new AppError('Chat attachment not found', 404, 'NOT_FOUND');
    }
    logger.error('Private chat media could not be fetched', {
      groupId: groupId.toString(),
      statusCode: upstream.status,
    });
    throw new AppError('Chat media is temporarily unavailable', 502, 'MEDIA_UNAVAILABLE');
  }

  response.status(upstream.status);
  response.set({
    'Content-Type': attachment.mimeType,
    'Cache-Control': 'private, no-store',
    'Content-Disposition': 'inline',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  });
  for (const header of ['content-length', 'content-range']) {
    const value = upstream.headers.get(header);
    if (value) response.set(header, value);
  }

  try {
    await pipeline(Readable.fromWeb(upstream.body), response);
  } catch (error) {
    if (!response.destroyed) {
      logger.warn('Private chat media stream ended unexpectedly', {
        groupId: groupId.toString(),
        message: error.message,
      });
      throw error;
    }
  }
}

export function streamGroupMessages(groupId, userId, response) {
  const key = groupId.toString();
  let streams = groupStreams.get(key);
  if (!streams) {
    streams = new Map();
    groupStreams.set(key, streams);
  }
  streams.set(response, userId.toString());

  const heartbeat = setInterval(() => {
    if (!response.destroyed && !response.writableEnded) response.write(': keep-alive\n\n');
  }, 25000);

  response.on('close', () => {
    clearInterval(heartbeat);
    streams.delete(response);
    if (!streams.size) groupStreams.delete(key);
  });
}
