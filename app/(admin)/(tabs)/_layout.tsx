import AdminTabBar from "@/components/AdminTabBar";
import { Tabs } from "expo-router";

export default function AdminLayout() {
  return (
    <Tabs
      tabBar={() => <AdminTabBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="live" />
      <Tabs.Screen name="support" />
      <Tabs.Screen name="more" />
      <Tabs.Screen name="commissions" options={{ href: null }} />
      <Tabs.Screen name="tools/[tool]" options={{ href: null }} />
    </Tabs>
  );
}
