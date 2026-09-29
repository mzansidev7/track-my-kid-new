import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/styles/theme";

type Student = {
  id: string;
  name: string;
  school?: string;
  status?: "picked_up" | "waiting" | "dropped_off";
};

type Props = {
  students: Student[];
  onViewAll?: () => void;
};

const DriverStudentsCard = ({ students, onViewAll }: Props) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.primary }]}>
            Today&apos;s Students
          </Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>
            {students.length} students assigned
          </Text>
        </View>

        <TouchableOpacity onPress={onViewAll}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>
            View all
          </Text>
        </TouchableOpacity>
      </View>

      {students.slice(0, 4).map((student) => (
        <View
          key={student.id}
          style={[styles.student, { borderTopColor: colors.border }]}
        >
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={20} color={colors.primary} />
          </View>

          <View style={styles.studentInfo}>
            <Text style={[styles.name, { color: colors.primary }]}>
              {student.name}
            </Text>

            <Text style={[styles.school, { color: colors.primary }]}>
              {student.school || "School not specified"}
            </Text>
          </View>

          <View
            style={[
              styles.status,
              student.status === "picked_up" && styles.statusGreen,
              student.status === "dropped_off" && styles.statusBlue,
            ]}
          >
            <Text style={[styles.statusText, { color: colors.primary }]}>
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
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.16)",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  title: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "700",
  },

  subtitle: {
    color: "#4B5563",
    fontSize: 11,
    marginTop: 4,
  },

  viewAll: {
    color: "#0F9D58",
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
    backgroundColor: "#0F9D58",
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
    backgroundColor: "#463A1E",
  },

  statusGreen: {
    backgroundColor: "#123E35",
  },

  statusBlue: {
    backgroundColor: "#123A6A",
  },

  statusText: {
    color: "#DDE8F5",
    fontSize: 9,
    fontWeight: "600",
  },
});

export default DriverStudentsCard;
