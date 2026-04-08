import { registerForPushNotificationsAsync } from "../utils/registerForPushNotificationsAsync";
import * as Notifications from "expo-notifications";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authClient } from "@/lib/auth-client";
import { useRegisterPushToken, useUpdatePushToken } from "@/hooks/useExpoPushNotication";
import { useSocketStore } from "@/store/useSocketStore";
import { router } from "expo-router";

interface NotificationContextType {
  pushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { data: session } = authClient.useSession();
  const existingPushToken =
    (session?.session as { pushToken?: string } | undefined)?.pushToken;
  const [expopushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const { mutateAsync: registerPushToken } = useRegisterPushToken();
  const { mutateAsync: updatePushToken } = useUpdatePushToken();
  const addOrderOffer = useSocketStore((state) => state.addOrderOffer);

  useEffect(() => {
    let isMounted = true;

    const setupNotifications = async () => {
      try {
        // Check and request notification permissions if not granted
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("⚠️ Notification permission not granted");
          return;
        }

        const token = await registerForPushNotificationsAsync();
        
        if (!isMounted) return;

        if (token) {
          setExpoPushToken(token);
          try {
            // First time opening app - register token
            if (!existingPushToken) {
              await registerPushToken({ token });
              console.log("✅ Push token registered with backend");
            }
            // Token changed on subsequent opens - update token
            else if (existingPushToken !== token) {
              await updatePushToken({ token });
              console.log("✅ Push token updated with backend");
            }
          } catch (err) {
            console.log("❌ Failed to sync push token:", err);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    setupNotifications();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received app is running:", notification);
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const orderId = data?.orderId as string | undefined;

        console.log("📲 Rider tapped notification, orderId:", orderId);

        if (orderId) {
          // Add the order to the offer queue so the modal pops up on the home screen
          addOrderOffer({
            orderId,
            restaurantName: (data?.restaurantName as string) || undefined,
            distanceKm: (data?.distanceKm as number) || undefined,
            earning: (data?.earning as number) || undefined,
            receivedAt: Date.now(),
          });

          // Navigate to the home tab (where the offer modal + active delivery lives)
          setTimeout(() => {
            router.navigate("/(tabs)");
          }, 300);
        }
      });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [existingPushToken, registerPushToken, session, updatePushToken, addOrderOffer]);

  return (
    <NotificationContext.Provider
      value={{ pushToken: expopushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
