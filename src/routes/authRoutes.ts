import { Router } from 'express';
import { login, register, logout, refresh } from '../controllers/authControllers';
import { verifyRefreshToken } from '../middlewares/authMiddleware';

const router: Router = Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', verifyRefreshToken, refresh);

export default router;