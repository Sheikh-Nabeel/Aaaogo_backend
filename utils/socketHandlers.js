// Socket handlers: room join events + location events
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

  // ===== LOCATION EVENTS =====
  
  // Update user location (real-time)
  socket.on("update_location", async (locationData, ack) => {
    try {
      if (!socket.user || !socket.user._id) {
        const err = { message: "Authentication required" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      console.log('Received location data:', locationData);
      console.log('Location data type:', typeof locationData);
      
      // Handle multiple formats: stringified array, direct array, or object with coordinates property
      let coordinates, accuracy, timestamp;
      
      if (Array.isArray(locationData)) {
        // Direct array format: [longitude, latitude]
        coordinates = locationData;
        accuracy = null;
        timestamp = new Date();
      } else if (typeof locationData === 'string') {
        // Stringified format: "[55.2708, 25.2048]" or "{coordinates: [55.2708, 25.2048]}" or "{coordinates: [55.2708, 25.2048]}"
        try {
          let parsed;
          
          // First try direct JSON parse
          try {
            parsed = JSON.parse(locationData);
          } catch (jsonError) {
            // If JSON parse fails, try to fix malformed JSON (missing quotes around property names)
            const fixedJson = locationData.replace(/(\w+):/g, '"$1":');
            parsed = JSON.parse(fixedJson);
          }
          
          if (Array.isArray(parsed) && parsed.length === 2) {
            // Stringified array format: "[55.2708, 25.2048]"
            coordinates = parsed;
            accuracy = null;
            timestamp = new Date();
          } else if (parsed && typeof parsed === 'object' && parsed.coordinates) {
            // Stringified object format: "{coordinates: [55.2708, 25.2048]}" or '{"coordinates": [55.2708, 25.2048]}'
            coordinates = parsed.coordinates;
            accuracy = parsed.accuracy || null;
            timestamp = parsed.timestamp || new Date();
          } else {
            throw new Error('Invalid format');
          }
        } catch (error) {
          const err = { message: "Invalid stringified format. Expected '[longitude, latitude]' or '{coordinates: [longitude, latitude]}'" };
          socket.emit("error", err);
          if (typeof ack === 'function') ack({ ok: false, error: err.message });
          return;
        }
      } else if (locationData && typeof locationData === 'object') {
        // Object format: { coordinates: [longitude, latitude], accuracy, timestamp }
        coordinates = locationData.coordinates;
        accuracy = locationData.accuracy;
        timestamp = locationData.timestamp;
      } else {
        const err = { message: "Invalid location data format. Expected array [longitude, latitude], string '[longitude, latitude]', or object {coordinates: [longitude, latitude]}" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }
      
      console.log('Coordinates type:', typeof coordinates);
      console.log('Coordinates:', coordinates);
      
      // Validate coordinates
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
        const err = { message: "Invalid coordinates format. Expected [longitude, latitude]" };
        console.error('Coordinates validation failed:', { coordinates, isArray: Array.isArray(coordinates), length: coordinates?.length });
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      // Convert coordinates to numbers if they're strings
      const longitude = parseFloat(coordinates[0]);
      const latitude = parseFloat(coordinates[1]);
      
      // Check if conversion was successful
      if (isNaN(longitude) || isNaN(latitude)) {
        const err = { message: "Invalid coordinate values. Must be valid numbers" };
        console.error('Coordinate conversion failed:', { longitude, latitude, original: coordinates });
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }
      
      // Validate coordinate ranges
      if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
        const err = { message: "Invalid coordinate values" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      // Import User model
      const User = (await import('../models/userModel.js')).default;
      
      // Use converted coordinates
      const finalCoordinates = [longitude, latitude];
      
      // Update user location in database
      await User.findByIdAndUpdate(socket.user._id, {
        currentLocation: {
          type: 'Point',
          coordinates: finalCoordinates
        },
        lastActiveAt: new Date()
      });

      // Broadcast location update to relevant rooms
      const locationUpdate = {
        userId: socket.user._id,
        userRole: socket.user.role,
        location: {
          coordinates: finalCoordinates,
          accuracy: accuracy || null,
          timestamp: timestamp || new Date()
        },
        lastActive: new Date()
      };

      // Broadcast to all connected clients (real-time location sharing)
      io.emit('location_updated', locationUpdate);
      
      // Also broadcast to specific rooms based on user role
      if (socket.user.role === 'driver') {
        io.to('drivers_online').emit('driver_location_updated', locationUpdate);
      } else if (socket.user.role === 'customer') {
        io.to('customers_online').emit('customer_location_updated', locationUpdate);
      }

      console.log(`Location updated for ${socket.user.role} ${socket.user._id}: [${longitude}, ${latitude}]`.cyan);
      
      // Send acknowledgment
      if (typeof ack === 'function') {
        ack({ 
          ok: true, 
          message: "Location updated successfully",
          location: locationUpdate.location
        });
      }

    } catch (error) {
      console.error('Error updating location:', error);
      const err = { message: "Failed to update location" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // Get user location (real-time)
  socket.on("get_location", async (targetUserId, ack) => {
    try {
      if (!socket.user || !socket.user._id) {
        const err = { message: "Authentication required" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      // Use provided userId or default to authenticated user
      const userId = targetUserId || socket.user._id;
      
      // Import User model
      const User = (await import('../models/userModel.js')).default;
      
      // Get user location from database
      const user = await User.findById(userId).select('currentLocation lastActiveAt role isActive driverStatus');
      
      if (!user) {
        const err = { message: "User not found" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      // Check if user is online (active within last 5 minutes)
      const isOnline = user.lastActiveAt && (new Date() - new Date(user.lastActiveAt)) < 5 * 60 * 1000;
      
      const locationData = {
        userId: user._id,
        userRole: user.role,
        location: user.currentLocation,
        lastActive: user.lastActiveAt,
        isOnline: isOnline,
        isActive: user.isActive,
        driverStatus: user.driverStatus || null
      };

      // Send location data
      socket.emit('location_data', locationData);
      
      // Send acknowledgment
      if (typeof ack === 'function') {
        ack({ 
          ok: true, 
          message: "Location retrieved successfully",
          data: locationData
        });
      }

      console.log(`Location retrieved for user ${userId} (${user.role}): ${isOnline ? 'Online' : 'Offline'}`.cyan);

    } catch (error) {
      console.error('Error getting location:', error);
      const err = { message: "Failed to get location" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // ===== DRIVER STATUS EVENTS =====
  
  // Driver go online
  socket.on("driver_online", async (data, ack) => {
    try {
      console.log('Driver online event received:', { data, ackType: typeof ack, hasAck: !!ack });
      
      if (!socket.user || !socket.user._id) {
        const err = { message: "Authentication required" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      if (socket.user.role !== "driver") {
        const err = { message: "Only drivers can go online" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      // Check if driver has joined the driver room
      const driverRoom = `driver_${socket.user._id}`;
      if (!socket.rooms.has(driverRoom)) {
        const err = { message: "Driver must join driver room first before going online" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      // Import User model
      const User = (await import('../models/userModel.js')).default;
      
      // Update driver status to online in database
      await User.findByIdAndUpdate(socket.user._id, {
        isActive: true,
        driverStatus: "online",
        lastActiveAt: new Date()
      });

      console.log(`Driver ${socket.user._id} (${socket.user.email}) is now ONLINE`.green);
      
      // Send acknowledgment
      const response = { 
        ok: true, 
        message: "Driver is now online",
        status: "online"
      };
      
      console.log('Sending acknowledgment:', response);
      console.log('Ack function type:', typeof ack);
      
      if (typeof ack === 'function') {
        ack(response);
        console.log('Acknowledgment sent successfully');
      } else {
        console.log('No acknowledgment function provided');
        // Send response via emit as fallback
        socket.emit('driver_online_response', response);
      }

    } catch (error) {
      console.error('Error setting driver online:', error);
      const err = { message: "Failed to set driver online" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // Driver go offline
  socket.on("driver_offline", async (data, ack) => {
    try {
      console.log('Driver offline event received:', { data, ackType: typeof ack, hasAck: !!ack });
      
      if (!socket.user || !socket.user._id) {
        const err = { message: "Authentication required" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      if (socket.user.role !== "driver") {
        const err = { message: "Only drivers can go offline" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      // Check if driver has joined the driver room
      const driverRoom = `driver_${socket.user._id}`;
      if (!socket.rooms.has(driverRoom)) {
        const err = { message: "Driver must join driver room first before going offline" };
        socket.emit("error", err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        return;
      }

      // Import User model
      const User = (await import('../models/userModel.js')).default;
      
      // Update driver status to offline in database
      await User.findByIdAndUpdate(socket.user._id, {
        isActive: false,
        driverStatus: "offline",
        lastActiveAt: new Date()
      });

      console.log(`Driver ${socket.user._id} (${socket.user.email}) is now OFFLINE`.red);
      
      // Send acknowledgment
      const response = { 
        ok: true, 
        message: "Driver is now offline",
        status: "offline"
      };
      
      console.log('Sending acknowledgment:', response);
      console.log('Ack function type:', typeof ack);
      
      if (typeof ack === 'function') {
        ack(response);
        console.log('Acknowledgment sent successfully');
      } else {
        console.log('No acknowledgment function provided');
        // Send response via emit as fallback
        socket.emit('driver_offline_response', response);
      }

    } catch (error) {
      console.error('Error setting driver offline:', error);
      const err = { message: "Failed to set driver offline" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
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