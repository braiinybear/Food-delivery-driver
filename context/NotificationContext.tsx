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
            if (!session?.session?.pushToken) {
              await registerPushToken({ token });
              console.log("✅ Push token registered with backend");
            }
            // Token changed on subsequent opens - update token
            else if (session?.session?.pushToken !== token) {
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
        console.log(
          JSON.stringify(response.notification.request.content.data, null, 2),
        );
        console.log(
          "Notification response received user interacts with notifications:",
          JSON.stringify(response, null, 2),
          response,
        );
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
  }, [registerPushToken, session, updatePushToken]);

  return (
    <NotificationContext.Provider
      value={{ pushToken: expopushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
