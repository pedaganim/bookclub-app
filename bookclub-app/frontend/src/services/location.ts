import { LocationData } from '../types';

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

interface GeolocationError {
  code: number;
  message: string;
}

export class LocationService {
  static async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error: GeolocationError) => {
          let message: string;
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              message = 'Location access denied by user';
              break;
            case 2: // POSITION_UNAVAILABLE
              message = 'Location information is unavailable';
              break;
            case 3: // TIMEOUT
              message = 'Location request timed out';
              break;
            default:
              message = 'An unknown error occurred while getting location';
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  }

  static async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    // In a real application, you would use a reverse geocoding service like Google Maps API
    // For now, return a simple format
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  }
}