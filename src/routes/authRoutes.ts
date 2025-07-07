import { Router } from 'express';
import {
  login,
  register,
  logout,
  refresh,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  getMe
} from '../controllers/authControllers';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router: Router = Router();

// Regular auth routes
router.post('/signup', register);
router.post('/signin', login);
router.post('/logout', logout);
router.post('/refresh', refresh);

// User info route
router.get('/me', authenticateJWT, getMe);

// OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

export default router;