import LocationService from './locationService.js';

// Initialize location service
let locationService = null;

export const initializeLocationService = (io) => {
  locationService = new LocationService(io);
  return locationService;
};

// Handle location-related socket events
export const handleLocationEvents = (socket, io) => {
  console.log(`Location events handler connected for socket: ${socket.id}`);

  // Start location tracking
  socket.on('start_location_tracking', async (data, ack) => {
    try {
      const userId = socket.user?._id;
      
      if (!userId) {
        const error = { success: false, message: 'User not authenticated' };
        socket.emit('location_error', error);
        if (typeof ack === 'function') ack(error);
        return;
      }

      locationService.startLocationTracking(socket, userId);
      
      const response = { 
        success: true, 
        message: 'Location tracking started',
        userId: userId.toString()
      };
      
      if (typeof ack === 'function') ack(response);
      
    } catch (error) {
      console.error('Error starting location tracking:', error);
      const errorResponse = { success: false, message: 'Failed to start location tracking' };
      socket.emit('location_error', errorResponse);
      if (typeof ack === 'function') ack(errorResponse);
    }
  });

  // Stop location tracking
  socket.on('stop_location_tracking', async (data, ack) => {
    try {
      const userId = socket.user?._id;
      
      if (!userId) {
        const error = { success: false, message: 'User not authenticated' };
        socket.emit('location_error', error);
        if (typeof ack === 'function') ack(error);
        return;
      }

      locationService.stopLocationTracking(socket, userId);
      
      const response = { 
        success: true, 
        message: 'Location tracking stopped',
        userId: userId.toString()
      };
      
      if (typeof ack === 'function') ack(response);
      
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      const errorResponse = { success: false, message: 'Failed to stop location tracking' };
      socket.emit('location_error', errorResponse);
      if (typeof ack === 'function') ack(errorResponse);
    }
  });

  // Update user location
  socket.on('update_location', async (locationData, ack) => {
    try {
      const userId = socket.user?._id;
      
      if (!userId) {
        const error = { success: false, message: 'User not authenticated' };
        socket.emit('location_error', error);
        if (typeof ack === 'function') ack(error);
        return;
      }

      // Validate location data
      if (!locationData || typeof locationData.latitude !== 'number' || typeof locationData.longitude !== 'number') {
        const error = { success: false, message: 'Invalid location data provided' };
        socket.emit('location_error', error);
        if (typeof ack === 'function') ack(error);
        return;
      }

      await locationService.updateUserLocation(socket, userId, locationData);
      
      const response = { 
        success: true, 
        message: 'Location updated successfully',
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy
        }
      };
      
      if (typeof ack === 'function') ack(response);
      
    } catch (error) {
      console.error('Error updating location:', error);
      const errorResponse = { success: false, message: 'Failed to update location' };
      socket.emit('location_error', errorResponse);
      if (typeof ack === 'function') ack(errorResponse);
    }
  });

  // Get nearby users
  socket.on('get_nearby_users', async (data, ack) => {
    try {
      const userId = socket.user?._id;
      
      if (!userId) {
        const error = { success: false, message: 'User not authenticated' };
        socket.emit('location_error', error);
        if (typeof ack === 'function') ack(error);
        return;
      }

      const radius = data?.radius || 5000; // Default 5km
      const limit = data?.limit || 10;
      
      const result = await locationService.getNearbyUsers(userId, radius, limit);
      
      if (typeof ack === 'function') ack(result);
      
    } catch (error) {
      console.error('Error getting nearby users:', error);
      const errorResponse = { success: false, message: 'Failed to get nearby users' };
      socket.emit('location_error', errorResponse);
      if (typeof ack === 'function') ack(errorResponse);
    }
  });

  // Get user's current location
  socket.on('get_my_location', async (data, ack) => {
    try {
      const userId = socket.user?._id;
      
      if (!userId) {
        const error = { success: false, message: 'User not authenticated' };
        socket.emit('location_error', error);
        if (typeof ack === 'function') ack(error);
        return;
      }

      const result = await locationService.getUserLocation(userId);
      
      if (typeof ack === 'function') ack(result);
      
    } catch (error) {
      console.error('Error getting user location:', error);
      const errorResponse = { success: false, message: 'Failed to get user location' };
      socket.emit('location_error', errorResponse);
      if (typeof ack === 'function') ack(errorResponse);
    }
  });

  // Handle socket disconnection
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (locationService) {
      locationService.handleDisconnection(socket);
    }
  });
};

// Get location service instance
export const getLocationService = () => locationService;
