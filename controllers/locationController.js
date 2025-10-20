import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

// Update user location via REST API
const updateLocation = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { latitude, longitude, accuracy } = req.body;

    // Validate coordinates
    if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // Update user location
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude] // MongoDB expects [lng, lat]
        },
        lastActiveAt: new Date()
      },
      { new: true }
    ).select('currentLocation lastActiveAt');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [longitude, latitude] = updatedUser.currentLocation.coordinates;

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: {
          latitude,
          longitude,
          accuracy: accuracy || null,
          lastUpdated: updatedUser.lastActiveAt
        }
      }
    });

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
});

// Get user's current location
const getMyLocation = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('currentLocation lastActiveAt');

    if (!user || !user.currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'User location not found'
      });
    }

    const [longitude, latitude] = user.currentLocation.coordinates;

    res.status(200).json({
      success: true,
      data: {
        location: {
          latitude,
          longitude,
          lastUpdated: user.lastActiveAt
        }
      }
    });

  } catch (error) {
    console.error('Error getting user location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user location',
      error: error.message
    });
  }
});

// Get nearby users
const getNearbyUsers = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const radius = parseInt(req.query.radius) || 5000; // Default 5km in meters
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role; // Optional: filter by role (driver/customer)

    // Get current user's location
    const user = await User.findById(userId).select('currentLocation');

    if (!user || !user.currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'User location not found'
      });
    }

    // Build query
    const query = {
      _id: { $ne: userId }, // Exclude current user
      currentLocation: {
        $near: {
          $geometry: user.currentLocation,
          $maxDistance: radius // in meters
        }
      },
      isActive: true
    };

    // Add role filter if specified
    if (role && ['driver', 'customer'].includes(role)) {
      query.role = role;
    }

    // Find nearby users
    const nearbyUsers = await User.find(query)
      .limit(limit)
      .select('_id firstName lastName currentLocation driverStatus role phoneNumber rating totalRides');

    // Format response
    const formattedUsers = nearbyUsers.map(user => {
      const [longitude, latitude] = user.currentLocation.coordinates;
      return {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        location: { latitude, longitude },
        driverStatus: user.driverStatus,
        role: user.role,
        phoneNumber: user.phoneNumber,
        rating: user.rating || 0,
        totalRides: user.totalRides || 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        nearbyUsers: formattedUsers,
        count: formattedUsers.length,
        radius: radius,
        limit: limit
      }
    });

  } catch (error) {
    console.error('Error getting nearby users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get nearby users',
      error: error.message
    });
  }
});

// Get location history (if you want to implement this)
const getLocationHistory = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;

    // This would require a separate LocationHistory model
    // For now, return current location
    const user = await User.findById(userId).select('currentLocation lastActiveAt');

    if (!user || !user.currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'User location not found'
      });
    }

    const [longitude, latitude] = user.currentLocation.coordinates;

    res.status(200).json({
      success: true,
      data: {
        locationHistory: [{
          latitude,
          longitude,
          timestamp: user.lastActiveAt
        }],
        count: 1,
        message: 'Location history not implemented yet. Showing current location.'
      }
    });

  } catch (error) {
    console.error('Error getting location history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location history',
      error: error.message
    });
  }
});

// Bulk location update (for multiple users)
const bulkUpdateLocation = asyncHandler(async (req, res) => {
  try {
    const { locations } = req.body; // Array of {userId, latitude, longitude, accuracy}

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Locations array is required'
      });
    }

    const updatePromises = locations.map(async (locationData) => {
      const { userId, latitude, longitude, accuracy } = locationData;

      // Validate coordinates
      if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error(`Invalid coordinates for user ${userId}`);
      }

      return User.findByIdAndUpdate(
        userId,
        {
          currentLocation: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          lastActiveAt: new Date()
        },
        { new: true }
      ).select('_id currentLocation lastActiveAt');
    });

    const results = await Promise.allSettled(updatePromises);
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    res.status(200).json({
      success: true,
      message: `Bulk location update completed`,
      data: {
        total: locations.length,
        successful,
        failed,
        results: results.map((result, index) => ({
          userId: locations[index].userId,
          success: result.status === 'fulfilled',
          error: result.status === 'rejected' ? result.reason.message : null
        }))
      }
    });

  } catch (error) {
    console.error('Error in bulk location update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update locations',
      error: error.message
    });
  }
});

export {
  updateLocation,
  getMyLocation,
  getNearbyUsers,
  getLocationHistory,
  bulkUpdateLocation
};
