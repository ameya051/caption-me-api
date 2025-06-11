import { Router } from 'express';
import { register, login, refreshToken, logout, verifyEmail } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/verify-email', verifyEmail);

// Protected routes
router.post('/logout', authenticateToken, logout);

export default router;
