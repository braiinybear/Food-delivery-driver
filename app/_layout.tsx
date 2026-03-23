import SplashScreenView from "@/components/SplashScreenView";
import { Colors } from "@/constants/colors";
// this is the better-auth authentication.
import { authClient } from "@/lib/auth-client";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";

// this is the expo splash screen.
import * as ExpoSplashScreen from "expo-splash-screen";

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

// Keep the native splash visible while we load
ExpoSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const [appReady, setAppReady] = useState<boolean>(false);
  const [splashDone, setSplashDone] = useState<boolean>(false);

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

  // Create a client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
        gcTime: 1000 * 60 * 15, // Unused data is garbage collected after 15 minutes
        retry: 2, // Retry failed requests twice before throwing an error
        refetchOnWindowFocus: false, // Turn off for less aggressive fetching
      },
    },
  });


  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        {/* Animated in-app splash on first load */}
        {!splashDone && (
          <SplashScreenView onFinish={() => setSplashDone(true)} />
        )}

        {/* Instant solid overlay during auth state transitions — no fade-in so no black flash */}
        {splashDone && isPending && (
          <View style={transitionStyles.overlay}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        <Stack>
          {/* Only accessible when not logged in */}
          <Stack.Protected guard={isLoggedOut}>
            <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
          </Stack.Protected>

          {/* Only accessible when logged in */}
          <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
                <Stack.Screen name="driverform" options={{headerShown:false}} />
          </Stack.Protected>
        </Stack>
      </View>
    </QueryClientProvider>
  );
}
const transitionStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
