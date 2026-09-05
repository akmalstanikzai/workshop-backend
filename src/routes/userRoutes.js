const express = require('express');
const { createUser, listUsers, listEngineers, updateUser, deleteUser } = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/engineers', listEngineers);
router.use(requireRole('admin'));
router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
