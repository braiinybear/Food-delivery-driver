import { Stack } from "expo-router";

export default function DriverFormLayout() {
  return (
    <Stack screenOptions={{
            headerTitleAlign: "center",
            headerShown: false
        }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
