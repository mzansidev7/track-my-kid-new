import { Tabs } from "expo-router";
import OwnerTabBar from "../../../components/OwnerTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <OwnerTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="drivers" />
      <Tabs.Screen name="vehicles" />
      <Tabs.Screen name="routes" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
