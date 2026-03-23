import * as NavigationBar from "expo-navigation-bar";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
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
          title: "HOME",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size - 2} />
          ),
        }}
      />
    </Tabs>
  );
}
