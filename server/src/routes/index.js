import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import walletRoutes from './walletRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import recipientRoutes from './recipientRoutes.js';
import adminAuthRoutes from './adminAuthRoutes.js';
import adminRoutes from './adminRoutes.js';
import locationRoutes from './locationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);
router.use('/profile', profileRoutes);
router.use('/wallet', walletRoutes);
router.use('/transactions', transactionRoutes);
router.use('/recipients', recipientRoutes);
router.use('/root', adminAuthRoutes);
router.use('/admin', adminRoutes);

export default router;
