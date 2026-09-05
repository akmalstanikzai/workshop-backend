const express = require('express');
const controller = require('../controllers/paymentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth, requireRole('admin', 'cashier'));
router.get('/', controller.list); router.post('/', controller.create);
module.exports = router;
