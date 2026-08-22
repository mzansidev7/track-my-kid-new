import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Child, useChildren } from "../clientHelpers/hooks/useChildren";

const minutes = (value?: string) => {
  if (!value) return null;
  const [hours, mins] = value.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(mins)
    ? hours * 60 + mins
    : null;
};
const time = (value?: string) => {
  if (!value) return "Not set";
  const valueMinutes = minutes(value);
  if (valueMinutes === null) return value;
  const date = new Date();
  date.setHours(Math.floor(valueMinutes / 60), valueMinutes % 60, 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const tripStatus = (child?: Child) => {
  const route = child?.route;
  if (!route) return "No transport";
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const pickupStart = minutes(route.pickup_start_time || route.departure_time);
  const pickupEnd = minutes(route.pickup_end_time);
  const dropoffStart = minutes(route.dropoff_start_time);
  const dropoffEnd = minutes(route.dropoff_end_time);
  if (pickupStart !== null && current < pickupStart) return "Scheduled";
  if (pickupEnd !== null && current <= pickupEnd) return "On trip";
  if (dropoffStart !== null && current < dropoffStart) return "At school";
  if (dropoffEnd !== null && current <= dropoffEnd) return "On trip";
  return "Completed";
};

const School = () => {
  const router = useRouter();
  const { children, childrenLoading } = useChildren();
  const school = useMemo(() => {
    const first = children[0];
    const schoolData = first?.school;
    return {
      ...schoolData,
      name: schoolData?.name || first?.school_name || "School not set",
      address:
        schoolData?.address ||
        first?.school_address ||
        "School address unavailable",
      id: schoolData?.id || first?.school_id || "Not available",
      children: children.filter(
        (child) => child.school_id === first?.school_id,
      ),
    };
  }, [children]);
  const lead =
    school.children.find((child) => child.route || child.vehicle) ||
    school.children[0];
  const route = lead?.route;
  const status = tripStatus(lead);
  const schoolPhone = school.phone;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={25} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>School</Text>
        <View style={styles.back} />
      </View>
      {childrenLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.muted}>Loading school details...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.schoolTop}>
              <Image
                source={
                  school.logo
                    ? { uri: school.logo }
                    : require("../../../assets/images/school.jpeg")
                }
                style={styles.logo}
              />
              <View style={styles.schoolCopy}>
                <View style={styles.nameRow}>
                  <Text style={styles.schoolName} numberOfLines={2}>
                    {school.name}
                  </Text>
                  <Text style={styles.active}>Active</Text>
                </View>
                <Line icon="location-on" text={school.address} />
                <Line
                  icon="phone"
                  text={school.phone || "Contact unavailable"}
                />
                <Line
                  icon="email"
                  text={school.email || "School email unavailable"}
                />
              </View>
              <TouchableOpacity
                style={styles.contact}
                onPress={() =>
                  schoolPhone
                    ? Linking.openURL(`tel:${schoolPhone}`).catch(
                        () => undefined,
                      )
                    : undefined
                }
              >
                <MaterialIcons name="phone" size={20} color="#2563EB" />
                <Text style={styles.contactText}>Contact{"\n"}School</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.stats}>
              {/* <Text>{JSON.stringify(school)}</Text> */}
              <Stat
                icon="schedule"
                label="School Hours"
                value={
                  school.start_time || school.end_time
                    ? `${time(school.start_time)} - ${time(school.end_time)}`
                    : "Not available"
                }
                color="#2563EB"
              />
              <Stat
                icon="school"
                label="Grades"
                value={school.children.length ? "Enrolled" : "Not set"}
                color="#10B981"
              />
              <Stat
                icon="badge"
                label="School ID"
                value={school.emis_number || school.id.slice(0, 8)}
                color="#2563EB"
              />
              <Stat
                icon="location-on"
                label="Distance"
                value="Not available"
                color="#10B981"
              />
            </View>
          </View>

          <Header
            title="My Children"
            action="View all"
            onPress={() => router.push("/(client)/(tabs)/children" as never)}
          />
          {school.children.length ? (
            school.children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={styles.childCard}
                onPress={() =>
                  router.push({
                    pathname: "/(client)/(tabs)/children/[childId]",
                    params: { childId: child.id },
                  })
                }
              >
                {child.avatar ? (
                  <Image source={{ uri: child.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{child.name[0]}</Text>
                  </View>
                )}
                <View style={styles.childCopy}>
                  <Text style={styles.childName}>
                    {child.name} {child.lastname || ""}
                  </Text>
                  <Text style={styles.muted}>
                    {child.grade || "Grade not set"} · {child.school_name}
                  </Text>
                  <Text style={styles.enrolled}>Enrolled</Text>
                </View>
                <View style={styles.transport}>
                  <Line
                    icon="directions-bus"
                    text={child.route?.route_name || "Route not assigned"}
                  />
                  <Line
                    icon="directions-car"
                    text={child.vehicle?.name || "Vehicle not assigned"}
                  />
                  <Line
                    icon="person-outline"
                    text={child.vehicle?.driver?.name || "Driver not assigned"}
                  />
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#64748B" />
              </TouchableOpacity>
            ))
          ) : (
            <Empty text="No children enrolled at this school." />
          )}

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{`Today's Transport`}</Text>
            <Text style={styles.status}>● {status}</Text>
          </View>
          {lead && route ? (
            <View style={styles.card}>
              <View style={styles.transportHeader}>
                <View>
                  <Text style={styles.muted}>
                    {lead.name} {lead.lastname || ""}
                  </Text>
                  <Text style={styles.vehicle}>
                    {route.route_name ||
                      lead.vehicle?.name ||
                      "Transport route"}
                  </Text>
                  <Text style={styles.muted}>
                    {lead.vehicle?.license_plate || "License plate unavailable"}
                  </Text>
                </View>
                <Text style={styles.driver}>
                  Driver{"\n"}
                  {lead.vehicle?.driver?.name || "Not assigned"}
                </Text>
              </View>
              <View style={styles.timeline}>
                <Point
                  icon="directions-bus"
                  label="Pickup"
                  value={time(route.pickup_start_time || route.departure_time)}
                  detail={lead.pickup_address || route.start_location || "Home"}
                  color="#10B981"
                />
                <View style={styles.connector} />
                <Point
                  icon="school"
                  label="School"
                  value={time(route.dropoff_start_time)}
                  detail={school.name || lead.school_name}
                  color="#2563EB"
                />
                <View style={styles.connector} />
                <Point
                  icon="directions-bus"
                  label="Drop-off"
                  value={time(route.dropoff_end_time)}
                  detail={lead.dropoff_address || route.end_location || "Home"}
                  color="#F97316"
                />
                <View style={styles.connector} />
                <Point
                  icon="check"
                  label="Status"
                  value={status}
                  detail={
                    status === "On trip"
                      ? "Live transport"
                      : "Scheduled transport"
                  }
                  color="#10B981"
                />
              </View>
            </View>
          ) : (
            <Empty text="No transport scheduled for today." />
          )}

          <View style={styles.columns}>
            <Panel icon="campaign" title="Announcements" color="#F97316" />
            <Panel icon="event" title="Upcoming Events" color="#7C3AED" />
          </View>
          <View style={styles.quick}>
            <Quick
              icon="pie-chart"
              label="Attendance"
              color="#10B981"
              onPress={() => router.push("/(client)/pages/attendance" as never)}
            />
            <Quick
              icon="chat-bubble"
              label="Messages"
              color="#2563EB"
              onPress={() => router.push("/(client)/(tabs)/messages" as never)}
            />
            <Quick
              icon="description"
              label="Documents"
              color="#F59E0B"
              onPress={() => router.push("/(client)/pages/documents" as never)}
            />
            <Quick
              icon="people"
              label="Teachers"
              color="#7C3AED"
              onPress={() => router.push("/(client)/pages/teachers" as never)}
            />
            <Quick
              icon="info"
              label="School Info"
              color="#10B981"
              onPress={() =>
                router.push("/(client)/pages/school-info" as never)
              }
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
const Line = ({
  icon,
  text,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
}) => (
  <View style={styles.line}>
    <MaterialIcons name={icon} size={16} color="#64748B" />
    <Text style={styles.muted} numberOfLines={1}>
      {text}
    </Text>
  </View>
);
const Stat = ({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  color: string;
}) => (
  <View style={styles.stat}>
    <MaterialIcons name={icon} size={20} color={color} />
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);
const Header = ({
  title,
  action,
  onPress,
}: {
  title: string;
  action: string;
  onPress: () => void;
}) => (
  <View style={styles.sectionRow}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <TouchableOpacity onPress={onPress}>
      <Text style={styles.link}>{action}</Text>
    </TouchableOpacity>
  </View>
);
const Point = ({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  detail: string;
  color: string;
}) => (
  <View style={styles.point}>
    <View style={[styles.pointIcon, { backgroundColor: `${color}18` }]}>
      <MaterialIcons name={icon} size={17} color={color} />
    </View>
    <Text style={styles.pointLabel}>{label}</Text>
    <Text style={styles.pointValue}>{value}</Text>
    <Text style={styles.pointDetail} numberOfLines={2}>
      {detail}
    </Text>
  </View>
);
const Panel = ({
  icon,
  title,
  color,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  color: string;
}) => (
  <View style={styles.panel}>
    <View style={styles.panelHead}>
      <MaterialIcons name={icon} size={20} color={color} />
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.link}>View all</Text>
    </View>
    <Text style={styles.muted}>No updates yet.</Text>
  </View>
);
const Quick = ({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.quickItem} onPress={onPress}>
    <MaterialIcons name={icon} size={22} color={color} />
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);
const Empty = ({ text }: { text: string }) => (
  <View style={styles.empty}>
    <MaterialIcons name="info-outline" size={20} color="#94A3B8" />
    <Text style={styles.muted}>{text}</Text>
  </View>
);

export default School;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    height: 64,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 21, fontWeight: "800", color: "#0F172A" },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  schoolTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 80, height: 80, borderRadius: 40 },
  schoolCopy: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  schoolName: { flex: 1, fontSize: 17, fontWeight: "800", color: "#0F172A" },
  active: {
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: "700",
  },
  line: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  muted: { color: "#64748B", fontSize: 12, flexShrink: 1 },
  contact: {
    width: 62,
    height: 72,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 14,
    paddingTop: 12,
    gap: 10,
  },
  stat: { width: "47%", flexDirection: "row", alignItems: "center", gap: 7 },
  statLabel: { color: "#64748B", fontSize: 10 },
  statValue: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    maxWidth: 120,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  link: { color: "#2563EB", fontSize: 12, fontWeight: "700" },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#2563EB", fontSize: 23, fontWeight: "800" },
  childCopy: { flex: 1 },
  childName: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  enrolled: {
    alignSelf: "flex-start",
    color: "#16A34A",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 5,
    fontSize: 10,
    fontWeight: "700",
  },
  transport: { width: 108, gap: 3 },
  transportHeader: { flexDirection: "row", justifyContent: "space-between" },
  vehicle: { color: "#0F172A", fontSize: 17, fontWeight: "800" },
  driver: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18,
  },
  timeline: { flexDirection: "row", alignItems: "flex-start", marginTop: 20 },
  point: { flex: 1, alignItems: "center" },
  pointIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  pointLabel: {
    color: "#334155",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
  },
  pointValue: { color: "#64748B", fontSize: 10, marginTop: 3 },
  pointDetail: {
    color: "#64748B",
    fontSize: 9,
    textAlign: "center",
    marginTop: 3,
  },
  connector: {
    width: 12,
    height: 2,
    backgroundColor: "#CBD5E1",
    marginTop: 16,
  },
  status: { color: "#059669", fontSize: 12, fontWeight: "700" },
  columns: { flexDirection: "row", gap: 10, marginTop: 2 },
  panel: {
    flex: 1,
    minHeight: 105,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
  },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 5 },
  panelTitle: { flex: 1, color: "#0F172A", fontWeight: "800", fontSize: 12 },
  quick: { flexDirection: "row", gap: 8, marginTop: 12 },
  quickItem: {
    flex: 1,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
  },
  quickLabel: {
    color: "#475569",
    fontSize: 9,
    textAlign: "center",
    marginTop: 6,
  },
  empty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
