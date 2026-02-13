const { Router } = require('express');
const walletController = require('../controllers/walletController');
const authenticate = require('../middleware/authenticate');

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

router.get('/balance', walletController.getBalance);

module.exports = router;
