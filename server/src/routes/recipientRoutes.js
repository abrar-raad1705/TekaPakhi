import { Router } from 'express';
import recipientController from '../controllers/recipientController.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import { savedRecipientSchema } from '../validations/transactionValidation.js';

const router = Router();

router.use(authenticate);

router.get('/', recipientController.list);
router.post('/', validate(savedRecipientSchema), recipientController.create);
router.delete('/:id', recipientController.delete);

export default router;
