const express = require('express');
const router = express.Router();
const healthRoutes = require('./health');
const chatRoutes = require('./chat');

router.use('/api', healthRoutes);
router.use('/api/chat', chatRoutes);

module.exports = router;

