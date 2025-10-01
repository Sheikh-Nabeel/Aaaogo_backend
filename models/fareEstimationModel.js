import mongoose from 'mongoose';

const FareEstimationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    serviceType: { type: String, required: true, index: true },
    serviceCategory: { type: String, required: false },
    vehicleType: { type: String, required: true },
    routeType: { type: String, enum: ['one_way', 'two_way', 'round_trip'], required: true },
    pickupLocation: {
      type: {
        address: String,
        coordinates: { type: [Number], index: '2dsphere' },
      },
      required: true,
    },
    dropoffLocation: {
      type: {
        address: String,
        coordinates: { type: [Number], index: '2dsphere' },
      },
      required: true,
    },
    // Snapshot of what was calculated
    originalFare: { type: Number, required: true },
    currency: { type: String, default: 'AED' },
    adjustmentSettings: {
      allowedPercentage: { type: Number, required: true },
      minFare: { type: Number, required: true },
      maxFare: { type: Number, required: true },
      canAdjustFare: { type: Boolean, default: true },
    },
    // Full response payload snapshot returned by estimate endpoint
    responseData: { type: Object, required: true },
    // Optional metadata
    demandRatio: { type: Number },
    nightRide: { type: Boolean },
    helper: { type: Boolean },
  },
  { timestamps: true }
);

const FareEstimation = mongoose.model('FareEstimation', FareEstimationSchema);
export default FareEstimation;


