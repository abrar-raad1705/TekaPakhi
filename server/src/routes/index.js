import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import walletRoutes from './walletRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import recipientRoutes from './recipientRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'TekaPakhi API is running', timestamp: new Date().toISOString() });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/wallet', walletRoutes);
router.use('/transactions', transactionRoutes);
router.use('/recipients', recipientRoutes);
router.use('/admin', adminRoutes);

export default router;
