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
import apiClient from "@/lib/axios";

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
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("Notification permission not granted");
          return;
        }

        const token = await registerForPushNotificationsAsync();

        if (!isMounted) return;

        if (token) {
          setExpoPushToken(token);
          try {
            if (!existingPushToken) {
              await registerPushToken({ token });
              console.log("Push token registered with backend");
            } else if (existingPushToken !== token) {
              await updatePushToken({ token });
              console.log("Push token updated with backend");
            }
          } catch (err) {
            console.log("Failed to sync push token:", err);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    const validateOfferStillAvailable = async (orderId: string) => {
      const { data: availableOrders } = await apiClient.get(
        "/delivery/available-orders",
      );
      const ordersList = Array.isArray(availableOrders)
        ? availableOrders
        : (availableOrders as { data?: Array<{ id?: string }> }).data || [];

      return ordersList.some((order) => order?.id === orderId);
    };

    setupNotifications();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received app is running:", notification);
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        const data = response.notification.request.content.data;
        const orderId = data?.orderId as string | undefined;
        const type = data?.type as string | undefined;
        const offerExpiresAtRaw = data?.offerExpiresAt;
        const offerExpiresAt =
          typeof offerExpiresAtRaw === "number"
            ? offerExpiresAtRaw
            : typeof offerExpiresAtRaw === "string"
              ? Number(offerExpiresAtRaw)
              : NaN;

        console.log("Rider tapped notification:", { type, orderId });

        if (type !== "ORDER_OFFER" || !orderId) {
          return;
        }

        if (Number.isFinite(offerExpiresAt) && offerExpiresAt <= Date.now()) {
          console.log("Ignoring expired order offer notification:", orderId);
          return;
        }

        try {
          const isStillAvailable = await validateOfferStillAvailable(orderId);

          if (!isStillAvailable) {
            console.log("Ignoring stale order offer notification:", orderId);
            return;
          }

          addOrderOffer({
            orderId,
            restaurantName: (data?.restaurantName as string) || undefined,
            distanceKm:
              typeof data?.distanceKm === "number"
                ? data.distanceKm
                : typeof data?.distanceKm === "string"
                  ? Number(data.distanceKm)
                  : undefined,
            earning:
              typeof data?.earning === "number"
                ? data.earning
                : typeof data?.earning === "string"
                  ? Number(data.earning)
                  : undefined,
            receivedAt: Date.now(),
          });

          setTimeout(() => {
            router.navigate("/(tabs)");
          }, 300);
        } catch (err) {
          console.log("Failed to validate push order offer:", err);
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
