import { Stack, router } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

export default function NotificationsLayout() {
  const { Colors, isDark } = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Notifications",
          headerShown: true,
          headerStyle: {
            backgroundColor: isDark ? Colors.background : Colors.secondary,
          },
          headerShadowVisible: false,
          headerTintColor: "#FFF",
          headerTitleStyle: {
            fontSize: 18,
            fontFamily: "Nunito_700Bold",
            color: "#FFF",
          },
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                paddingLeft: 1,
                paddingRight: 12,
                height: 44,
                justifyContent: "center",
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="keyboard-backspace" size={28} color="#FFF" />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
