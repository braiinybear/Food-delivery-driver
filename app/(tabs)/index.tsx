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
import { router, Tabs } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
   const insets = useSafeAreaInsets();
  const { appliedForRider, _hasHydrated } = usePartnerStore();
  const { data: session } = authClient.useSession();
  const user = session?.user as AppUser | undefined;

  if (!_hasHydrated) return null;

  if (session && user?.role !== "DELIVERY_PARTNER" && !appliedForRider) {
    return (
      <>
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <SafeAreaView style={{ flex: 1, paddingTop: insets.top }}>
          <RiderWelcomeScreen />
        </SafeAreaView>
      </>
    );
  } else if (appliedForRider) {

    return (
      <>
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <SafeAreaView style={{ flex: 1, paddingTop: insets.top }}>
          <ApplicationStatusScreen />
        </SafeAreaView>
      </>
    );

  }

  return (
    <>
      <Tabs.Screen
        options={{
          tabBarStyle: {
            backgroundColor: Colors.primary,
            borderTopWidth: 0,
            height: 64 + insets.bottom,
            paddingBottom: 10 + insets.bottom,
            paddingTop: 6,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          },
          tabBarActiveTintColor: Colors.white,
          tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.5,
          },
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Ionicons name="car" size={22} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.driverName}>
              {user?.name || "Driver"}
            </Text>
            <Text style={styles.headerSubtitle}>DRIVER DASHBOARD</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={Colors.text}
            />
            <View style={styles.notiBadge} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push("/riderprofile")}
          >
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={Colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dashboard content goes here */}
      </ScrollView>
      
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: Colors.primary,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary + "55",
  },
  driverName: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontFamily: Fonts.brand,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notiBadge: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});

