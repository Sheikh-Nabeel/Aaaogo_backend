import express from "express";
import {
  getFareEstimation,
  adjustFareEstimation,
  getFareAdjustmentRange,
  validateBulkFareAdjustments
} from "../controllers/fareEstimationController.js";
import authHandler from "../middlewares/authMIddleware.js";

const router = express.Router();

// Get fare estimation before booking
router.post("/estimate-fare", authHandler, getFareEstimation);

// Validate fare adjustment (±3% or admin configured percentage)
router.post("/adjust-fare", authHandler, adjustFareEstimation);

// Get fare adjustment range for a specific fare
router.post("/adjustment-range", authHandler, getFareAdjustmentRange);

// Validate multiple fare adjustments at once
router.post("/validate-bulk-adjustments", authHandler, validateBulkFareAdjustments);

export default router;