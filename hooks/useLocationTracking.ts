import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { getSocket, initSocket } from '@/lib/socket-client';

const MIN_EMIT_INTERVAL_MS = 2000;

export const useLocationTracking = (
  enabled: boolean,
  orderId: string | null,
  driverProfileId: string | null,
) => {
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastLocationUpdate = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const stopTracking = () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      setIsTracking(false);
    };

    const emitLocation = (latitude: number, longitude: number) => {
      const socket = getSocket();
      if (!socket?.connected || !driverProfileId) {
        return;
      }

      const trackingOrderId = orderId ?? `availability:${driverProfileId}`;

      socket.emit('driver_location_update', {
        orderId: trackingOrderId,
        driverProfileId,
        lat: latitude,
        lng: longitude,
      });

      lastLocationUpdate.current = {
        lat: latitude,
        lng: longitude,
        time: Date.now(),
      };
    };

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          stopTracking();
          return;
        }

        try {
          await Location.requestBackgroundPermissionsAsync();
        } catch {
          // Foreground updates are enough for the active-delivery flow.
        }

        const existingSocket = getSocket();
        if (!existingSocket?.connected) {
          try {
            await initSocket();
          } catch {
            // Tracking can still start; the next reconnect will resume emits.
          }
        }

        try {
          const initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          if (isMounted) {
            emitLocation(initialLocation.coords.latitude, initialLocation.coords.longitude);
          }
        } catch {
          // The watcher below is still the main source of updates.
        }

        if (!isMounted) {
          return;
        }

        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 15,
          },
          (location) => {
            if (!isMounted) {
              return;
            }

            const now = Date.now();
            const lastUpdate = lastLocationUpdate.current;
            if (lastUpdate && now - lastUpdate.time < MIN_EMIT_INTERVAL_MS) {
              return;
            }

            emitLocation(location.coords.latitude, location.coords.longitude);
          },
        );

        setIsTracking(true);
      } catch (error) {
        console.log('[Location] Tracking error:', error);
        stopTracking();
      }
    };

    if (enabled && driverProfileId) {
      startLocationTracking();
    } else {
      stopTracking();
    }

    return () => {
      isMounted = false;
      stopTracking();
    };
  }, [driverProfileId, enabled, orderId]);

  return { isTracking };
};
