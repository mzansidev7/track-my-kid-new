import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CLIENT_COLORS } from "../../styles/theme";

export default function ClientLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: CLIENT_COLORS.background },
        }}
      />
    </>
  );
}
