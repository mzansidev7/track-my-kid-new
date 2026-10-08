import { Tabs } from "expo-router";
import { useFocusEffect, useRouter, useSegments } from "expo-router";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import SchoolTabBar from "../components/SchoolTabBar";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import {
  EXPIRED_TRIAL_SAFETY_TABS,
  isSchoolTrialExpiredWithoutPaidSubscription,
  SchoolBillingAccessContext,
  type SchoolBillingAccess,
} from "../schoolBillingAccess";

export default function SchoolLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user } = useContext(AuthContext);
  const token = user?.token;
  const [trialExpired, setTrialExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) {
        setTrialExpired(false);
        setLoading(false);
        return () => {
          active = false;
        };
      }

      const checkBillingAccess = async () => {
        try {
          const baseUrl = await resolveWorkingBaseUrl();
          const response = await fetch(`${baseUrl}/school/billing`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const billing = await response.json();
          if (!response.ok) {
            throw new Error(billing.error || "Unable to check school billing access.");
          }
          if (active) {
            setTrialExpired(isSchoolTrialExpiredWithoutPaidSubscription(billing));
          }
        } catch (error) {
          console.error("Could not check school billing access:", error);
          if (active) setTrialExpired(false);
        } finally {
          if (active) setLoading(false);
        }
      };

      setLoading(true);
      void checkBillingAccess();
      return () => {
        active = false;
      };
    }, [token]),
  );

  const currentScreen = String(segments[segments.length - 1] || "index");
  useEffect(() => {
    if (
      !loading &&
      trialExpired &&
      !EXPIRED_TRIAL_SAFETY_TABS.has(currentScreen)
    ) {
      router.replace("/(school)/billing" as never);
    }
  }, [currentScreen, loading, router, trialExpired]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SchoolBillingAccessContext.Provider value={{ trialExpired, loading }}>
      <Tabs
        tabBar={() => <SchoolTabBar />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="students" />
        <Tabs.Screen name="routes" />
        <Tabs.Screen name="trips" />
        <Tabs.Screen name="messages" />
        <Tabs.Screen name="more" />
      </Tabs>
    </SchoolBillingAccessContext.Provider>
  );
}
