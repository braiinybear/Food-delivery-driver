import * as NavigationBar from "expo-navigation-bar";
import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }
    void NavigationBar.setPositionAsync("relative");
    void NavigationBar.setBackgroundColorAsync("#E5E7EB");
    void NavigationBar.setBorderColorAsync("#D1D5DB");
    void NavigationBar.setButtonStyleAsync("dark");
  }, []);
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
      <Ionicons name="arrow-back" size={28} color={Colors.white} />
    </TouchableOpacity>
  );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
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
          headerStyle: {
            backgroundColor: Colors.primary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.text + "08",
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "700",
            color: Colors.white,
          },
          headerTitleAlign: "left",
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
        name="earnings"
        options={{
          title: "Earnings",
          headerShown: true,
          headerLeft: () => <BackButton />,
          headerStyle: {
            backgroundColor: Colors.primary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.text + "08",
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "700",
            color: Colors.white,
          },
          headerTitleAlign: "left",
          tabBarBadgeStyle: {
            backgroundColor: Colors.secondary,
            color: Colors.white,
            fontSize: 10,
            top: -2,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
       name="stats"
        options={{
          title: "Stats",
          headerShown: true,
          headerLeft: () => <BackButton />,
          headerStyle: {
            backgroundColor: Colors.primary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.text + "08",
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "700",
            color: Colors.white,
          },
          headerTitleAlign: "left",
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
    </Tabs>
  );
}
