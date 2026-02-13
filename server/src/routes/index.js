const { Router } = require('express');
const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const walletRoutes = require('./walletRoutes');
const transactionRoutes = require('./transactionRoutes');
const recipientRoutes = require('./recipientRoutes');
const adminRoutes = require('./adminRoutes');

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

module.exports = router;
