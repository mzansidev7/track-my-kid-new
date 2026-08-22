import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChildren } from "../clientHelpers/hooks/useChildren";

type Resource = "attendance" | "documents" | "teachers" | "school-info";

type Props = {
  resource: Resource;
};

const RESOURCE_CONFIG: Record<
  Resource,
  { title: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }
> = {
  attendance: { title: "Attendance", icon: "pie-chart", color: "#10B981" },
  documents: { title: "Documents", icon: "description", color: "#F59E0B" },
  teachers: { title: "Teachers", icon: "people", color: "#7C3AED" },
  "school-info": { title: "School Info", icon: "info", color: "#2563EB" },
};

const SchoolResourcePage = ({ resource }: Props) => {
  const router = useRouter();
  const { children, childrenLoading } = useChildren();
  const config = RESOURCE_CONFIG[resource];
  const firstChild = children[0];
  const school = useMemo(() => {
    const schoolData = firstChild?.school;
    return {
      name: schoolData?.name || firstChild?.school_name || "School not set",
      address:
        schoolData?.address ||
        firstChild?.school_address ||
        "School address unavailable",
      phone: schoolData?.phone,
      email: schoolData?.email,
      startTime: schoolData?.start_time,
      endTime: schoolData?.end_time,
      children: children.filter(
        (child) => child.school_id === firstChild?.school_id,
      ),
    };
  }, [children, firstChild]);

  const renderContent = () => {
    if (resource === "school-info") {
      return (
        <View style={styles.card}>
          <InfoRow icon="school" label="School" value={school.name} />
          <InfoRow icon="location-on" label="Address" value={school.address} />
          <InfoRow
            icon="schedule"
            label="School hours"
            value={
              school.startTime || school.endTime
                ? `${formatTime(school.startTime)} - ${formatTime(school.endTime)}`
                : "Not set"
            }
          />
          <InfoRow
            icon="phone"
            label="Phone"
            value={school.phone || "Contact unavailable"}
          />
          <InfoRow
            icon="email"
            label="Email"
            value={school.email || "Email unavailable"}
          />
        </View>
      );
    }

    if (resource === "teachers") {
      return (
        <EmptyState
          icon="people-outline"
          title="No teacher contacts yet"
          message="Teacher contact details will appear here when the school shares them."
        />
      );
    }

    if (resource === "documents") {
      return (
        <EmptyState
          icon="description"
          title="No documents yet"
          message="School documents for your children will appear here when available."
        />
      );
    }

    return (
      <View>
        {school.children.map((child) => (
          <View key={child.id} style={styles.card}>
            <View style={styles.childHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{child.name.charAt(0)}</Text>
              </View>
              <View style={styles.childCopy}>
                <Text style={styles.childName}>
                  {child.name} {child.lastname || ""}
                </Text>
                <Text style={styles.muted}>
                  Grade {child.grade || "not set"}
                </Text>
              </View>
              <Text style={styles.present}>No records</Text>
            </View>
          </View>
        ))}
        {!school.children.length && (
          <EmptyState
            icon="pie-chart"
            title="No attendance records yet"
            message="Attendance information will appear here when available."
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <MaterialIcons name={config.icon} size={21} color={config.color} />
          <Text style={styles.title}>{config.title}</Text>
        </View>
        <View style={styles.back} />
      </View>
      {childrenLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={config.color} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.schoolName}>{school.name}</Text>
          <Text style={styles.muted}>Information for your linked school</Text>
          <View style={styles.body}>{renderContent()}</View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const formatTime = (value?: string) => {
  if (!value) return "Not set";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <MaterialIcons name={icon} size={20} color="#2563EB" />
    <View style={styles.infoCopy}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const EmptyState = ({
  icon,
  title,
  message,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  message: string;
}) => (
  <View style={styles.empty}>
    <MaterialIcons name={icon} size={34} color="#94A3B8" />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.muted}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { color: "#0F172A", fontSize: 20, fontWeight: "800" },
  content: { padding: 16, paddingBottom: 40 },
  schoolName: { color: "#0F172A", fontSize: 22, fontWeight: "800" },
  muted: { color: "#64748B", fontSize: 13, marginTop: 4 },
  body: { marginTop: 18 },
  card: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  infoCopy: { flex: 1 },
  infoLabel: { color: "#64748B", fontSize: 11 },
  infoValue: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  childHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#2563EB", fontSize: 20, fontWeight: "800" },
  childCopy: { flex: 1 },
  childName: { color: "#0F172A", fontSize: 15, fontWeight: "800" },
  present: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  empty: {
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 28,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default SchoolResourcePage;
