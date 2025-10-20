import User from '../models/userModel.js';

class LocationService {
  constructor(io) {
    this.io = io;
    this.locationUpdateInterval = 5000; // 5 seconds
    this.activeUsers = new Map(); // Store active user sessions
  }

  // Start location tracking for a user
  startLocationTracking(socket, userId) {
    console.log(`Starting location tracking for user: ${userId}`);
    
    // Store user session
    this.activeUsers.set(userId, {
      socketId: socket.id,
      lastUpdate: Date.now(),
      isTracking: true
    });

    // Join user to their location room
    socket.join(`location_${userId}`);

    // Send confirmation
    socket.emit('location_tracking_started', {
      success: true,
      message: 'Location tracking started',
      updateInterval: this.locationUpdateInterval
    });
  }

  // Stop location tracking for a user
  stopLocationTracking(socket, userId) {
    console.log(`Stopping location tracking for user: ${userId}`);
    
    // Remove from active users
    this.activeUsers.delete(userId);
    
    // Leave location room
    socket.leave(`location_${userId}`);

    // Send confirmation
    socket.emit('location_tracking_stopped', {
      success: true,
      message: 'Location tracking stopped'
    });
  }

  // Update user location
  async updateUserLocation(socket, userId, locationData) {
    try {
      const { latitude, longitude, accuracy, timestamp } = locationData;

      // Validate coordinates
      if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        socket.emit('location_update_error', {
          success: false,
          message: 'Invalid coordinates provided'
        });
        return;
      }

      // Update user location in database
      await User.findByIdAndUpdate(userId, {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude] // MongoDB expects [lng, lat]
        },
        lastActiveAt: new Date()
      });

      // Update active users map
      if (this.activeUsers.has(userId)) {
        this.activeUsers.set(userId, {
          ...this.activeUsers.get(userId),
          lastUpdate: Date.now(),
          lastLocation: { latitude, longitude, accuracy }
        });
      }

      // Broadcast to user's location room
      socket.to(`location_${userId}`).emit('user_location_updated', {
        userId,
        location: {
          latitude,
          longitude,
          accuracy,
          timestamp: timestamp || Date.now()
        }
      });

      // Send confirmation to user
      socket.emit('location_update_success', {
        success: true,
        message: 'Location updated successfully',
        location: { latitude, longitude, accuracy }
      });

      console.log(`Location updated for user ${userId}: ${latitude}, ${longitude}`);

    } catch (error) {
      console.error('Error updating user location:', error);
      socket.emit('location_update_error', {
        success: false,
        message: 'Failed to update location',
        error: error.message
      });
    }
  }

  // Get user's current location
  async getUserLocation(userId) {
    try {
      const user = await User.findById(userId).select('currentLocation lastActiveAt');
      
      if (!user || !user.currentLocation) {
        return {
          success: false,
          message: 'User location not found'
        };
      }

      const [longitude, latitude] = user.currentLocation.coordinates;
      
      return {
        success: true,
        location: {
          latitude,
          longitude,
          lastUpdated: user.lastActiveAt
        }
      };
    } catch (error) {
      console.error('Error getting user location:', error);
      return {
        success: false,
        message: 'Failed to get user location',
        error: error.message
      };
    }
  }

  // Get nearby users (for drivers/customers)
  async getNearbyUsers(userId, radius = 5000, limit = 10) {
    try {
      const user = await User.findById(userId).select('currentLocation');
      
      if (!user || !user.currentLocation) {
        return {
          success: false,
          message: 'User location not found'
        };
      }

      const nearbyUsers = await User.find({
        _id: { $ne: userId }, // Exclude current user
        currentLocation: {
          $near: {
            $geometry: user.currentLocation,
            $maxDistance: radius // in meters
          }
        },
        role: { $in: ['driver', 'customer'] },
        isActive: true
      })
      .limit(limit)
      .select('_id firstName lastName currentLocation driverStatus role phoneNumber');

      const formattedUsers = nearbyUsers.map(user => {
        const [longitude, latitude] = user.currentLocation.coordinates;
        return {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          location: { latitude, longitude },
          driverStatus: user.driverStatus,
          role: user.role,
          phoneNumber: user.phoneNumber
        };
      });

      return {
        success: true,
        nearbyUsers: formattedUsers,
        count: formattedUsers.length
      };

    } catch (error) {
      console.error('Error getting nearby users:', error);
      return {
        success: false,
        message: 'Failed to get nearby users',
        error: error.message
      };
    }
  }

  // Handle socket disconnection
  handleDisconnection(socket) {
    // Find and remove user from active tracking
    for (const [userId, userData] of this.activeUsers.entries()) {
      if (userData.socketId === socket.id) {
        this.activeUsers.delete(userId);
        console.log(`User ${userId} disconnected from location tracking`);
        break;
      }
    }
  }

  // Get active tracking statistics
  getTrackingStats() {
    return {
      activeUsers: this.activeUsers.size,
      updateInterval: this.locationUpdateInterval,
      activeUserIds: Array.from(this.activeUsers.keys())
    };
  }
}

export default LocationService;
