import { Router } from 'express';
import authRoutes from './authRoutes.js';
import groupRoutes from './groupRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'consistify-api' } });
});

router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);

export default router;
