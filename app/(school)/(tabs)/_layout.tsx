import { Tabs } from "expo-router";
import SchoolTabBar from "../components/SchoolTabBar";
export default function SchoolLayout() {
  return (
    <Tabs
      tabBar={(props) => <SchoolTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="students" />
      <Tabs.Screen name="routes" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
