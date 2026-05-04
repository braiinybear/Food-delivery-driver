import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
// We'll require TaskManager safely in the try catch below to avoid native module crashes at load time
import { getSocket, initSocket } from '@/lib/socket-client';
import apiClient from '@/lib/axios';

const MIN_EMIT_INTERVAL_MS = 2000;
const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

try {
  const TaskManager = require('expo-task-manager');
  if (TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
     // Task already defined
  } else {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: { data: any, error: any }) => {
      if (error) {
        console.error('[Location] Background task error:', error);
        return;
      }
      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const loc = locations[0];
        if (loc) {
          const socket = getSocket();
          // Fallback to REST for background persistence
          try {
            await apiClient.post('/delivery/sync-location', {
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            });
          } catch (e) {
            // Background sync fail is common on OS suspension
          }
        }
      }
    });
  }
} catch (e) {
  console.warn('[Location] TaskManager native module not found. Background tracking will be disabled until you rebuild the app.');
}

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
      
      Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).then(started => {
        if (started) {
          Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
        }
      });
      
      setIsTracking(false);
    };

    const emitLocation = async (latitude: number, longitude: number) => {
      const socket = getSocket();
      const trackingOrderId = orderId ?? `availability:${driverProfileId}`;

      lastLocationUpdate.current = {
        lat: latitude,
        lng: longitude,
        time: Date.now(),
      };

      if (socket?.connected && driverProfileId) {
        socket.emit('driver_location_update', {
          orderId: trackingOrderId,
          driverProfileId,
          lat: latitude,
          lng: longitude,
        });
      } else if (driverProfileId) {
        // Fallback to REST API if socket is down or backgrounded
        try {
          await apiClient.post('/delivery/sync-location', {
            lat: latitude,
            lng: longitude,
            orderId: orderId ?? undefined,
          });
        } catch (e) {
          console.error('[Location] REST sync failed');
        }
      }
    };

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          stopTracking();
          return;
        }

        try {
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus === 'granted') {
             await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                accuracy: Location.Accuracy.High,
                distanceInterval: 15,
                deferredUpdatesInterval: 5000,
                foregroundService: {
                  notificationTitle: "Live Driver Tracking Active",
                  notificationBody: "Tracking your location for food deliveries.",
                },
             });
          }
        } catch {
          // Foreground updates will just have to do
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
