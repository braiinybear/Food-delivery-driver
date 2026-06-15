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
import { useQueryClient } from "@tanstack/react-query";

interface NotificationContextType {
  pushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
  handleNotificationNavigation?: (data: any) => void;
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

export const NotificationProvider: React.FC<NotificationProviderProps & { isReady?: boolean }> = ({
  children,
  isReady = true,
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
  const queryClient = useQueryClient();

  const isAuthenticated = !!session;

  // Keep track of readiness and auth status via refs
  const isReadyRef = useRef(isReady);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const pendingNavigationRef = useRef<any>(null);
  const lastProcessedRef = useRef<{ id?: string; screen?: string; time: number } | null>(null);

  // Update ref whenever authentication state changes
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
    if (isAuthenticated && pendingNavigationRef.current && isReadyRef.current) {
      const pendingData = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      console.log("📲 Rider authenticated, routing pending notification:");
      setTimeout(() => {
        handleNotificationNavigation(pendingData);
      }, 800);
    }
  }, [isAuthenticated]);

  // Update ref and handle pending routes when readiness changes
  useEffect(() => {
    isReadyRef.current = isReady;
    if (isReady) {
      // Check for startup notification if we haven't checked yet
      try {
        const response = Notifications.getLastNotificationResponse();
        if (response) {
          const data = response.notification.request.content.data;
          console.log("📲 Startup notification found:", data);
          pendingNavigationRef.current = data;
        }
      } catch (e) {
        console.log("Error checking last notification response on ready:", e);
      }

      if (pendingNavigationRef.current) {
        const pendingData = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        console.log("📲 Executing startup/deferred notification navigation:");
        setTimeout(() => {
          handleNotificationNavigation(pendingData);
        }, 800);
      }
    }
  }, [isReady]);


  // Centralized notification router helper
  const handleNotificationNavigation = async (data: any) => {
    if (!data) return;

    if (!isReadyRef.current) {
      console.log("📲 Navigation requested before app was ready. Deferring:", data);
      pendingNavigationRef.current = data;
      return;
    }

    const id = (data.id || data.orderId) as string | undefined;
    const screen = (data.screen || data.type) as string | undefined;
    const type = data.type as string | undefined;

    console.log("📲 Routing rider notification:", { screen, id, type, data });

    // Prevent duplicate triggers within 2 seconds
    const now = Date.now();
    if (
      lastProcessedRef.current &&
      lastProcessedRef.current.id === id &&
      lastProcessedRef.current.screen === screen &&
      now - lastProcessedRef.current.time < 2000
    ) {
      console.log("📲 Ignoring duplicate notification tap");
      return;
    }
    lastProcessedRef.current = { id, screen, time: now };

    if (!isAuthenticatedRef.current) {
      console.log("📲 Rider is not authenticated. Redirecting to Login and deferring route.");
      pendingNavigationRef.current = data;
      router.replace("/(auth)/login");
      return;
    }

    // ── Application status updates ──────────────────────────────────────
    if (
      type === "PARTNER_REQUEST_APPROVED" ||
      type === "PARTNER_REQUEST_REJECTED" ||
      screen === "PartnerStatus"
    ) {
      queryClient.invalidateQueries({
        queryKey: ["delivery-partner-status"],
      });
      setTimeout(() => {
        router.navigate("/(tabs)");
      }, 300);
      return;
    }

    // ── ORDER_OFFER (New delivery request) ──────────────────────────────
    if (
      screen === "DeliveryRequest" ||
      screen === "new_delivery_request" ||
      type === "ORDER_OFFER"
    ) {
      if (id) {
        const offerExpiresAtRaw = data.offerExpiresAt;
        const offerExpiresAt =
          typeof offerExpiresAtRaw === "number"
            ? offerExpiresAtRaw
            : typeof offerExpiresAtRaw === "string"
              ? Number(offerExpiresAtRaw)
              : NaN;

        if (Number.isFinite(offerExpiresAt) && offerExpiresAt <= Date.now()) {
          console.log("📲 Ignoring expired order offer notification:", id);
          return;
        }

        // Calculate dynamic countdown timer based on expiry time, default to 45
        let calculatedExpiresIn = 45;
        if (Number.isFinite(offerExpiresAt)) {
          calculatedExpiresIn = Math.max(1, Math.round((offerExpiresAt - Date.now()) / 1000));
        }

        addOrderOffer({
          orderId: id,
          restaurantName: (data.restaurantName as string) || undefined,
          distanceKm:
            typeof data.distanceKm === "number"
              ? data.distanceKm
              : typeof data.distanceKm === "string"
                ? Number(data.distanceKm)
                : undefined,
          earning:
            typeof data.earning === "number"
              ? data.earning
              : typeof data.earning === "string"
                ? Number(data.earning)
                : undefined,
          expiresInSeconds: calculatedExpiresIn,
          receivedAt: Date.now(),
        });
      }
      setTimeout(() => {
        router.navigate("/(tabs)");
      }, 50);
      return;
    }

    // ── Order Assigned or Chat messages ─────────────────────────────────
    if (
      screen === "OrderDetails" ||
      screen === "order_assigned" ||
      screen === "Chat" ||
      screen === "customer_message" ||
      type === "ORDER_ASSIGNED" ||
      type === "customer_message"
    ) {
      setTimeout(() => {
        router.navigate("/(tabs)");
      }, 300);
      return;
    }

    // ── Earnings screen ─────────────────────────────────────────────────
    if (screen === "Earnings" || screen === "earnings" || type === "earnings") {
      setTimeout(() => {
        router.navigate("/(tabs)/stats");
      }, 300);
      return;
    }

    // Missing or invalid payload -> go to Home screen
    router.navigate("/(tabs)");
  };

  // Standalone mount effect to listen for notification events early, handling terminated state
  useEffect(() => {
    // Listen for foreground notifications
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📲 Notification received in foreground:", notification);
        setNotification(notification);
      });

    // Listen for notification taps when the app is backgrounded/foregrounded
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("📲 Rider tapped notification:", data);
        handleNotificationNavigation(data);
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Separate effect to handle push token setup & registration sync
  useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated) return;

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
            console.log("Failed to sync push token to backend:", err);
          }
        } else {
          console.log("No push token obtained (Expo service might be down). Falling back to WebSockets only.");
        }
      } catch (err) {
        console.error("Critical error in setupNotifications:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    setupNotifications();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, existingPushToken, registerPushToken, updatePushToken]);

  return (
    <NotificationContext.Provider
      value={{
        pushToken: expopushToken,
        notification,
        error,
        handleNotificationNavigation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
