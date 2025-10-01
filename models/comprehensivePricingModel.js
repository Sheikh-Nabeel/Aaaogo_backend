import mongoose from 'mongoose';

// Comprehensive pricing configuration schema
const comprehensivePricingSchema = new mongoose.Schema({
  // Base pricing structure
  baseFare: {
    amount: { type: Number, default: 50 }, // AED 50 for first 6km
    coverageKm: { type: Number, default: 6 }
  },
  
  // Per KM rates
  perKmRate: {
    afterBaseCoverage: { type: Number, default: 7.5 }, // AED 7.5/km after 6km
    cityWiseAdjustment: {
      enabled: { type: Boolean, default: true },
      aboveKm: { type: Number, default: 10 },
      adjustedRate: { type: Number, default: 5 } // AED 5/km if above 10km
    }
  },
  
  // Minimum fare
  minimumFare: { type: Number, default: 50 }, // AED 50
  
  // Platform fees
  platformFee: {
    percentage: { type: Number, default: 15 }, // 15% total
    driverShare: { type: Number, default: 7.5 }, // 7.5%
    customerShare: { type: Number, default: 7.5 } // 7.5%
  },
  
  // Cancellation charges
  cancellationCharges: {
    beforeArrival: { type: Number, default: 2 }, // AED 2
    after25PercentDistance: { type: Number, default: 5 }, // AED 5 after 25% distance
    after50PercentDistance: { type: Number, default: 5 }, // AED 5 after 50% distance
    afterArrival: { type: Number, default: 10 } // AED 10 after arrival
  },
  
  // Waiting charges
  waitingCharges: {
    freeMinutes: { type: Number, default: 5 }, // First 5 minutes free
    perMinuteRate: { type: Number, default: 2 }, // AED 2/min
    maximumCharge: { type: Number, default: 20 } // Max AED 20
  },
  
  // Night charges (10 PM - 6 AM)
  nightCharges: {
    enabled: { type: Boolean, default: true },
    startHour: { type: Number, default: 22 }, // 10 PM
    endHour: { type: Number, default: 6 }, // 6 AM
    fixedAmount: { type: Number, default: 10 }, // +AED 10
    multiplier: { type: Number, default: 1.25 } // or 1.25x
  },
  
  // Surge pricing
  surgePricing: {
    enabled: { type: Boolean, default: true },
    adminControlled: { type: Boolean, default: true },
    levels: [{
      demandRatio: { type: Number, default: 2 }, // 2x demand (100 cars, 200 customers)
      multiplier: { type: Number, default: 1.5 }
    }, {
      demandRatio: { type: Number, default: 3 }, // 3x demand (100 cars, 300 customers)
      multiplier: { type: Number, default: 2.0 }
    }]
  },
  
  // Service type specific rates
  serviceTypes: {
    carCab: {
      enabled: { type: Boolean, default: true },
      vehicleTypes: {
        economy: { 
          baseFare: { type: Number, default: 50 }, 
          perKmRate: { type: Number, default: 7.5 }
        },
        premium: { 
          baseFare: { type: Number, default: 60 }, 
          perKmRate: { type: Number, default: 9 }
        },
        luxury: { 
          baseFare: { type: Number, default: 80 }, 
          perKmRate: { type: Number, default: 12 }
        },
        xl: { 
          baseFare: { type: Number, default: 70 }, 
          perKmRate: { type: Number, default: 10 }
        },
        family: { 
          baseFare: { type: Number, default: 65 }, 
          perKmRate: { type: Number, default: 8.5 }
        }
      },
      // Minimum fare for car cab service
      minimumFare: { type: Number, default: 40 }, // AED 40 for car cabs
      
      // Sub-services matching vehicle select flow
      subServices: {
        economy: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Economy" },
          info: { type: String, default: "Budget-friendly rides. Hatchbacks & small sedans. Ideal for daily use & short trips." },
          convenienceFee: { type: Number, default: 0 }
        },
        premium: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Premium" },
          info: { type: String, default: "Business-class comfort. Luxury sedans & executive cars. Perfect for corporate travel & events." },
          convenienceFee: { type: Number, default: 5 }
        },
        xl: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "XL (Group Ride)" },
          info: { type: String, default: "SUVs & 7-seaters. Extra luggage space. Great for groups & airport transfers." },
          convenienceFee: { type: Number, default: 10 }
        },
        family: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Family" },
          info: { type: String, default: "Spacious & safe for families. Optional child seat. Focus on comfort & safety for kids." },
          convenienceFee: { type: Number, default: 8 }
        },
        luxury: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Luxury (VIP)" },
          info: { type: String, default: "Ultra-luxury cars like Hummer, GMC, Range Rover, Lexus, Mercedes, BMW. High-class comfort & prestige." },
          convenienceFee: { type: Number, default: 15 }
        }
      }
    },
    bike: {
      enabled: { type: Boolean, default: true },
      vehicleTypes: {
        economy: { 
          baseFare: { type: Number, default: 20 }, 
          perKmRate: { type: Number, default: 3 }
        },
        premium: { 
          baseFare: { type: Number, default: 25 }, 
          perKmRate: { type: Number, default: 4 }
        },
        vip: { 
          baseFare: { type: Number, default: 30 }, 
          perKmRate: { type: Number, default: 5 }
        }
      },
      // Minimum fare for bike service
      minimumFare: { type: Number, default: 15 }, // AED 15 for bikes
      // Fallback for backward compatibility
      baseFare: { type: Number, default: 25 },
      perKmRate: { type: Number, default: 4 },
      
      // Sub-services matching vehicle select flow
      subServices: {
        economy: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Economy" },
          info: { type: String, default: "Budget-friendly motorbike rides." },
          convenienceFee: { type: Number, default: 0 }
        },
        premium: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Premium" },
          info: { type: String, default: "Comfortable bikes with experienced riders." },
          convenienceFee: { type: Number, default: 3 }
        },
        vip: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "VIP" },
          info: { type: String, default: "Stylish, high-end bikes for an exclusive experience." },
          convenienceFee: { type: Number, default: 5 }
        }
      }
    },
    carRecovery: {
      enabled: { type: Boolean, default: true },
      
      // Base fare structure (applies to all types except roadside assistance and winching)
      baseFare: {
        amount: { type: Number, default: 50 }, // AED 50 for first 6km
        coverageKm: { type: Number, default: 6 }
      },
      
      // Per KM rate after base coverage
      perKmRate: {
        afterBaseCoverage: { type: Number, default: 7.5 }, // AED 7.5/km after 6km
        cityWiseAdjustment: {
          enabled: { type: Boolean, default: true },
          aboveKm: { type: Number, default: 10 },
          adjustedRate: { type: Number, default: 5 } // AED 5/km if trip >10km in specific country
        }
      },
      
      // Minimum fare
      minimumFare: { type: Number, default: 50 }, // If total trip < 6km → still charge AED 50
      
      // Platform fee (split logic)
      platformFee: {
        percentage: { type: Number, default: 15 }, // Deduct 15% of total fare
        driverShare: { type: Number, default: 7.5 }, // 7.5% → driver side
        customerShare: { type: Number, default: 7.5 } // 7.5% → customer side
      },
      
      // Cancellation logic
      cancellationCharges: {
        beforeArrival: { type: Number, default: 2 }, // AED 2 (only apply once rider has crossed 25% of driver's distance)
        after50PercentDistance: { type: Number, default: 5 }, // If driver covered ≥ 50% of way → AED 5
        afterArrival: { type: Number, default: 10 } // After driver arrived at pickup → AED 10
      },
      
      // Waiting charges
      waitingCharges: {
        freeMinutes: { type: Number, default: 5 }, // Free wait: 5 minutes
        perMinuteRate: { type: Number, default: 2 }, // After 5 mins → AED 2/minute
        maximumCharge: { type: Number, default: 20 }, // Stop charging after AED 20 cap
        driverControlPopup: {
          enabled: { type: Boolean, default: true },
          popupTitle: { type: String, default: "Free Stay Time Ended – Select Action" },
          driverOptions: {
            continueNoCharges: {
              label: { type: String, default: "Continue – No Overtime Charges" },
              description: { type: String, default: "Driver is okay to still wait, overtime won't start" }
            },
            startOvertimeCharges: {
              label: { type: String, default: "Start Overtime Charges" },
              description: { type: String, default: "Driver wants the system to begin charging the customer" }
            }
          },
          failsafeCondition: {
            autoStart: { type: Boolean, default: false }, // If driver doesn't press any button, overtime does NOT start automatically
            description: { type: String, default: "System keeps waiting until driver makes a choice" }
          }
        }
      },
      
      // Night charges (22:00–06:00)
      nightCharges: {
        enabled: { type: Boolean, default: true },
        startHour: { type: Number, default: 22 }, // 22:00
        endHour: { type: Number, default: 6 }, // 06:00
        fixedAmount: { type: Number, default: 10 }, // add AED 10
        multiplier: { type: Number, default: 1.25 }, // OR apply multiplier 1.25x
        adminConfigurable: { type: Boolean, default: true }
      },
      
      // Surge pricing (Admin Control)
      surgePricing: {
        enabled: { type: Boolean, default: true },
        adminControlled: { type: Boolean, default: true },
        noSurge: { type: Boolean, default: true }, // Admin checkbox: No Surge
        surge1_5x: { type: Boolean, default: false }, // Admin checkbox: 1.5x
        surge2_0x: { type: Boolean, default: false }, // Admin checkbox: 2.0x
        levels: [{
          demandRatio: { type: Number, default: 2 }, // 1.5x if demand = 2x cars
          multiplier: { type: Number, default: 1.5 }
        }, {
          demandRatio: { type: Number, default: 3 }, // 2.0x if demand = 3x cars
          multiplier: { type: Number, default: 2.0 }
        }]
      },
      
      // Service categories matching vehicle select flow
      categories: {
        towingServices: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Towing Services" },
          imageHint: { type: String, default: "Tow truck carrying a sedan on flatbed" },
          
          // Base fare structure
          baseFare: {
            amount: { type: Number, default: 50 }, // AED 50 for first 6km
            coverageKm: { type: Number, default: 6 }
          },
          
          // Per KM rate after base coverage
          perKmRate: {
            afterBaseCoverage: { type: Number, default: 7.5 }, // AED 7.5/km after 6km
            cityWiseAdjustment: {
              enabled: { type: Boolean, default: true },
              aboveKm: { type: Number, default: 10 },
              adjustedRate: { type: Number, default: 5 } // AED 5/km if trip >10km
            }
          },
          
          // Minimum fare
          minimumFare: { type: Number, default: 50 },
          
          // Platform fee
          platformFee: {
            percentage: { type: Number, default: 15 },
            driverShare: { type: Number, default: 7.5 },
            customerShare: { type: Number, default: 7.5 }
          },
          
          // Cancellation charges
          cancellationCharges: {
            beforeArrival: { type: Number, default: 2 },
            after50PercentDistance: { type: Number, default: 5 },
            afterArrival: { type: Number, default: 10 }
          },
          
          // Waiting charges
          waitingCharges: {
            freeMinutes: { type: Number, default: 5 },
            perMinuteRate: { type: Number, default: 2 },
            maximumCharge: { type: Number, default: 20 }
          },
          
          // Night charges
          nightCharges: {
            enabled: { type: Boolean, default: true },
            fixedAmount: { type: Number, default: 10 },
            multiplier: { type: Number, default: 1.25 }
          },
          
          // Surge pricing
          surgePricing: {
            enabled: { type: Boolean, default: true },
            levels: [{
              demandRatio: { type: Number, default: 2 },
              multiplier: { type: Number, default: 1.5 }
            }, {
              demandRatio: { type: Number, default: 3 },
              multiplier: { type: Number, default: 2.0 }
            }]
          },
          
          // Helper charges
          helperCharges: {
            enabled: { type: Boolean, default: true },
            amount: { type: Number, default: 15 } // AED 15 for helper
          },
          
          // Convenience fee
          convenienceFee: { type: Number, default: 25 },
          
          // VAT
          vat: {
            enabled: { type: Boolean, default: true },
            percentage: { type: Number, default: 5 }
          },
          
          subServices: {
            flatbedTowing: { 
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "Flatbed Towing" },
              info: { type: String, default: "Safest option for all vehicles, including luxury/exotic cars & low clearance models." },
              convenienceFee: { type: Number, default: 30 },
              helperCharges: { type: Number, default: 20 }
            },
            wheelLiftTowing: { 
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "Wheel Lift Towing" },
              info: { type: String, default: "Quick & efficient method lifting front or rear wheels, suitable for short-distance towing." },
              convenienceFee: { type: Number, default: 25 },
              helperCharges: { type: Number, default: 15 }
            }
          }
        },
        winchingServices: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Winching Services" },
          imageHint: { type: String, default: "4x4 recovery vehicle pulling SUV from roadside mud" },
          
          // Base fare structure
          baseFare: {
            amount: { type: Number, default: 60 }, // AED 60 for first 5km
            coverageKm: { type: Number, default: 5 }
          },
          
          // Per KM rate after base coverage
          perKmRate: {
            afterBaseCoverage: { type: Number, default: 8 }, // AED 8/km after 5km
            cityWiseAdjustment: {
              enabled: { type: Boolean, default: true },
              aboveKm: { type: Number, default: 8 },
              adjustedRate: { type: Number, default: 6 }
            }
          },
          
          // Minimum fare
          minimumFare: { type: Number, default: 60 },
          
          // Platform fee
          platformFee: {
            percentage: { type: Number, default: 15 },
            driverShare: { type: Number, default: 7.5 },
            customerShare: { type: Number, default: 7.5 }
          },
          
          // Cancellation charges
          cancellationCharges: {
            beforeArrival: { type: Number, default: 3 },
            after50PercentDistance: { type: Number, default: 8 },
            afterArrival: { type: Number, default: 15 }
          },
          
          // Waiting charges
          waitingCharges: {
            freeMinutes: { type: Number, default: 10 },
            perMinuteRate: { type: Number, default: 3 },
            maximumCharge: { type: Number, default: 30 }
          },
          
          // Night charges
          nightCharges: {
            enabled: { type: Boolean, default: true },
            fixedAmount: { type: Number, default: 15 },
            multiplier: { type: Number, default: 1.3 }
          },
          
          // Surge pricing
          surgePricing: {
            enabled: { type: Boolean, default: true },
            levels: [{
              demandRatio: { type: Number, default: 1.5 },
              multiplier: { type: Number, default: 1.4 }
            }, {
              demandRatio: { type: Number, default: 2.5 },
              multiplier: { type: Number, default: 1.8 }
            }]
          },
          
          // Helper charges
          helperCharges: {
            enabled: { type: Boolean, default: true },
            amount: { type: Number, default: 20 } // AED 20 for winching helper
          },
          
          // Convenience fee
          convenienceFee: { type: Number, default: 50 },
          
          // VAT
          vat: {
            enabled: { type: Boolean, default: true },
            percentage: { type: Number, default: 5 }
          },
          
          subServices: {
            onRoadWinching: { 
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "On-Road Winching" },
              info: { type: String, default: "For vehicles stuck roadside due to ditch, breakdown, or minor accident." },
              convenienceFee: { type: Number, default: 50 },
              helperCharges: { type: Number, default: 20 }
            },
            offRoadWinching: { 
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "Off-Road Winching" },
              info: { type: String, default: "Recovery for vehicles stuck in sand, mud, or rough terrain." },
              convenienceFee: { type: Number, default: 60 },
              helperCharges: { type: Number, default: 25 }
            }
          }
        },
        roadsideAssistance: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Roadside Assistance" },
          imageHint: { type: String, default: "Technician helping with car battery on roadside" },
          
          // Base fare structure
          baseFare: {
            amount: { type: Number, default: 40 }, // AED 40 for first 3km
            coverageKm: { type: Number, default: 3 }
          },
          
          // Per KM rate after base coverage
          perKmRate: {
            afterBaseCoverage: { type: Number, default: 6 }, // AED 6/km after 3km
            cityWiseAdjustment: {
              enabled: { type: Boolean, default: true },
              aboveKm: { type: Number, default: 5 },
              adjustedRate: { type: Number, default: 4 }
            }
          },
          
          // Minimum fare
          minimumFare: { type: Number, default: 40 },
          
          // Platform fee
          platformFee: {
            percentage: { type: Number, default: 12 },
            driverShare: { type: Number, default: 6 },
            customerShare: { type: Number, default: 6 }
          },
          
          // Cancellation charges
          cancellationCharges: {
            beforeArrival: { type: Number, default: 1 },
            after50PercentDistance: { type: Number, default: 3 },
            afterArrival: { type: Number, default: 5 }
          },
          
          // Waiting charges
          waitingCharges: {
            freeMinutes: { type: Number, default: 15 },
            perMinuteRate: { type: Number, default: 1 },
            maximumCharge: { type: Number, default: 15 }
          },
          
          // Night charges
          nightCharges: {
            enabled: { type: Boolean, default: true },
            fixedAmount: { type: Number, default: 8 },
            multiplier: { type: Number, default: 1.2 }
          },
          
          // Surge pricing
          surgePricing: {
            enabled: { type: Boolean, default: true },
            levels: [{
              demandRatio: { type: Number, default: 1.8 },
              multiplier: { type: Number, default: 1.3 }
            }, {
              demandRatio: { type: Number, default: 2.8 },
              multiplier: { type: Number, default: 1.6 }
            }]
          },
          
          // Helper charges
          helperCharges: {
            enabled: { type: Boolean, default: true },
            amount: { type: Number, default: 10 } // AED 10 for roadside helper
          },
          
          // Convenience fee
          convenienceFee: { type: Number, default: 50 },
          
          // VAT
          vat: {
            enabled: { type: Boolean, default: true },
            percentage: { type: Number, default: 5 }
          },
          
          subServices: {
            batteryJumpStart: { 
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "Battery Jump Start" },
              info: { type: String, default: "Portable jump-start service when battery is dead." },
              convenienceFee: { type: Number, default: 60 },
              helperCharges: { type: Number, default: 10 }
            },
            fuelDelivery: {
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "Fuel Delivery" },
              info: { type: String, default: "Fuel delivered directly to stranded vehicles (petrol/diesel)." },
              convenienceFee: { type: Number, default: 80 },
              helperCharges: { type: Number, default: 15 }
            }
          }
        },
        specializedHeavyRecovery: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "Specialized/Heavy Recovery" },
          imageHint: { type: String, default: "Heavy-duty 6-wheeler tow truck pulling a large truck" },
          
          // Base fare structure
          baseFare: {
            amount: { type: Number, default: 80 }, // AED 80 for first 8km
            coverageKm: { type: Number, default: 8 }
          },
          
          // Per KM rate after base coverage
          perKmRate: {
            afterBaseCoverage: { type: Number, default: 10 }, // AED 10/km after 8km
            cityWiseAdjustment: {
              enabled: { type: Boolean, default: true },
              aboveKm: { type: Number, default: 12 },
              adjustedRate: { type: Number, default: 8 }
            }
          },
          
          // Minimum fare
          minimumFare: { type: Number, default: 80 },
          
          // Platform fee
          platformFee: {
            percentage: { type: Number, default: 18 },
            driverShare: { type: Number, default: 9 },
            customerShare: { type: Number, default: 9 }
          },
          
          // Cancellation charges
          cancellationCharges: {
            beforeArrival: { type: Number, default: 5 },
            after50PercentDistance: { type: Number, default: 12 },
            afterArrival: { type: Number, default: 20 }
          },
          
          // Waiting charges
          waitingCharges: {
            freeMinutes: { type: Number, default: 20 },
            perMinuteRate: { type: Number, default: 4 },
            maximumCharge: { type: Number, default: 50 }
          },
          
          // Night charges
          nightCharges: {
            enabled: { type: Boolean, default: true },
            fixedAmount: { type: Number, default: 20 },
            multiplier: { type: Number, default: 1.4 }
          },
          
          // Surge pricing
          surgePricing: {
            enabled: { type: Boolean, default: true },
            levels: [{
              demandRatio: { type: Number, default: 1.3 },
              multiplier: { type: Number, default: 1.5 }
            }, {
              demandRatio: { type: Number, default: 2.2 },
              multiplier: { type: Number, default: 2.2 }
            }]
          },
          
          // Helper charges
          helperCharges: {
            enabled: { type: Boolean, default: true },
            amount: { type: Number, default: 25 } // AED 25 for heavy recovery helper
          },
          
          // Convenience fee
          convenienceFee: { type: Number, default: 75 },
          
          // VAT
          vat: {
            enabled: { type: Boolean, default: true },
            percentage: { type: Number, default: 5 }
          },
          
          subServices: {
            luxuryExoticCarRecovery: { 
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "Luxury & Exotic Car Recovery" },
              info: { type: String, default: "Secure handling of high-end vehicles." },
              convenienceFee: { type: Number, default: 100 },
              helperCharges: { type: Number, default: 30 }
            },
            accidentCollisionRecovery: { 
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "Accident & Collision Recovery" },
              info: { type: String, default: "Safe recovery after accidents." },
              convenienceFee: { type: Number, default: 80 },
              helperCharges: { type: Number, default: 25 }
            },
            heavyDutyVehicleRecovery: { 
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "Heavy-Duty Vehicle Recovery" },
              info: { type: String, default: "Tow buses, trucks, and trailers." },
              convenienceFee: { type: Number, default: 90 },
              helperCharges: { type: Number, default: 35 }
            },
            basementPullOut: { 
              enabled: { type: Boolean, default: true },
              label: { type: String, default: "Basement Pull-Out" },
              info: { type: String, default: "Specialized service for underground/basement parking." },
              convenienceFee: { type: Number, default: 85 },
              helperCharges: { type: Number, default: 28 }
            }
          }
        }
      },
      
      // Refreshment Alert (for rides >20km OR >30 minutes)
      refreshmentAlert: {
        enabled: { type: Boolean, default: true },
        minimumDistance: { type: Number, default: 20 }, // >20 km
        minimumDuration: { type: Number, default: 30 }, // >30 minutes
        perMinuteCharges: { type: Number, default: 1 }, // AED 1/minute
        per5MinCharges: { type: Number, default: 5 }, // AED 5/5min charges
        maximumCharges: { type: Number, default: 30 }, // Maximum 30 minutes stopped over time charges
        popupTitle: { type: String, default: "Free Stay Time Ended – Select Action" },
        driverOptions: {
          continueNoCharges: { type: String, default: "Continue – No Overtime Charges" },
          startOvertimeCharges: { type: String, default: "Start Overtime Charges" }
        },
        failsafeCondition: {
          autoStart: { type: Boolean, default: false }, // If driver does not press any button, overtime does NOT start automatically
          waitForDriverChoice: { type: Boolean, default: true }
        }
      },
      
      // Free Stay Minutes (Round Trips only)
      freeStayMinutes: {
        enabled: { type: Boolean, default: true },
        ratePerKm: { type: Number, default: 0.5 }, // 0.5 min per km of trip
        maximumCap: { type: Number, default: 60 }, // Maximum cap (configurable by admin)
        notifications: {
          fiveMinRemaining: { type: Boolean, default: true }, // Auto push notification on 5 min remaining
          freeStayOver: { type: Boolean, default: true } // Push notification for free stay minutes over
        }
      },
      
      // VAT (country based)
      vat: {
        enabled: { type: Boolean, default: true },
        countryBased: { type: Boolean, default: true },
        percentage: { type: Number, default: 5 }, // Apply country based VAT on total fare
        showTotalIncludingTax: { type: Boolean, default: true } // Show Fair Total Amount including tax
      }
    },
    shiftingMovers: {
      enabled: { type: Boolean, default: true },
      // 1. Vehicle Cost
      vehicleCost: {
        startFare: { type: Number, default: 100 }, // Minimum fare AED - covers 5KM
        coverageKm: { type: Number, default: 5 }, // Base coverage in KM
        perKmRate: { type: Number, default: 15 } // Per KM fare after 5KM
      },
      // 2. Basic Service Costs (flat fee if selected)
      basicServices: {
        loadingUnloadingHelper: {
          flatFee: { type: Number, default: 20 }, // AED 20
          includeInBasicFare: { type: Boolean, default: true }, // Checkbox
          baseLimit: { type: Number, default: 3 } // Number of items covered in basic charge
        },
        packers: {
          flatFee: { type: Number, default: 20 }, // AED 20
          includeInBasicFare: { type: Boolean, default: true },
          baseLimit: { type: Number, default: 3 }
        },
        fixers: {
          flatFee: { type: Number, default: 20 }, // AED 20
          includeInBasicFare: { type: Boolean, default: true },
          baseLimit: { type: Number, default: 3 }
        }
      },
      // 3. Pickup Location Policy
      pickupLocationPolicy: {
        groundFloor: {
          extraCharge: { type: Number, default: 0 } // No extra charge
        },
        stairs: {
          perFloorFare: {
            bed: { type: Number, default: 5 }, // AED 5 per floor per bed
            fridge: { type: Number, default: 15 }, // AED 15 per floor per fridge
            sofa: { type: Number, default: 8 },
            table: { type: Number, default: 4 },
            chair: { type: Number, default: 2 },
            wardrobe: { type: Number, default: 10 },
            washingMachine: { type: Number, default: 12 },
            tv: { type: Number, default: 6 },
            microwave: { type: Number, default: 3 },
            other: { type: Number, default: 5 }
          }
        },
        lift: {
          minorCharge: {
            bed: { type: Number, default: 5 }, // AED 5 per item
            fridge: { type: Number, default: 7 }, // AED 7 per item
            sofa: { type: Number, default: 6 },
            table: { type: Number, default: 3 },
            chair: { type: Number, default: 2 },
            wardrobe: { type: Number, default: 8 },
            washingMachine: { type: Number, default: 9 },
            tv: { type: Number, default: 4 },
            microwave: { type: Number, default: 2 },
            other: { type: Number, default: 4 }
          },
          baseLimit: { type: Number, default: 1 }, // Base covers Ground +1 Floor
          baseCoverage: { type: String, default: 'Ground +1 Floor' }
        }
      },
      // 4. Drop-off Location Policy (Same as Pickup)
      dropoffLocationPolicy: {
        groundFloor: {
          extraCharge: { type: Number, default: 0 }
        },
        stairs: {
          perFloorFare: {
            bed: { type: Number, default: 5 },
            fridge: { type: Number, default: 15 },
            sofa: { type: Number, default: 8 },
            table: { type: Number, default: 4 },
            chair: { type: Number, default: 2 },
            wardrobe: { type: Number, default: 10 },
            washingMachine: { type: Number, default: 12 },
            tv: { type: Number, default: 6 },
            microwave: { type: Number, default: 3 },
            other: { type: Number, default: 5 }
          }
        },
        lift: {
          minorCharge: {
            bed: { type: Number, default: 5 },
            fridge: { type: Number, default: 7 },
            sofa: { type: Number, default: 6 },
            table: { type: Number, default: 3 },
            chair: { type: Number, default: 2 },
            wardrobe: { type: Number, default: 8 },
            washingMachine: { type: Number, default: 9 },
            tv: { type: Number, default: 4 },
            microwave: { type: Number, default: 2 },
            other: { type: Number, default: 4 }
          },
          baseLimit: { type: Number, default: 1 },
          baseCoverage: { type: String, default: 'Ground +1 Floor' }
        }
      },
      // 5. Packing Per Item
      packingFares: {
        bed: { type: Number, default: 15 }, // AED 15 per bed
        fridge: { type: Number, default: 10 }, // AED 10 per fridge
        sofa: { type: Number, default: 12 },
        table: { type: Number, default: 8 },
        chair: { type: Number, default: 5 },
        wardrobe: { type: Number, default: 20 },
        washingMachine: { type: Number, default: 15 },
        tv: { type: Number, default: 10 },
        microwave: { type: Number, default: 6 },
        other: { type: Number, default: 8 }
      },
      // 6. Fixing Per Item
      fixingFares: {
        bed: { type: Number, default: 20 }, // AED 20 per bed
        sofa: { type: Number, default: 15 }, // AED 15 per sofa
        table: { type: Number, default: 10 },
        chair: { type: Number, default: 8 },
        wardrobe: { type: Number, default: 25 },
        washingMachine: { type: Number, default: 30 },
        tv: { type: Number, default: 15 },
        microwave: { type: Number, default: 12 },
        fridge: { type: Number, default: 35 },
        other: { type: Number, default: 15 }
      },
      // 7. Loading/Unloading Per Item
      loadingUnloadingFares: {
        bed: { type: Number, default: 20 }, // AED 20 per bed
        sofa: { type: Number, default: 15 }, // AED 15 per sofa
        table: { type: Number, default: 10 },
        chair: { type: Number, default: 5 },
        wardrobe: { type: Number, default: 18 },
        washingMachine: { type: Number, default: 25 },
        tv: { type: Number, default: 12 },
        microwave: { type: Number, default: 8 },
        fridge: { type: Number, default: 30 },
        other: { type: Number, default: 12 }
      }
    },
    
    // Categories matching vehicle select flow
    categories: {
      smallMover: {
        enabled: { type: Boolean, default: true },
        label: { type: String, default: "Small Mover" },
        info: { type: String, default: "Vehicle: Mini Pickup / Suzuki Carry / Small Van. Best for: Small apartments, single-room shifting, few items." },
        vehicles: [{ type: String, default: "mini pickup" }, { type: String, default: "suzuki carry" }, { type: String, default: "small van" }],
        convenienceFee: { type: Number, default: 20 }
      },
      mediumMover: {
        enabled: { type: Boolean, default: true },
        label: { type: String, default: "Medium Mover" },
        info: { type: String, default: "Vehicle: Medium Truck / Mazda / Covered Van. Best for: 2–3 bedroom homes, medium office relocations." },
        vehicles: [{ type: String, default: "medium truck" }, { type: String, default: "mazda" }, { type: String, default: "covered van" }],
        convenienceFee: { type: Number, default: 30 }
      },
      heavyMover: {
        enabled: { type: Boolean, default: true },
        label: { type: String, default: "Heavy Mover" },
        info: { type: String, default: "Vehicle: Large Truck / 6-Wheeler / Container Truck. Best for: Full house shifting, big offices, industrial goods." },
        vehicles: [{ type: String, default: "large truck" }, { type: String, default: "6-wheeler" }, { type: String, default: "container truck" }],
        convenienceFee: { type: Number, default: 40 }
      }
    }
  },
  
  // Appointment-based services (Workshop, Tyre Shop, etc.)
  appointmentServices: {
    enabled: { type: Boolean, default: true },
    fixedAppointmentFee: { type: Number, default: 5 }, // AED 5 per successful appointment
    confirmationSystem: {
      enabled: { type: Boolean, default: true },
      surveyTimeoutHours: { type: Number, default: 24 }, // 24 hours for survey completion
      autoGpsCheckIn: { type: Boolean, default: true }, // GPS check-in when provider starts appointment
      ratingThreshold: { type: Number, default: 3 }, // Minimum rating for successful appointment
      disputeHandling: {
        enabled: { type: Boolean, default: true },
        adminReviewRequired: { type: Boolean, default: true }
      }
    },
    customerSurvey: {
      questions: [{
        question: { type: String, default: 'How was your experience with [Service Provider Name]?' },
        options: [{ type: String, default: 'Good' }, { type: String, default: 'Bad' }, { type: String, default: 'Didn\'t Visit' }]
      }],
      ratingRequired: { type: Boolean, default: true },
      feedbackOptional: { type: Boolean, default: true }
    },
    providerSurvey: {
      questions: [{
        question: { type: String, default: 'How was [Customer Name]? Behavior?' },
        options: [{ type: String, default: 'Good' }, { type: String, default: 'Bad' }, { type: String, default: 'Didn\'t Meet Yet' }]
      }],
      ratingRequired: { type: Boolean, default: true },
      feedbackOptional: { type: Boolean, default: true }
    },
    successCriteria: {
      bothConfirmGood: { type: Boolean, default: true }, // Both confirm "Good"
      oneConfirmsService: { type: Boolean, default: true }, // At least one confirms service happened
      noShowBoth: { type: Boolean, default: false }, // Both select "Didn't Visit/Didn't Meet Yet" = no fee
      conflictResolution: { type: String, default: 'admin_review' } // admin_review, auto_decline, auto_approve
    },
    penaltySystem: {
      enabled: { type: Boolean, default: true },
      tooManyNoShows: {
        threshold: { type: Number, default: 3 }, // 3 no-shows
        penalty: { type: String, default: 'lower_visibility' } // lower_visibility, flag_account, suspend
      },
      badRatings: {
        threshold: { type: Number, default: 2 }, // Rating below 2
        consecutiveLimit: { type: Number, default: 3 }, // 3 consecutive bad ratings
        penalty: { type: String, default: 'flag_account' }
      }
    }
  },
  
  // Round trip features
  roundTrip: {
    freeStayMinutes: {
      enabled: { type: Boolean, default: true },
      ratePerKm: { type: Number, default: 0.5 }, // 1km = 0.5 minutes
      maximumMinutes: { type: Number, default: 60 } // Maximum free stay
    },
    refreshmentAlert: {
      enabled: { type: Boolean, default: true },
      minimumDistance: { type: Number, default: 20 }, // 20+ km
      minimumDuration: { type: Number, default: 30 } // 30+ minutes
    }
  },
  
  // VAT
  vat: {
    enabled: { type: Boolean, default: true },
    percentage: { type: Number, default: 5 } // 5% government charges
  },
  
  // Currency and general settings
  currency: { type: String, default: 'AED' },
  isActive: { type: Boolean, default: true },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
comprehensivePricingSchema.index({ isActive: 1 });
comprehensivePricingSchema.index({ 'serviceTypes.carCab.enabled': 1 });
comprehensivePricingSchema.index({ 'serviceTypes.bike.enabled': 1 });
comprehensivePricingSchema.index({ 'serviceTypes.carRecovery.enabled': 1 });
comprehensivePricingSchema.index({ 'serviceTypes.shiftingMovers.enabled': 1 });
comprehensivePricingSchema.index({ 'appointmentServices.enabled': 1 });

const ComprehensivePricing = mongoose.model('ComprehensivePricing', comprehensivePricingSchema);

export default ComprehensivePricing;