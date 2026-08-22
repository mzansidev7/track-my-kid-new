import AdminTabBar from "@/components/AdminTabBar";
import { Tabs } from "expo-router";

export default function AdminLayout() {
  return (
    <Tabs
      tabBar={(props) => <AdminTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="live" />
      <Tabs.Screen name="support" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
