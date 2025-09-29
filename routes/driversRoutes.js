import express from "express";
import {
  uploadLicense,
  registerVehicle,
  updateVehicle,
  getUserVehicleInfo,
  getCurrentUser,
  getUserById,
  getVehicleSelectFlow,
  getPendingRequests,
  acceptBookingRequest,
  rejectBookingRequest,
  getDriverBookings,
  offerFare,
} from "../controllers/driversController.js";
import authHandler from "../middlewares/authMIddleware.js";

import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

const router = express.Router();

router.post(
  "/upload-license",
  authHandler,
  upload.single("licenseImage"),
  uploadLicense
);
router.post(
  "/register-vehicle",
  authHandler,
  upload.fields([
    { name: "vehicleRegistrationCardFront", maxCount: 1 },
    { name: "vehicleRegistrationCardBack", maxCount: 1 },
    { name: "roadAuthorityCertificate", maxCount: 1 },
    { name: "insuranceCertificate", maxCount: 1 },
    { name: "vehicleImages", maxCount: 4 },
  ]),
  registerVehicle
);
router.post(
  "/update-vehicle",
  authHandler,
  upload.fields([
    { name: "vehicleRegistrationCardFront", maxCount: 1 },
    { name: "vehicleRegistrationCardBack", maxCount: 1 },
    { name: "roadAuthorityCertificate", maxCount: 1 },
    { name: "insuranceCertificate", maxCount: 1 },
    { name: "vehicleImages", maxCount: 4 },
  ]),
  updateVehicle
);
router.get("/user-vehicle-info", authHandler, getUserVehicleInfo);
router.get("/get-current-user", authHandler, getCurrentUser);
router.get("/get-user-by-id", authHandler, getUserById);
router.get("/vehicle-select-flow", getVehicleSelectFlow);

// Driver booking request endpoints
router.get("/pending-requests", authHandler, getPendingRequests);
router.post("/accept-booking/:bookingId", authHandler, acceptBookingRequest);
router.post("/reject-booking/:bookingId", authHandler, rejectBookingRequest);
router.post("/offer-fare/:bookingId", authHandler, offerFare);
router.get("/my-bookings", authHandler, getDriverBookings);

export default router;
