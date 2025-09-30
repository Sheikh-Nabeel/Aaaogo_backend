// Minimal socket handlers: only room join events
export const handleBookingEvents = (socket, io) => {
  const normalizeId = (val) => {
    try {
      if (typeof val === 'string') {
        const s = val.trim();
        if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
          return normalizeId(JSON.parse(s));
        }
        return s;
      }
      if (Array.isArray(val)) return normalizeId(val[0]);
      if (val && typeof val === 'object') {
        if (val.userId) return normalizeId(val.userId);
        if (val.driverId) return normalizeId(val.driverId);
        if (val.id) return normalizeId(val.id);
      }
      return val != null ? String(val).trim() : '';
    } catch {
      return val != null ? String(val).trim() : '';
    }
  };

  // Join customer room with ack
  socket.on("join_customer_room", (userId, ack) => {
    const providedIdRaw = (typeof userId === 'undefined' || userId === null)
      ? socket.user?._id
      : userId;
    const providedIdStr = normalizeId(providedIdRaw);
    const authIdStr = String(socket.user?._id).trim();

    if (!providedIdStr) {
      const err = { message: "User ID is required to join customer room" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }
    if (!socket.user || authIdStr !== providedIdStr) {
      const err = { message: `Unauthorized: Cannot join room for different customer (expected ${authIdStr}, got ${providedIdStr})` };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

    socket.join(`customer_${providedIdStr}`);
    const payload = { room: `customer_${providedIdStr}`, message: "Successfully joined customer room" };
    console.log(`Joined room: customer_${providedIdStr} (user: ${authIdStr}, socket: ${socket.id})`.green);
    socket.emit("room_joined", payload);
    if (typeof ack === 'function') ack({ ok: true, ...payload });
  });


  // Join driver room with ack
  socket.on("join_driver_room", (driverId, ack) => {
    const providedRaw = (typeof driverId === 'undefined' || driverId === null) ? socket.user?._id : driverId;
    const providedIdStr = normalizeId(providedRaw);
    const authIdStr = String(socket.user?._id).trim();

    if (!providedIdStr) {
      const err = { message: "Driver ID is required to join room" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }
    if (!socket.user || authIdStr !== providedIdStr) {
      const err = { message: `Unauthorized: Cannot join room for different driver (expected ${authIdStr}, got ${providedIdStr})` };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }
    if (socket.user.role !== "driver") {
      const err = { message: "Unauthorized: Only drivers can join driver rooms" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }
      
    socket.join(`driver_${providedIdStr}`);
    const payload = { room: `driver_${providedIdStr}`, message: "Successfully joined driver room" };
    console.log(`Joined room: driver_${providedIdStr} (driver: ${authIdStr}, socket: ${socket.id})`.green);
    socket.emit("room_joined", payload);
    if (typeof ack === 'function') ack({ ok: true, ...payload });
  });
};

// Helper function to find nearby drivers
export const findNearbyDrivers = async (booking, io = null) => {
  try {
    console.log('=== FINDING NEARBY DRIVERS ===');
    console.log('Booking ID:', booking._id);
    console.log('Service Type:', booking.serviceType);
    console.log('Vehicle Type:', booking.vehicleType);
    console.log('Driver Preference:', booking.driverPreference);
    
    // Handle pinned driver preference
    if (booking.driverPreference === 'pinned' && booking.pinnedDriverId) {
      console.log('Pinned driver requested:', booking.pinnedDriverId);
      const pinnedDriver = await User.findById(booking.pinnedDriverId);
      
      if (pinnedDriver && pinnedDriver.role === 'driver' && pinnedDriver.isActive) {
        console.log('Pinned driver found and active:', pinnedDriver.email);
        return [pinnedDriver];
      } else {
        console.log('Pinned driver not found or not active');
        return [];
      }
    }
    
    let driverQuery = {
      role: 'driver',
      kycLevel: 2,
      kycStatus: 'approved',
      isActive: true
    };

    // Handle Pink Captain preferences
    if (booking.driverPreference === 'pink_captain') {
      driverQuery.gender = 'female';
      console.log('Pink Captain requested - filtering for female drivers');
    }

    // Handle vehicle type filtering
    if (booking.vehicleType && booking.vehicleType !== 'any') {
      driverQuery.vehicleType = booking.vehicleType;
    }

    console.log('Driver Query:', driverQuery);

    // Find drivers based on query
    const drivers = await User.find(driverQuery);
    console.log(`Found ${drivers.length} potential drivers`);

    if (drivers.length === 0) {
      console.log('No drivers found matching criteria');
      return [];
    }

    // Calculate distances and filter by radius
    const driversWithDistance = [];
    const maxRadius = booking.driverPreference === 'pink_captain' ? 50 : 5; // 50km for Pink Captain, 5km for regular

    for (const driver of drivers) {
      if (driver.currentLocation && driver.currentLocation.coordinates) {
        const distance = calculateDistance(
          { lat: booking.pickupLocation.coordinates[1], lng: booking.pickupLocation.coordinates[0] },
          { lat: driver.currentLocation.coordinates[1], lng: driver.currentLocation.coordinates[0] }
        );

        if (distance <= maxRadius) {
          driversWithDistance.push({
            ...driver.toObject(),
            distance: distance
          });
        }
      }
    }

    // Filter Pink Captain drivers based on their preferences
    let filteredDrivers = driversWithDistance;
    if (booking.driverPreference === 'pink_captain' && booking.pinkCaptainOptions) {
      console.log('Filtering Pink Captain drivers based on preferences...');
      
      filteredDrivers = driversWithDistance.filter(driver => {
        const driverPrefs = driver.driverSettings?.ridePreferences;
        if (!driverPrefs || !driverPrefs.pinkCaptainMode) {
          return false; // Driver must have Pink Captain mode enabled
        }

        // Check if driver accepts the specific Pink Captain options requested
        if (booking.pinkCaptainOptions.femalePassengersOnly && !driverPrefs.acceptFemaleOnly) {
          return false;
        }
        if (booking.pinkCaptainOptions.familyRides && !driverPrefs.acceptFamilyRides) {
          return false;
        }
        if (booking.pinkCaptainOptions.safeZoneRides && !driverPrefs.acceptSafeRides) {
          return false;
        }
        if (booking.pinkCaptainOptions.familyWithGuardianMale && !driverPrefs.acceptFamilyWithGuardianMale) {
          return false;
        }
        if (booking.pinkCaptainOptions.maleWithoutFemale && !driverPrefs.acceptMaleWithoutFemale) {
          return false;
        }
        if (booking.pinkCaptainOptions.noMaleCompanion && !driverPrefs.acceptNoMaleCompanion) {
          return false;
        }

        return true; // Driver accepts this type of Pink Captain ride
      });
      
      console.log(`Filtered to ${filteredDrivers.length} Pink Captain drivers matching preferences`);
    }

    // Sort by distance
    filteredDrivers.sort((a, b) => a.distance - b.distance);
    
    console.log(`Found ${filteredDrivers.length} qualified drivers within ${maxRadius}km radius`);
    return filteredDrivers;

  } catch (error) {
    console.error('Error finding nearby drivers:', error);
    return [];
  }
};

// Helper function to get fare adjustment settings
const getFareAdjustmentSettings = async (serviceType) => {
  try {
    // Mock fare adjustment settings (replace with database lookup in production)
    const defaultSettings = {
      allowedAdjustmentPercentage: 20, // Allow 20% fare adjustment
      enableUserFareAdjustment: true,
      enableDriverFareAdjustment: true,
      minimumFare: 10,
      maximumFare: 1000
    };
    
    // You can customize settings based on service type
    switch (serviceType) {
      case 'car cab':
        return { ...defaultSettings, allowedAdjustmentPercentage: 15 };
      case 'shifting & movers':
        return { ...defaultSettings, allowedAdjustmentPercentage: 25 };
      case 'car recovery':
        return { ...defaultSettings, allowedAdjustmentPercentage: 30 };
      default:
        return defaultSettings;
    }
  } catch (error) {
    console.error('Error getting fare adjustment settings:', error);
    return {
      allowedAdjustmentPercentage: 20,
      enableUserFareAdjustment: true,
      enableDriverFareAdjustment: true,
      minimumFare: 10,
      maximumFare: 1000
    };
  }
};