import { Router } from 'express';
import {
  login,
  register,
  logout,
  refresh,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback
} from '../controllers/authControllers';
import { verifyRefreshToken } from '../middlewares/authMiddleware';

const router: Router = Router();

// Regular auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', verifyRefreshToken, refresh);

// OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

export default router;