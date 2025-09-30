import PricingConfig from '../models/pricingModel.js';

// Calculate fare for shifting/movers service
const calculateShiftingMoversFare = async (bookingData) => {
  try {
    const {
      distance,
      furnitureDetails,
      serviceDetails,
      vehicleType
    } = bookingData;
    
    // Get pricing configuration for the specific vehicle type
    let config = await PricingConfig.findOne({ 
      serviceType: 'shifting_movers',
      'shiftingMoversConfig.vehicleType': vehicleType,
      isActive: true 
    });
    
    if (!config || !config.shiftingMoversConfig) {
      // If no specific vehicle type config found, try to get default config
      const defaultConfig = await PricingConfig.findOne({ 
        serviceType: 'shifting_movers', 
        isActive: true 
      });
      
      if (!defaultConfig || !defaultConfig.shiftingMoversConfig) {
        throw new Error(`Shifting/Movers pricing configuration not found for vehicle type: ${vehicleType}`);
      }
      
      console.log(`Using default pricing for vehicle type: ${vehicleType}`);
      config = defaultConfig;
    }
    
    const pricing = config.shiftingMoversConfig;
    
    // Validate that the pricing config matches the requested vehicle type
    if (pricing.vehicleType !== vehicleType) {
      console.log(`Warning: Pricing config vehicle type (${pricing.vehicleType}) doesn't match requested vehicle type (${vehicleType})`);
    }
    
    let fareBreakdown = {
      baseFare: 0,
      distanceFare: 0,
      serviceFees: {
        loadingUnloading: 0,
        packing: 0,
        fixing: 0,
        helpers: 0
      },
      locationCharges: {
        pickupStairs: 0,
        pickupLift: 0,
        dropoffStairs: 0,
        dropoffLift: 0
      },
      itemCharges: 0,
      platformCharges: {
        percentage: 0,
        amount: 0
      },
      totalCalculatedFare: 0,
      vehicleType: vehicleType,
      pricingConfig: {
        vehicleType: pricing.vehicleType,
        vehicleStartFare: pricing.vehicleStartFare,
        perKmFare: pricing.perKmFare
      }
    };
    
    // 1. Calculate base fare (covers 5KM)
    fareBreakdown.baseFare = pricing.vehicleStartFare;
    
    // 2. Calculate distance fare (after 5KM)
    if (distance > 5) {
      fareBreakdown.distanceFare = (distance - 5) * pricing.perKmFare;
    }
    
    // 3. Calculate item charges if furniture details provided
    if (furnitureDetails) {
      fareBreakdown.itemCharges = calculateItemBasedFare(
        furnitureDetails, pricing.itemPricing, 'loadingUnloadingFare'
      );
    }
    
    // 4. Calculate service fees
    if (serviceDetails?.shiftingMovers?.selectedServices) {
      const selectedServices = serviceDetails.shiftingMovers.selectedServices;
      
      // Loading/Unloading Helper
      if (selectedServices.loadingUnloading) {
        const totalItems = getTotalItemCount(furnitureDetails);
        if (pricing.basicServices.loadingUnloadingHelper.includeInBasicFare) {
          const baseLimit = pricing.basicServices.loadingUnloadingHelper.baseLimit;
          if (totalItems > baseLimit) {
            fareBreakdown.serviceFees.loadingUnloading = 
              pricing.basicServices.loadingUnloadingHelper.fare + 
              ((totalItems - baseLimit) * getAverageItemFare(pricing.itemPricing, 'loadingUnloadingFare'));
          } else {
            fareBreakdown.serviceFees.loadingUnloading = pricing.basicServices.loadingUnloadingHelper.fare;
          }
        } else {
          fareBreakdown.serviceFees.loadingUnloading = calculateItemBasedFare(
            furnitureDetails, pricing.itemPricing, 'loadingUnloadingFare'
          );
        }
      }
      
      // Packing
      if (selectedServices.packing) {
        const totalItems = getTotalItemCount(furnitureDetails);
        if (pricing.basicServices.packers.includeInBasicFare) {
          const baseLimit = pricing.basicServices.packers.baseLimit;
          if (totalItems > baseLimit) {
            fareBreakdown.serviceFees.packing = 
              pricing.basicServices.packers.fare + 
              ((totalItems - baseLimit) * getAverageItemFare(pricing.itemPricing, 'packingFare'));
          } else {
            fareBreakdown.serviceFees.packing = pricing.basicServices.packers.fare;
          }
        } else {
          fareBreakdown.serviceFees.packing = calculateItemBasedFare(
            furnitureDetails, pricing.itemPricing, 'packingFare'
          );
        }
      }
      
      // Fixing
      if (selectedServices.fixing) {
        const totalItems = getTotalItemCount(furnitureDetails);
        if (pricing.basicServices.fixers.includeInBasicFare) {
          const baseLimit = pricing.basicServices.fixers.baseLimit;
          if (totalItems > baseLimit) {
            fareBreakdown.serviceFees.fixing = 
              pricing.basicServices.fixers.fare + 
              ((totalItems - baseLimit) * getAverageItemFare(pricing.itemPricing, 'fixingFare'));
          } else {
            fareBreakdown.serviceFees.fixing = pricing.basicServices.fixers.fare;
          }
        } else {
          fareBreakdown.serviceFees.fixing = calculateItemBasedFare(
            furnitureDetails, pricing.itemPricing, 'fixingFare'
          );
        }
      }
      
      // Helpers
      if (selectedServices.helpers) {
        fareBreakdown.serviceFees.helpers = pricing.basicServices.loadingUnloadingHelper.fare;
      }
    }
    
    // 5. Calculate location charges (stairs/lift)
    if (serviceDetails?.shiftingMovers) {
      const { pickupFloorDetails, dropoffFloorDetails } = serviceDetails.shiftingMovers;
      
      // Pickup location charges
      if (pickupFloorDetails) {
        // Ground floor extra charge
        if (pickupFloorDetails.floor === 0 && pricing.locationPolicy.groundFloor.extraCharge > 0) {
          fareBreakdown.locationCharges.pickupGroundFloor = pricing.locationPolicy.groundFloor.extraCharge;
        }
        
        // Stairs charges
        if (pickupFloorDetails.accessType === 'stairs' && pickupFloorDetails.floor > 0) {
          const baseCoverageFloors = pricing.locationPolicy.stairs.baseCoverageFloors || 0;
          const extraFloors = Math.max(0, pickupFloorDetails.floor - baseCoverageFloors);
          if (extraFloors > 0) {
            fareBreakdown.locationCharges.pickupStairs = calculateStairsCharges(
              furnitureDetails, pricing.itemPricing, extraFloors
            );
          }
        }
        
        // Lift charges
        if (pickupFloorDetails.accessType === 'lift' && pickupFloorDetails.floor > 0) {
          const baseCoverageFloors = pricing.locationPolicy.lift.baseCoverageFloors || 1;
          if (pickupFloorDetails.floor > baseCoverageFloors) {
            fareBreakdown.locationCharges.pickupLift = calculateLiftCharges(
              furnitureDetails, pricing.itemPricing
            );
          }
        }
      }
      
      // Dropoff location charges
      if (dropoffFloorDetails) {
        // Ground floor extra charge
        if (dropoffFloorDetails.floor === 0 && pricing.locationPolicy.groundFloor.extraCharge > 0) {
          fareBreakdown.locationCharges.dropoffGroundFloor = pricing.locationPolicy.groundFloor.extraCharge;
        }
        
        // Stairs charges
        if (dropoffFloorDetails.accessType === 'stairs' && dropoffFloorDetails.floor > 0) {
          const baseCoverageFloors = pricing.locationPolicy.stairs.baseCoverageFloors || 0;
          const extraFloors = Math.max(0, dropoffFloorDetails.floor - baseCoverageFloors);
          if (extraFloors > 0) {
            fareBreakdown.locationCharges.dropoffStairs = calculateStairsCharges(
              furnitureDetails, pricing.itemPricing, extraFloors
            );
          }
        }
        
        // Lift charges
        if (dropoffFloorDetails.accessType === 'lift' && dropoffFloorDetails.floor > 0) {
          const baseCoverageFloors = pricing.locationPolicy.lift.baseCoverageFloors || 1;
          if (dropoffFloorDetails.floor > baseCoverageFloors) {
            fareBreakdown.locationCharges.dropoffLift = calculateLiftCharges(
              furnitureDetails, pricing.itemPricing
            );
          }
        }
      }
    }
    
    // 6. Calculate platform charges
    const subtotal = 
      fareBreakdown.baseFare +
      fareBreakdown.distanceFare +
      Object.values(fareBreakdown.serviceFees).reduce((sum, fee) => sum + fee, 0) +
      Object.values(fareBreakdown.locationCharges).reduce((sum, charge) => sum + charge, 0) +
      fareBreakdown.itemCharges;
    
    // Apply platform charges (default 10% if not specified)
    const platformPercentage = pricing.platformCharges?.percentage || 10;
    const platformAmount = (subtotal * platformPercentage) / 100;
    
    fareBreakdown.platformCharges = {
      percentage: platformPercentage,
      amount: platformAmount
    };
    
    // 7. Calculate total fare including platform charges
    fareBreakdown.totalCalculatedFare = subtotal + platformAmount;
    
    return fareBreakdown;
  } catch (error) {
    throw new Error(`Fare calculation error: ${error.message}`);
  }
};

// Calculate fare for car recovery service - ALL services now use dynamic pricing
const calculateCarRecoveryFare = async (bookingData) => {
  try {
    const { 
      vehicleType, 
      serviceCategory, 
      distance, 
      serviceDetails, 
      routeType = 'one_way',
      // Ignore actual clock; rely on explicit flag only
      isNightTime = false,
      waitingMinutes = 0,
      demandRatio = 1,
      cityCode = 'default'
    } = bookingData;
    
    // ALL car recovery services now use dynamic pricing
    return await calculateDynamicCarRecoveryFare(bookingData);
  } catch (error) {
    throw new Error(`Car recovery fare calculation error: ${error.message}`);
  }
};

// Calculate fare for ALL car recovery services with dynamic pricing
const calculateDynamicCarRecoveryFare = async (bookingData) => {
  try {
    const { 
      vehicleType, 
      serviceCategory, 
      distance, 
      serviceDetails, 
      routeType = 'one_way',
      isNightTime = false,
      waitingMinutes = 0,
      demandRatio = 1,
      cityCode = 'default'
    } = bookingData;
    
    // Get comprehensive pricing configuration
    const ComprehensivePricing = (await import('../models/comprehensivePricingModel.js')).default;
    const pricingConfig = await ComprehensivePricing.findOne({ isActive: true });
    
    if (!pricingConfig || !pricingConfig.serviceTypes.carRecovery) {
      throw new Error('Car recovery pricing configuration not found');
    }
    
    const recoveryConfig = pricingConfig.serviceTypes.carRecovery;
    
    // 1. Base Fare: Use config value for first coverage km
    const baseFare = recoveryConfig.baseFare.amount;
    const coverageKm = recoveryConfig.baseFare.coverageKm;
    
    // 2. Per KM Rate: After coverage km, use config rate
    const perKmRate = recoveryConfig.perKmRate.afterBaseCoverage;
    const distanceFare = distance > coverageKm ? (distance - coverageKm) * perKmRate : 0;
    
    // 3. Apply route type multiplier for round trips
    let routeMultiplier = 1;
    if (routeType === 'round_trip' || routeType === 'two_way') {
      routeMultiplier = 2; // Double the fare for round trips
    }
    
    // 4. Minimum Fare: Use config minimum fare
    const subtotal = (baseFare + distanceFare) * routeMultiplier;
    const minimumFare = recoveryConfig.minimumFare * routeMultiplier;
    const adjustedSubtotal = Math.max(subtotal, minimumFare);
    
    // 4. Platform Fee: Use config percentage
    const platformFeePercentage = recoveryConfig.platformFee.percentage;
    const platformFeeAmount = (adjustedSubtotal * platformFeePercentage) / 100;
    const customerPlatformFee = platformFeeAmount * (recoveryConfig.platformFee.customerShare / recoveryConfig.platformFee.percentage);
    const driverPlatformFee = platformFeeAmount * (recoveryConfig.platformFee.driverShare / recoveryConfig.platformFee.percentage);
    
    // 5. Night Charges: Use config values when explicitly flagged
    let nightCharges = 0;
    if (isNightTime && recoveryConfig.nightCharges.enabled) {
      const nightChargeFixed = recoveryConfig.nightCharges.fixedAmount;
      const nightChargeMultiplied = adjustedSubtotal * (recoveryConfig.nightCharges.multiplier - 1);
      nightCharges = Math.max(nightChargeFixed, nightChargeMultiplied);
    }
    
    // 6. Surge Pricing: Use config surge pricing with support for fractional demand ratios
    let surgeMultiplier = 1;
    let surgeCharges = 0;
    if (recoveryConfig.surgePricing.enabled && demandRatio > 1) {
      const levelsAsc = [...(recoveryConfig.surgePricing.levels || [])]
        .filter(l => typeof l.demandRatio === 'number' && typeof l.multiplier === 'number')
        .sort((a, b) => a.demandRatio - b.demandRatio);

      if (levelsAsc.length === 0) {
        // No configured levels: fall back to using demandRatio directly as multiplier
        surgeMultiplier = Math.max(1, demandRatio);
      } else {
        // If demandRatio is below the first level, interpolate between 1x at ratio=1 and first level
        if (demandRatio <= levelsAsc[0].demandRatio) {
          const r0 = 1;
          const m0 = 1;
          const r1 = levelsAsc[0].demandRatio;
          const m1 = levelsAsc[0].multiplier;
          const t = Math.max(0, Math.min(1, (demandRatio - r0) / (r1 - r0)));
          surgeMultiplier = m0 + t * (m1 - m0);
        } else {
          // Find bracketing levels for interpolation
          let chosen = levelsAsc[levelsAsc.length - 1].multiplier; // default to top multiplier
          for (let i = 0; i < levelsAsc.length - 1; i++) {
            const a = levelsAsc[i];
            const b = levelsAsc[i + 1];
            if (demandRatio >= a.demandRatio && demandRatio <= b.demandRatio) {
              const t = (demandRatio - a.demandRatio) / (b.demandRatio - a.demandRatio);
              chosen = a.multiplier + t * (b.multiplier - a.multiplier);
              break;
            }
          }
          surgeMultiplier = chosen;
        }

        // Admin-controlled snapping removed - use demand ratio directly
      }

      surgeMultiplier = Math.max(1, surgeMultiplier);
      surgeCharges = (adjustedSubtotal + nightCharges) * (surgeMultiplier - 1);
    }
    
    // 7. City-wise Pricing: Use config city-wise adjustment
    let cityCharges = 0;
    if (recoveryConfig.perKmRate.cityWiseAdjustment.enabled && 
        distance > recoveryConfig.perKmRate.cityWiseAdjustment.aboveKm && 
        cityCode !== 'default') {
      const citySpecificRate = recoveryConfig.perKmRate.cityWiseAdjustment.adjustedRate;
      cityCharges = distance * citySpecificRate;
    }
    
    // 8. Waiting Charges: Use config waiting charges
    const freeWaitMinutes = recoveryConfig.waitingCharges.freeMinutes;
    const waitingRatePerMinute = recoveryConfig.waitingCharges.perMinuteRate;
    const maxWaitingCharges = recoveryConfig.waitingCharges.maximumCharge;
    let waitingCharges = 0;
    if (waitingMinutes > freeWaitMinutes) {
      waitingCharges = Math.min((waitingMinutes - freeWaitMinutes) * waitingRatePerMinute, maxWaitingCharges);
    }
    
    // 9. Convenience Fee: Based on service type (+ helper if provided)
    let convenienceFee = 0;
    if (serviceCategory === 'winching services') {
      convenienceFee = 50; // AED 50 for winching services
    } else if (serviceCategory === 'roadside assistance') {
      convenienceFee = 100; // AED 100 for roadside assistance
    } else if (serviceCategory === 'towing services') {
      convenienceFee = 25; // AED 25 for towing services
    } else if (serviceCategory === 'specialized/heavy recovery') {
      convenienceFee = 75; // AED 75 for specialized/heavy recovery
    }

    // Helper charge (runtime flag)
    if (serviceDetails && serviceDetails.helper === true) {
      convenienceFee += 15;
    }
    
    // Apply route multiplier to convenience fee
    convenienceFee = convenienceFee * routeMultiplier;
    
    // 10. VAT: Use config VAT rate
    const vatRate = recoveryConfig.vat.enabled ? recoveryConfig.vat.percentage : 0;
    const subtotalBeforeVat = adjustedSubtotal + nightCharges + surgeCharges + cityCharges + waitingCharges + convenienceFee;
    const vatAmount = (subtotalBeforeVat * vatRate) / 100;
    
    // Calculate total fare
    // Platform fee is deducted from provider earnings, not added to customer fare
    const totalFare = subtotalBeforeVat + vatAmount; // platform fee excluded from customer total
    
    // 11. Refreshment Alert: Trigger if ride >20 km OR >30 minutes
    const refreshmentAlert = distance > 20 || (waitingMinutes + (distance * 2)) > 30; // Rough estimate for trip duration
    
    // 12. Free Stay Minutes (Round Trips only)
    let freeStayMinutes = 0;
    if (routeType === 'round_trip') {
      freeStayMinutes = Math.min(distance * 0.5, 30); // 0.5 min per km, max 30 minutes
    }
    
    let fareBreakdown = {
      baseFare,
      distanceFare,
      minimumFare,
      routeMultiplier,
      subtotal: adjustedSubtotal,
      nightCharges,
      surgeCharges,
      surgeMultiplier,
      cityCharges,
      waitingCharges,
      convenienceFee,
      platformCharges: {
        percentage: platformFeePercentage,
        amount: platformFeeAmount,
        customerShare: customerPlatformFee,
        driverShare: driverPlatformFee,
        splitRatio: {
          customer: 50,
          serviceProvider: 50
        }
      },
      vatAmount,
      vatRate,
      totalCalculatedFare: totalFare,
      refreshmentAlert,
      freeStayMinutes,
      vehicleType,
      serviceCategory,
      pricingDetails: {
        perKmRate,
        freeWaitMinutes,
        waitingRatePerMinute,
        maxWaitingCharges,
        nightTimeHours: '22:00-06:00',
        surgePricing: {
          enabled: true,
          thresholds: {
            '1.5x': 2,
            '2.0x': 3
          }
        }
      }
    };
    
    return fareBreakdown;
  } catch (error) {
    throw new Error(`Winching/Roadside fare calculation error: ${error.message}`);
  }
};

// Calculate fare for key unlocker service
const calculateKeyUnlockerFare = async (bookingData) => {
  try {
    const config = await PricingConfig.findOne({ 
      serviceType: 'key_unlocker', 
      isActive: true 
    });
    
    if (!config || !config.keyUnlockerConfig) {
      throw new Error('Key unlocker pricing configuration not found');
    }
    
    const pricing = config.keyUnlockerConfig;
    const serviceCharges = pricing.serviceCharges;
    const platformChargesAmount = (serviceCharges * pricing.platformCharges.percentage) / 100;
    
    let fareBreakdown = {
      baseFare: serviceCharges,
      distanceFare: 0,
      serviceFees: {
        keyUnlockerService: serviceCharges
      },
      locationCharges: {},
      itemCharges: 0,
      platformCharges: {
        percentage: pricing.platformCharges.percentage,
        amount: platformChargesAmount,
        splitRatio: pricing.platformCharges.splitRatio,
        customerShare: platformChargesAmount * (pricing.platformCharges.splitRatio / 100),
        providerShare: platformChargesAmount * ((100 - pricing.platformCharges.splitRatio) / 100)
      },
      totalCalculatedFare: serviceCharges + platformChargesAmount
    };
    
    return fareBreakdown;
  } catch (error) {
    throw new Error(`Key unlocker fare calculation error: ${error.message}`);
  }
};

// Calculate fare for appointment-based services
const calculateAppointmentServiceFare = async (bookingData) => {
  try {
    const config = await PricingConfig.findOne({ 
      serviceType: 'appointment_based', 
      isActive: true 
    });
    
    if (!config || !config.appointmentServiceConfig) {
      throw new Error('Appointment service pricing configuration not found');
    }
    
    const pricing = config.appointmentServiceConfig;
    
    let fareBreakdown = {
      baseFare: 0, // No upfront fare for appointment-based services
      distanceFare: 0,
      serviceFees: {},
      locationCharges: {},
      itemCharges: 0,
      platformCharges: {
        percentage: 0,
        amount: pricing.fixedAppointmentFee // Only charged on successful appointment
      },
      totalCalculatedFare: 0 // No upfront payment
    };
    
    return fareBreakdown;
  } catch (error) {
    throw new Error(`Appointment service fare calculation error: ${error.message}`);
  }
};

// Helper functions
const getTotalItemCount = (furnitureDetails) => {
  if (!furnitureDetails) return 0;
  
  let total = 0;
  
  // Count predefined furniture items
  if (furnitureDetails) {
    total += Object.values(furnitureDetails).reduce((sum, count) => {
      return sum + (typeof count === 'number' ? count : 0);
    }, 0);
  }
  
  return total;
};

const getAverageItemFare = (itemPricing, fareType) => {
  if (!itemPricing || itemPricing.length === 0) return 0;
  
  const totalFare = itemPricing.reduce((sum, item) => sum + (item[fareType] || 0), 0);
  return totalFare / itemPricing.length;
};

const calculateItemBasedFare = (furnitureDetails, itemPricing, fareType) => {
  if (!itemPricing) return 0;
  
  let totalFare = 0;
  
  // Calculate fare for predefined furniture items
  if (furnitureDetails) {
    Object.entries(furnitureDetails).forEach(([itemName, quantity]) => {
      if (typeof quantity === 'number' && quantity > 0) {
        const itemConfig = itemPricing.find(item => 
          item.itemName.toLowerCase() === itemName.toLowerCase()
        );
        
        if (itemConfig && itemConfig[fareType]) {
          totalFare += itemConfig[fareType] * quantity;
        }
      }
    });
  }
  
  return totalFare;
};

const calculateStairsCharges = (furnitureDetails, itemPricing, floors) => {
  if (!itemPricing || floors <= 0) return 0;
  
  let totalCharge = 0;
  
  // Calculate stairs charges for predefined furniture items
  if (furnitureDetails) {
    Object.entries(furnitureDetails).forEach(([itemName, quantity]) => {
      if (typeof quantity === 'number' && quantity > 0) {
        const itemConfig = itemPricing.find(item => 
          item.itemName.toLowerCase() === itemName.toLowerCase()
        );
        
        if (itemConfig && itemConfig.stairsFarePerFloor) {
          totalCharge += itemConfig.stairsFarePerFloor * quantity * floors;
        }
      }
    });
  }
  
  return totalCharge;
};

const calculateLiftCharges = (furnitureDetails, itemPricing) => {
  if (!itemPricing) return 0;
  
  let totalCharge = 0;
  
  // Calculate lift charges for predefined furniture items
  if (furnitureDetails) {
    Object.entries(furnitureDetails).forEach(([itemName, quantity]) => {
      if (typeof quantity === 'number' && quantity > 0) {
        const itemConfig = itemPricing.find(item => 
          item.itemName.toLowerCase() === itemName.toLowerCase()
        );
        
        if (itemConfig && itemConfig.liftFarePerItem) {
          totalCharge += itemConfig.liftFarePerItem * quantity;
        }
      }
    });
  }
  
  return totalCharge;
};

// Main fare calculation function
const calculateFare = async (bookingData) => {
  try {
    const { serviceType } = bookingData;
    
    switch (serviceType) {
      case 'shifting & movers':
        return await calculateShiftingMoversFare(bookingData);
      case 'car recovery':
        return await calculateCarRecoveryFare(bookingData);
      case 'key_unlocker':
        return await calculateKeyUnlockerFare(bookingData);
      case 'appointment_based':
        return await calculateAppointmentServiceFare(bookingData);
      case 'car cab':
      case 'bike':
        // For cab and bike, use existing fare calculation logic
        return {
          baseFare: bookingData.fare || 0,
          distanceFare: 0,
          serviceFees: {},
          locationCharges: {},
          itemCharges: 0,
          platformCharges: { percentage: 0, amount: 0 },
          totalCalculatedFare: bookingData.fare || 0
        };
      default:
        throw new Error(`Unsupported service type: ${serviceType}`);
    }
  } catch (error) {
    throw new Error(`Fare calculation failed: ${error.message}`);
  }
};

export {
  calculateFare,
  calculateShiftingMoversFare,
  calculateCarRecoveryFare,
  calculateKeyUnlockerFare,
  calculateAppointmentServiceFare
};