import { Router } from 'express';
import { forgotPassword, resetPassword, changePassword } from '../controllers/passwordController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/change-password', authenticateToken, changePassword);

export default router;
