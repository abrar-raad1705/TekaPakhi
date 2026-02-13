const { Router } = require('express');
const recipientController = require('../controllers/recipientController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { savedRecipientSchema } = require('../validations/transactionValidation');

const router = Router();

router.use(authenticate);

router.get('/', recipientController.list);
router.post('/', validate(savedRecipientSchema), recipientController.create);
router.delete('/:id', recipientController.delete);

module.exports = router;
