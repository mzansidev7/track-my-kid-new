import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import DriverMainHeader from "../components/DriverMainHeader";
import DriverStatusCard from "../components/DriverStatusCard";
import DriverQuickActions from "../components/DriverQuickActions";
import DriverRouteCard from "../components/DriverRouteCard";
import DriverStudentsCard from "../components/DriverStudentsCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDriverNotifications } from "@/app/(driver)/driverHelpers/hooks/useDriverNotifications";
import { useDriverProfile } from "@/app/(driver)/driverHelpers/hooks/useDriverProfile";
import fetchDriverRoutes from "@/app/(driver)/driverHelpers/hooks//useDriverRoutes";

const DriverHome = () => {
  const { driver, loading, error } = useDriverProfile();
  const { routes, routesLoading, routesError } = fetchDriverRoutes();
  console.log({ driver, routes, routesLoading, routesError });
  const router = useRouter();
  const { notifications } = useDriverNotifications();

  const students = [
    {
      id: "1",
      name: "Mpho Tumisang",
      school: "Pretoria High School",
      status: "picked_up" as const,
    },
    {
      id: "2",
      name: "Tshepiso Mokoena",
      school: "Hoërskool Pretoria",
      status: "waiting" as const,
    },
    {
      id: "3",
      name: "Thabo Molefe",
      school: "Soshanguve Secondary",
      status: "waiting" as const,
    },
    {
      id: "4",
      name: "Naledi M.",
      school: "Pretoria High School",
      status: "dropped_off" as const,
    },
  ];

  const handleSubtitle = () => {
    // Check if there are students waiting for pickup
    if (students.some((student) => student.status === "waiting")) {
      return "You have students waiting for pickup.";
    }

    // Check if all students have been dropped off
    if (students.every((student) => student.status === "dropped_off")) {
      return "All students have been dropped off.";
    }

    // Check if currently on a trip
    if (students.some((student) => student.status === "picked_up")) {
      return "You are currently on a trip.";
    }

    // Default message
    return "Ready for today's trips?";
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: "#FFFFFF" }}>
          Error loading driver data. Please try again later.
        </Text>
      </SafeAreaView>
    );
  }
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <DriverMainHeader
          driverName={driver?.user?.name || "Driver"}
          onNotificationPress={() =>
            router.push("/(driver)/pages/notifications")
          }
          notificationCount={(notifications && notifications.length) || 0}
          onProfilePress={() => router.push("/(driver)/(tabs)/profile")}
          subtitle={handleSubtitle()}
        />

        {/* <Text
          style={{
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "600",
            marginBottom: 10,
          }}
        >
          {JSON.stringify(driver)}
        </Text> */}

        <DriverStatusCard
          isOnline={true}
          vehicleName="Mercedes Sprinter"
          licensePlate="LGP 234 GP"
        />

        <DriverQuickActions
          actions={[
            {
              label: "Start Trip",
              icon: "play-arrow",
              onPress: () =>
                // router.push("/(driver)/start-trip"),
                console.log("Start Trip pressed"),
            },
            {
              label: "Students",
              icon: "groups",
              onPress: () =>
                // router.push("/(driver)/students"),
                console.log("Start Trip pressed"),
            },
            {
              label: "Messages",
              icon: "chat-bubble-outline",
              onPress: () =>
                // router.push("/(driver)/messages"),
                console.log("Start Trip pressed"),
            },
            {
              label: "Map",
              icon: "map",
              onPress: () =>
                // router.push("/(driver)/map"),
                console.log("Start Trip pressed"),
            },
          ]}
        />

        <DriverRouteCard
          routeName="Morning School Route"
          startLocation="Pretoria"
          endLocation="Soshanguve"
          students={12}
          time="06:00 - 07:30"
          onPress={() => router.push("/(driver)/(tabs)")}
        />

        <DriverStudentsCard
          students={students}
          // onViewAll={() =>
          //   router.push("/(driver)/students")
          // }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061A3A",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
});

export default DriverHome;
