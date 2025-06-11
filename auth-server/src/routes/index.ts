import { Router } from 'express';
import authRoutes from './auth';
import passwordRoutes from './password';
import userRoutes from './user';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/password', passwordRoutes);
router.use('/user', userRoutes);

export default router;
