import React from "react";
import {
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

import DriverMainHeader from "../../../components/driver/DriverMainHeader";
import DriverStatusCard from "../../../components/driver/DriverStatusCard";
import DriverQuickActions from "../../../components/driver/DriverQuickActions";
import DriverRouteCard from "../../../components/driver/DriverRouteCard";
import DriverStudentsCard from "../../../components/driver/DriverStudentsCard";
import { SafeAreaView } from "react-native-safe-area-context";

const DriverHome = () => {
  const router = useRouter();

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <DriverMainHeader
          driverName="Tumisang"
          // onNotificationPress={() =>
          //   router.push("/(driver)/notifications")
          // }
          onProfilePress={() =>
            router.push("/(driver)/(tabs)/profile")
          }
        />

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
          onPress={() =>
            router.push("/(driver)/(tabs)")
            
          }
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