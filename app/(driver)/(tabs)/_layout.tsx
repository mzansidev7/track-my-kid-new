import DriversTabBar from "../components/DriversTabBar";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <DriversTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="students" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
