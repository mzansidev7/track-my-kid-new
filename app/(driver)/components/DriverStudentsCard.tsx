import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { DRIVER_COLORS } from "@/styles/theme";

type Student = {
  id: string;
  name: string;
  school?: string;
  routeName?: string;
  status?: "picked_up" | "waiting" | "dropped_off";
};

type Props = {
  students: Student[];
  totalStudents?: number;
  onViewAll?: () => void;
};

const DriverStudentsCard = ({
  students,
  totalStudents = students.length,
  onViewAll,
}: Props) => {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: DRIVER_COLORS.card,
          borderColor: DRIVER_COLORS.cardBorder,
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: DRIVER_COLORS.text }]}>
            Today&apos;s Students
          </Text>
          <Text style={[styles.subtitle, { color: DRIVER_COLORS.muted }]}>
            {totalStudents} students assigned
          </Text>
        </View>

        <TouchableOpacity onPress={onViewAll}>
          <Text style={[styles.viewAll, { color: DRIVER_COLORS.primary }]}>
            View all
          </Text>
        </TouchableOpacity>
      </View>

      {students.slice(0, 4).map((student) => (
        <View
          key={student.id}
          style={[
            styles.student,
            { borderTopColor: DRIVER_COLORS.cardBorder },
          ]}
        >
          <View style={styles.avatar}>
            <MaterialIcons
              name="person"
              size={20}
              color={DRIVER_COLORS.primary}
            />
          </View>

          <View style={styles.studentInfo}>
            <Text style={[styles.name, { color: DRIVER_COLORS.text }]}>
              {student.name}
            </Text>

            <Text style={[styles.school, { color: DRIVER_COLORS.muted }]}>
              {student.school || "School not specified"}
              {student.routeName ? ` · ${student.routeName}` : ""}
            </Text>
          </View>

          <View
            style={[
              styles.status,
              student.status === "picked_up" && styles.statusGreen,
              student.status === "dropped_off" && styles.statusBlue,
            ]}
          >
            <Text style={[styles.statusText, { color: DRIVER_COLORS.text }]}>
              {student.status === "picked_up"
                ? "Picked up"
                : student.status === "dropped_off"
                  ? "Dropped off"
                  : "Waiting"}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DRIVER_COLORS.card,
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  title: {
    color: DRIVER_COLORS.text,
    fontSize: 17,
    fontWeight: "700",
  },

  subtitle: {
    color: DRIVER_COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  viewAll: {
    color: DRIVER_COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },

  student: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAF2ED",
    alignItems: "center",
    justifyContent: "center",
  },

  studentInfo: {
    flex: 1,
    marginLeft: 11,
  },

  name: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "600",
  },

  school: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 3,
  },

  status: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F2E8D6",
  },

  statusGreen: {
    backgroundColor: "#E2F2E9",
  },

  statusBlue: {
    backgroundColor: "#E7EEF7",
  },

  statusText: {
    color: DRIVER_COLORS.text,
    fontSize: 9,
    fontWeight: "600",
  },
});

export default DriverStudentsCard;
