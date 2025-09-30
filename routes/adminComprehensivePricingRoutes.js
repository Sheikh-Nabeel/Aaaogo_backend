import express from 'express';
import { getComprehensivePricing, bulkUpdatePricing } from '../controllers/adminComprehensivePricingController.js';
import authHandler from '../middlewares/authMIddleware.js';
import adminHandler from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authHandler);


// Single read endpoint (full config)
router.get('/config', getComprehensivePricing);

// Single update endpoint (full config)
router.put('/config', bulkUpdatePricing);

export default router;