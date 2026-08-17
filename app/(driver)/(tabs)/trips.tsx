import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../styles/theme";
 

const sampleStops = [
  { id: 1, title: "Curro Hazeldean School", subtitle: "Departure Point", time: "07:15 AM", status: "Departed" },
  { id: 2, title: "Silver Lakes Estate", subtitle: "12 Silverwood Dr, Pretoria", time: "07:45 AM", eta: "ETA 5 min" },
  { id: 3, title: "The Meadows Estate", subtitle: "23 Green St, Pretoria", time: "08:05 AM", eta: "ETA 25 min" },
  { id: 4, title: "Lombardy Estate", subtitle: "45 Lombardy Ave, Pretoria", time: "08:20 AM", status: "Current Stop" },
  { id: 5, title: "Stone Ridge Estate", subtitle: "9 Stone Ridge Dr, Pretoria", time: "08:35 AM", eta: "ETA 45 min" },
];

const Trips = () => {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* <DriverHeader title="My Route" /> */}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero card */}
        <LinearGradient
          colors={["#0F9D58", "#0B8A4A", "#0A6F3E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ margin: 16, borderRadius: 14, padding: 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
              <MaterialIcons name="directions-bus" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>Current Route</Text>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Pretoria East - Morning Route</Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", marginTop: 6 }}>Curro Hazeldean → Various Schools</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                <Text style={{ color: "#0F9D58", fontWeight: "700" }}>IN PROGRESS</Text>
              </View>
            </View>
          </View>

          {/* divider */}
          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 14 }} />

          {/* stats row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>Children Onboard</Text>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginTop: 6 }}>12 / 16</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>Next Pickup</Text>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginTop: 6 }}>07:45 AM</Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>ETA 5 min</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>Distance Left</Text>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginTop: 6 }}>18.4 km</Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>Est. 45 min</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>Route Progress</Text>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginTop: 6 }}>40%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={{ flexDirection: "row", paddingHorizontal: 18, marginTop: 6, alignItems: "center" }}>
          <TouchableOpacity style={{ paddingVertical: 12, paddingRight: 20, borderBottomWidth: 3, borderBottomColor: colors.primary }}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Route Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ color: colors.text.secondary }}>Stops (8)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ color: colors.text.secondary }}>Children (12)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ color: colors.text.secondary }}>Route Info</Text>
          </TouchableOpacity>
        </View>

        {/* Map placeholder */}
        <View style={{ margin: 16, borderRadius: 12, height: 200, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.text.secondary }}>Map placeholder</Text>
        </View>

        {/* Route Stops */}
        <View style={{ marginHorizontal: 16, marginTop: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text.primary, marginBottom: 8 }}>Route Stops</Text>
          {sampleStops.map((s) => (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ width: 44, alignItems: "center" }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: s.status === "Current Stop" ? colors.primary : "#F59E0B", justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>{s.id}</Text>
                </View>
                <View style={{ height: 40, width: 2, backgroundColor: colors.border, marginTop: 6 }} />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={{ fontWeight: "700", color: colors.text.primary }}>{s.title}</Text>
                <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{s.subtitle}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colors.text.primary, fontWeight: "700" }}>{s.time}</Text>
                {s.status ? <Text style={{ color: colors.primary, marginTop: 6 }}>{s.status}</Text> : s.eta ? <Text style={{ color: colors.primary, marginTop: 6 }}>{s.eta}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        {/* Start Route CTA */}
        <View style={{ margin: 16, marginTop: 22 }}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={{ borderRadius: 12 }}>
            <TouchableOpacity style={{ padding: 18, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
              <MaterialIcons name="play-arrow" size={24} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 12, fontSize: 16 }}>Start Route</Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", marginLeft: 12, opacity: 0.9 }}>Swipe right to start</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
};

export default Trips;