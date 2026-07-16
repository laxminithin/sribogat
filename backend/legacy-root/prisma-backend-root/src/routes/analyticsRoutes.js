const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth, admin } = require('../middleware/auth');

// All routes require admin authentication
router.use(auth, admin);

// Get dashboard statistics
router.get('/dashboard', analyticsController.getDashboardStats);

// Export data
router.get('/export', analyticsController.exportData);

// Custom reports
router.post('/custom-reports', analyticsController.getCustomReports);

module.exports = router; 