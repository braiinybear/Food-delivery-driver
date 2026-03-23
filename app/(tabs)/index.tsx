import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePartnerStore } from "@/store/userider";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { FontSize, Fonts } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { AppUser } from "@/types/user";
import { RiderWelcomeScreen } from "@/components/RiderWelcomeScreen";
import ApplicationStatusScreen from "@/components/ApplicationStatusScreen";
import { Tabs } from "expo-router";

export default function HomeScreen() {
  const { appliedForRider, _hasHydrated } = usePartnerStore();
  const { data: session } = authClient.useSession();
  const user = session?.user as AppUser | undefined;

  if (!_hasHydrated) return null;

  if (session && user?.role !== "DELIVERY_PARTNER" && !appliedForRider) {
    return (
      <>
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
    
        <RiderWelcomeScreen />
      </>
    );
  } else if (appliedForRider) {

    return <>
      <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
      <ApplicationStatusScreen/>
    </>

  }

  return (
    <>
    <Text>
      hiiii
    </Text>
    </>
  );
}



