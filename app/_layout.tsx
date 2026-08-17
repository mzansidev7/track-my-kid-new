import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {LogBox} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider } from "../context/authContext/auth-context";
import { SubscriptionProvider } from "../context/subscriptionContext/SubscriptionContext";
import { ThemeProvider } from "../styles/theme";

export default function AuthLayout() {
  LogBox.ignoreLogs(["Warning: ..."]); // Ignore log notification by message
  // LogBox.ignoreAllLogs(); //Ignore all log notifications

  SplashScreen.preventAutoHideAsync().catch(console.warn); // Prevent native splash screen from autohiding before App component declaration
  
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <SafeAreaView
              style={{ flex: 1, backgroundColor: "#F8F9FA" }}
              edges={[]}
            >
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "#F8F9FA" },
                }}
              />

              <StatusBar
                style="dark"
                translucent={true}
                backgroundColor="transparent"
              />
            </SafeAreaView>
          </SubscriptionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
