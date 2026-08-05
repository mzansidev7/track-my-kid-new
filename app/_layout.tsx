import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider } from "../authContext/auth-context";
import { ThemeProvider } from "../styles/theme";

export default function AuthLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
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
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
