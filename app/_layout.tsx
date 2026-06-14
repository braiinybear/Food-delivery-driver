import { LightTheme, DarkTheme } from "@/constants/colors";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { StatusBar } from "expo-status-bar";
// this is the better-auth authentication.
import { authClient } from "@/lib/auth-client";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";

import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// this is the expo splash screen.
import * as ExpoSplashScreen from "expo-splash-screen";

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import SplashScreenView from "@/components/SplashScreenView";
import { useUser } from "@/hooks/useUser";
import * as Notifications from "expo-notifications";
import { NotificationProvider } from "@/context/NotificationContext";
import { initSocket } from "@/lib/socket-client";
import { useSocketStore } from "@/store/useSocketStore";
import { useSocketOrderOffers } from "@/hooks/useSocketOrders";
import GlobalCustomAlert from "@/components/GlobalCustomAlert";
import { queryClient } from "@/lib/query-client";

function SocketBootstrap() {
  useSocketOrderOffers();
  return null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
  }),
});

// Keep the native splash visible while we load
ExpoSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedRoot />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ThemedRoot() {
  const { Colors, isDark } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const { isLoading: isUserLoading } = useUser({ enabled: !!session });
  const existingPushToken =
    (session?.session as { pushToken?: string } | undefined)?.pushToken;
  console.log("Session in RootLayout:", existingPushToken);
  const [appReady, setAppReady] = useState<boolean>(false);
  const [splashDone, setSplashDone] = useState<boolean>(false);
  const { setConnected, setConnectionError } = useSocketStore();

  // this is the expo font loader.
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_900Black,
  });

  // Hide native splash and mark app ready once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      ExpoSplashScreen.hideAsync().then(() => setAppReady(true));
    }
  }, [fontsLoaded]);

  // Initialize socket connection
  useEffect(() => {
    const connectSocket = async () => {
      try {
        const socket = await initSocket();
        console.log(socket.id);

        setConnected(true);
        setConnectionError(null);
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : 'Connection failed'
        );
      }
    };

    if (session?.user) {
      connectSocket();
    }
  }, [session?.user, setConnected, setConnectionError]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await ExpoSplashScreen.hideAsync();
      setAppReady(true);
    }
  }, [fontsLoaded]);

  // Boolean helpers — make Stack.Protected guards readable
  const isLoggedIn = !isPending && !!session;
  const isLoggedOut = !isPending && !session;

  // Show nothing until fonts are ready
  if (!appReady) return null;

  const isReady = splashDone && !isPending && !(session && isUserLoading);

  return (
    <NotificationProvider isReady={isReady}>
      <SocketBootstrap />
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        {/* BLOCK UI while auth session restores, splash animation is running, or session is being verified */}
        {(!splashDone || isPending || (session && isUserLoading)) ? (
          <SplashScreenView onFinish={() => setSplashDone(true)} />
        ) : (
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: isDark ? Colors.background : Colors.secondary,
              },
              headerTintColor: Colors.white,
              headerTitleAlign: "center",
              headerTitleStyle: {
                color: Colors.white,
                fontFamily: 'Nunito_700Bold',
                fontSize: 18,
              },
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={{ paddingLeft: 1, paddingRight: 12, height: 44, justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="keyboard-backspace" size={28} color={Colors.white} />
                </TouchableOpacity>
              ),
              contentStyle: {
                backgroundColor: Colors.background,
              }
            }}
          >
            {/* Only accessible when not logged in */}
            <Stack.Protected guard={isLoggedOut}>
              <Stack.Screen
                name="(auth)/login"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="(auth)/register"
                options={{ headerShown: false }}
              />
            </Stack.Protected>

            {/* Only accessible when logged in */}
            <Stack.Protected guard={isLoggedIn}>
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="notifications"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="driverform"
                options={{ 
                    headerTitle: "Driver Form",
                }} 
              />
              <Stack.Screen
                name="riderprofile"
                options={{
                  headerTitle: "Profile",
                }}
              />
            </Stack.Protected>
          </Stack>
        )}
      </View>
      <GlobalCustomAlert />
    </NotificationProvider>
  );
}
const createTransitionStyles = (Colors: any) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
