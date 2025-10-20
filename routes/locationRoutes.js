import express from 'express';
import {
  updateLocation,
  getMyLocation,
  getNearbyUsers,
  getLocationHistory,
  bulkUpdateLocation
} from '../controllers/locationController.js';
import { authMiddleware } from '../middlewares/authMIddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Update user's current location
router.post('/update', updateLocation);

// Get user's current location
router.get('/my-location', getMyLocation);

// Get nearby users
router.get('/nearby', getNearbyUsers);

// Get location history
router.get('/history', getLocationHistory);

// Bulk update locations (admin only)
router.post('/bulk-update', bulkUpdateLocation);

export default router;
