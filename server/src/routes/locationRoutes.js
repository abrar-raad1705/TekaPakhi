import { Router } from 'express';
import locationController from '../controllers/locationController.js';

const router = Router();

router.get('/districts', locationController.districts);
router.get('/areas', locationController.areas);

export default router;
