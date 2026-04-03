import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import adminAuthenticate from '../middleware/adminAuthenticate.js';
import validate from '../middleware/validate.js';
import {
  updateStatusSchema,
  createProfileSchema,
  loadWalletSchema,
  updateWalletLimitSchema,
  pinResetGrantSchema,
  updateTxTypeSchema,
  upsertLimitSchema,
  upsertCommissionSchema,
} from '../validations/adminValidation.js';

const router = Router();

// All admin routes require admin JWT (password login at POST /api/v1/admin/login)
router.use(adminAuthenticate);

// Dashboard
router.get('/dashboard', adminController.dashboard);

// User management
router.get('/users', adminController.listUsers);
router.post('/users', validate(createProfileSchema), adminController.createProfile);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/:id/status', validate(updateStatusSchema), adminController.updateUserStatus);
router.patch(
  '/users/:id/wallet-limit',
  validate(updateWalletLimitSchema),
  adminController.updateWalletLimit,
);
router.patch(
  '/users/:id/pin-reset-grant',
  validate(pinResetGrantSchema),
  adminController.setPinResetGrant,
);
router.post('/users/:id/load-wallet', validate(loadWalletSchema), adminController.loadWallet);

// Transaction management
router.get('/transactions', adminController.listTransactions);
router.get('/transactions/:id', adminController.getTransactionDetail);
router.post('/transactions/:id/reverse', adminController.reverseTransaction);

// Config: transaction types
router.get('/config/transaction-types', adminController.getTransactionTypes);
router.patch('/config/transaction-types/:id', validate(updateTxTypeSchema), adminController.updateTransactionType);

// Config: transaction limits
router.get('/config/limits', adminController.getTransactionLimits);
router.put('/config/limits', validate(upsertLimitSchema), adminController.upsertTransactionLimit);
router.delete('/config/limits/:profileTypeId/:txTypeId', adminController.deleteTransactionLimit);

// Config: commission policies
router.get('/config/commissions', adminController.getCommissionPolicies);
router.put('/config/commissions', validate(upsertCommissionSchema), adminController.upsertCommissionPolicy);
router.delete('/config/commissions/:profileTypeId/:txTypeId', adminController.deleteCommissionPolicy);

// Config: misc
router.get('/config/profile-types', adminController.getProfileTypes);

// Reports
router.get('/reports/transactions', adminController.transactionReport);
router.get('/reports/user-growth', adminController.userGrowthReport);
router.get('/reports/mfs-overview', adminController.mfsOverviewReport);

// Logs
router.get('/logs/audit', adminController.getAuditLogs);

export default router;
