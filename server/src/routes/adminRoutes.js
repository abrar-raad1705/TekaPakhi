import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import authenticate from '../middleware/authenticate.js';
import roleGuard from '../middleware/roleGuard.js';
import validate from '../middleware/validate.js';
import {
  updateStatusSchema,
  createProfileSchema,
  loadWalletSchema,
  updateTxTypeSchema,
  upsertLimitSchema,
  upsertCommissionSchema,
} from '../validations/adminValidation.js';

const router = Router();

// All admin routes require authentication + SYSTEM role
router.use(authenticate);
router.use(roleGuard('SYSTEM'));

// Dashboard
router.get('/dashboard', adminController.dashboard);

// User management
router.get('/users', adminController.listUsers);
router.post('/users', validate(createProfileSchema), adminController.createProfile);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/:id/status', validate(updateStatusSchema), adminController.updateUserStatus);
router.post('/users/:id/load-wallet', validate(loadWalletSchema), adminController.loadWallet);

// Transaction management
router.get('/transactions', adminController.listTransactions);
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

// Reports
router.get('/reports/transactions', adminController.transactionReport);
router.get('/reports/user-growth', adminController.userGrowthReport);

export default router;
