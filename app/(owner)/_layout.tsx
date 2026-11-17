import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { OWNER_COLORS } from "../../styles/theme";

export default function OwnerLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: OWNER_COLORS.background },
        }}
      />
    </>
  );
}
