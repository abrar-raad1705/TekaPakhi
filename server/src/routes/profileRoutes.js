import { Router } from 'express';
import profileController from '../controllers/profileController.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import { updateProfileSchema } from '../validations/profileValidation.js';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

router.get('/me', profileController.getProfile);
router.put('/me', validate(updateProfileSchema), profileController.updateProfile);
router.get('/lookup/:phoneNumber', profileController.lookup);
router.get('/billers', profileController.listBillers);

export default router;
