const { Router } = require('express');
const profileController = require('../controllers/profileController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { updateProfileSchema } = require('../validations/profileValidation');

const router = Router();

// All profile routes require authentication
router.use(authenticate);

router.get('/me', profileController.getProfile);
router.put('/me', validate(updateProfileSchema), profileController.updateProfile);
router.get('/lookup/:phoneNumber', profileController.lookup);
router.get('/billers', profileController.listBillers);

module.exports = router;
