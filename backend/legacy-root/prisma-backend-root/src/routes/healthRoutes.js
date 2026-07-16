const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

module.exports = router;
