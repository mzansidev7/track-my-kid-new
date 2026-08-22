import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

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

const DriverStudentsCard = ({
  students,
  onViewAll,
}: Props) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today&apos;s Students</Text>
          <Text style={styles.subtitle}>
            {students.length} students assigned
          </Text>
        </View>

        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {students.slice(0, 4).map((student) => (
        <View key={student.id} style={styles.student}>
          <View style={styles.avatar}>
            <MaterialIcons
              name="person"
              size={20}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.studentInfo}>
            <Text style={styles.name}>{student.name}</Text>

            <Text style={styles.school}>
              {student.school || "School not specified"}
            </Text>
          </View>

          <View
            style={[
              styles.status,
              student.status === "picked_up" &&
                styles.statusGreen,
              student.status === "dropped_off" &&
                styles.statusBlue,
            ]}
          >
            <Text style={styles.statusText}>
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
    backgroundColor: "#0D2850",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#193B68",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  subtitle: {
    color: "#7188A5",
    fontSize: 11,
    marginTop: 4,
  },

  viewAll: {
    color: "#22C7D6",
    fontSize: 12,
    fontWeight: "600",
  },

  student: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#193B68",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0057FF",
    alignItems: "center",
    justifyContent: "center",
  },

  studentInfo: {
    flex: 1,
    marginLeft: 11,
  },

  name: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  school: {
    color: "#7188A5",
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