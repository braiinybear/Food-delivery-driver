import * as NavigationBar from "expo-navigation-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

import { useAcceptDelivery, useDeclineDelivery } from "../../hooks/useDriverDeliveries";
import { useSocketStore } from "../../store/useSocketStore";

export default function TabsLayout() {
  const { Colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { mutate: acceptDelivery } = useAcceptDelivery();
  const { mutate: declineDelivery } = useDeclineDelivery();
  const orderOffers = useSocketStore((state) => state.orderOffers);
  const removeOrderOffer = useSocketStore((state) => state.removeOrderOffer);
  const setAcceptedOrder = useSocketStore((state) => state.setAcceptedOrder);
  const [pendingOfferAction, setPendingOfferAction] = useState<{
    orderId: string;
    type: "accept" | "decline";
  } | null>(null);

  const activeOffer = orderOffers.length > 0 ? orderOffers[0] : null;

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }
    void NavigationBar.setPositionAsync("relative");
    void NavigationBar.setBackgroundColorAsync(Colors.background);
    void NavigationBar.setBorderColorAsync(Colors.border);
    void NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
  }, [isDark, Colors]);
  const BackButton = () => (
    <TouchableOpacity
      onPress={() => {
        router.back();
      }}
      activeOpacity={0.7}
      style={{
        paddingLeft: 8,
        paddingRight: 12,
        height: 44,
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name="keyboard-backspace" size={28} color={Colors.white} />
    </TouchableOpacity>
  );

  const handleAcceptOffer = (orderId: string) => {
    setPendingOfferAction({ orderId, type: "accept" });
    acceptDelivery(orderId, {
      onSuccess: () => {
        setAcceptedOrder(orderId);
        removeOrderOffer(orderId);
        setPendingOfferAction(null);
      },
      onError: () => {
        setPendingOfferAction(null);
      },
    });
  };

  const handleDeclineOffer = (orderId: string) => {
    setPendingOfferAction({ orderId, type: "decline" });
    declineDelivery(orderId, {
      onSuccess: () => {
        removeOrderOffer(orderId);
        setPendingOfferAction(null);
      },
      onError: () => {
        setPendingOfferAction(null);
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: isDark ? Colors.background : Colors.secondary,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? Colors.border : Colors.text + "08",
          },
          headerTintColor: Colors.white,
          headerTitleStyle: {
            fontSize: 18,
            fontFamily: 'Nunito_700Bold',
            color: Colors.white,
          },
          headerTitleAlign: "center",
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
          tabBarStyle: {
            backgroundColor: Colors.background,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            height: 64 + insets.bottom,
            paddingBottom: 10 + insets.bottom,
            paddingTop: 6,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            headerShown: true,
            headerLeft: () => <BackButton />,
            tabBarBadge: orderOffers.length > 0 ? orderOffers.length : undefined,
            tabBarBadgeStyle: {
              backgroundColor: Colors.secondary,
              color: Colors.white,
              fontSize: 10,
              top: -2,
            },
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt" color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="riderprofile"
          options={{
            title: "Profile",
            headerShown: true,
            headerLeft: () => <BackButton />,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "Stats",
            headerShown: true,
            headerLeft: () => <BackButton />,
            tabBarBadgeStyle: {
              backgroundColor: Colors.secondary,
              color: Colors.white,
              fontSize: 10,
              top: -2,
            },
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" color={color} size={size - 2} />
            ),
          }}
        />

        <Tabs.Screen
          name="wallet"
          options={{
            title: "Wallet",
            headerShown: true,
            headerLeft: () => <BackButton />,
            tabBarBadgeStyle: {
              backgroundColor: Colors.secondary,
              color: Colors.white,
              fontSize: 10,
              top: -2,
            },
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet" color={color} size={size - 2} />
            ),
          }}
        />
      </Tabs>


    </View>
  );
}
