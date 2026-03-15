import { Router } from 'express';
import transactionController from '../controllers/transactionController.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import { executeTransactionSchema, previewTransactionSchema } from '../validations/transactionValidation.js';

const router = Router();

// All transaction routes require authentication
router.use(authenticate);

// Execute transactions
router.post('/send-money', validate(executeTransactionSchema), transactionController.sendMoney);
router.post('/cash-in', validate(executeTransactionSchema), transactionController.cashIn);
router.post('/cash-out', validate(executeTransactionSchema), transactionController.cashOut);
router.post('/payment', validate(executeTransactionSchema), transactionController.payment);
router.post('/pay-bill', validate(executeTransactionSchema), transactionController.payBill);
router.post('/b2b', validate(executeTransactionSchema), transactionController.b2b);

// Preview (fee calculation without execution)
router.post('/preview/:type', validate(previewTransactionSchema), transactionController.preview);

// History and details
router.get('/history', transactionController.history);
router.get('/mini-statement', transactionController.miniStatement);
router.get('/:id', transactionController.detail);

export default router;
