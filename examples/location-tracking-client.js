// Client-side JavaScript for continuous location tracking
// This example shows how to implement continuous location updates

class LocationTracker {
  constructor(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    this.isTracking = false;
    this.updateInterval = null;
    this.locationUpdateInterval = 5000; // 5 seconds
    this.watchId = null; // For geolocation watch
  }

  // Start continuous location tracking
  startTracking() {
    if (this.isTracking) {
      console.log('Location tracking already active');
      return;
    }

    console.log('Starting location tracking...');
    this.isTracking = true;

    // Start Socket.IO location tracking
    this.socket.emit('start_location_tracking', {}, (response) => {
      if (response.success) {
        console.log('Socket.IO location tracking started');
      } else {
        console.error('Failed to start Socket.IO tracking:', response.message);
      }
    });

    // Start browser geolocation tracking
    this.startGeolocationTracking();
  }

  // Stop continuous location tracking
  stopTracking() {
    if (!this.isTracking) {
      console.log('Location tracking not active');
      return;
    }

    console.log('Stopping location tracking...');
    this.isTracking = false;

    // Stop Socket.IO location tracking
    this.socket.emit('stop_location_tracking', {}, (response) => {
      if (response.success) {
        console.log('Socket.IO location tracking stopped');
      } else {
        console.error('Failed to stop Socket.IO tracking:', response.message);
      }
    });

    // Stop browser geolocation tracking
    this.stopGeolocationTracking();
  }

  // Start browser geolocation tracking
  startGeolocationTracking() {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0 // Don't use cached location
    };

    // Watch position for continuous updates
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );

    console.log('Browser geolocation tracking started');
  }

  // Stop browser geolocation tracking
  stopGeolocationTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('Browser geolocation tracking stopped');
    }
  }

  // Handle location update from browser
  handleLocationUpdate(position) {
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };

    console.log('Location updated:', locationData);

    // Send to server via Socket.IO
    this.socket.emit('update_location', locationData, (response) => {
      if (response.success) {
        console.log('Location sent to server successfully');
      } else {
        console.error('Failed to send location to server:', response.message);
      }
    });

    // Trigger custom event for app to handle
    this.onLocationUpdate(locationData);
  }

  // Handle location error
  handleLocationError(error) {
    let message = 'Unknown geolocation error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        break;
    }

    console.error('Geolocation error:', message);
    this.onLocationError(error);
  }

  // Get current location (one-time)
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(location);
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // Accept cached location up to 1 minute old
        }
      );
    });
  }

  // Get nearby users
  getNearbyUsers(radius = 5000, limit = 10) {
    return new Promise((resolve, reject) => {
      this.socket.emit('get_nearby_users', { radius, limit }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  // Get my current location from server
  getMyLocationFromServer() {
    return new Promise((resolve, reject) => {
      this.socket.emit('get_my_location', {}, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  // Custom event handlers (override these in your app)
  onLocationUpdate(locationData) {
    // Override this method to handle location updates
    console.log('Location update received:', locationData);
  }

  onLocationError(error) {
    // Override this method to handle location errors
    console.error('Location error:', error);
  }

  // Update tracking interval
  setUpdateInterval(interval) {
    this.locationUpdateInterval = interval;
    console.log(`Location update interval set to ${interval}ms`);
  }

  // Get tracking status
  getStatus() {
    return {
      isTracking: this.isTracking,
      updateInterval: this.locationUpdateInterval,
      hasGeolocation: !!navigator.geolocation
    };
  }
}

// Usage example:
/*
// Initialize Socket.IO connection
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Initialize location tracker
const locationTracker = new LocationTracker(socket, 'user-id');

// Override event handlers
locationTracker.onLocationUpdate = (locationData) => {
  // Update your app's UI with new location
  console.log('New location:', locationData);
  // Example: update map marker, show nearby drivers, etc.
};

locationTracker.onLocationError = (error) => {
  // Handle location errors
  console.error('Location error:', error);
  // Example: show error message to user, request permission, etc.
};

// Start tracking when user wants to
document.getElementById('start-tracking').addEventListener('click', () => {
  locationTracker.startTracking();
});

// Stop tracking when user wants to
document.getElementById('stop-tracking').addEventListener('click', () => {
  locationTracker.stopTracking();
});

// Get nearby users
document.getElementById('find-nearby').addEventListener('click', async () => {
  try {
    const nearbyUsers = await locationTracker.getNearbyUsers(5000, 10);
    console.log('Nearby users:', nearbyUsers);
  } catch (error) {
    console.error('Error getting nearby users:', error);
  }
});
*/

export default LocationTracker;
