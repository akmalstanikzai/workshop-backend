const express = require('express');
const controller = require('../controllers/inventoryController');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth, requireRole('admin', 'cashier', 'data_entry'));
router.get('/', controller.listSales); router.post('/', controller.createSale);
module.exports = router;
