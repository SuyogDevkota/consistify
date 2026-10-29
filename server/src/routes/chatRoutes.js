import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';
import { requireGroupMember } from '../middleware/groupAuth.js';

const router = Router();

router.use(authenticate);
router.use('/:groupId', requireGroupMember('groupId'));
router.get('/:groupId/messages', chatController.list);
router.get('/:groupId/events', chatController.stream);
router.get('/:groupId/messages/:messageId/media', chatController.media);
router.post('/:groupId/messages', chatController.uploadChatFile, chatController.create);

export default router;
