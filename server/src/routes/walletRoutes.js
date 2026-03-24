import { Router } from 'express';
import walletController from '../controllers/walletController.js';
import authenticate from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/balance', walletController.getBalance);
router.get('/dashboard-stats', walletController.getDashboardStats);

export default router;
