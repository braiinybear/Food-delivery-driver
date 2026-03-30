import { Subscription } from "expo-modules-core";
import * as Notifications from "expo-notifications";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotificationsAsync";

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
  const [expopushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const notificationListener = useRef<Subscription | null>(null);
  const responseListener = useRef<Subscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => setExpoPushToken(token ?? null))
      .catch((err) => setError(err));

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
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ pushToken: expopushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
