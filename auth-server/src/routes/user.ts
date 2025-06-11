import { Router } from 'express';
import { getProfile, updateProfile, deactivateAccount } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.delete('/deactivate', deactivateAccount);

export default router;
