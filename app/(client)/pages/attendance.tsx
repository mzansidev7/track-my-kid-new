import React, { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import ClientHeader from "../components/ClientHeader";
import {
  ClientAttendanceItem,
  getClientDate,
  useClientAttendance,
} from "../clientHelpers/hooks/useClientAttendance";

export default function AttendancePage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(getClientDate());
  const { attendance, loading, reload } = useClientAttendance(selectedDate);
  const [refreshing, setRefreshing] = useState(false);
  const [reportingChild, setReportingChild] =
    useState<ClientAttendanceItem | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dateLabel = useMemo(
    () =>
      new Date(`${selectedDate}T12:00:00`).toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [selectedDate],
  );

  const shiftDate = (days: number) => {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(getClientDate(next));
  };

  const submitAbsence = async () => {
    if (!reportingChild || !reason.trim() || !user?.token) return;
    setSubmitting(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/attendance/absence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          child_id: reportingChild.childId,
          absence_date: selectedDate,
          reason: reason.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to report absence.");
      setReportingChild(null);
      setReason("");
      Alert.alert(
        "Absence reported",
        `${reportingChild.childName}'s school has been notified.`,
      );
      await reload();
    } catch (error) {
      Alert.alert(
        "Unable to report absence",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: ClientAttendanceItem["status"]) => {
    if (status === "present") return "#159B3A";
    if (status === "late") return "#D97706";
    if (status === "absent") return "#DC2626";
    return "#607A98";
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ClientHeader
        title="Attendance"
        subtitle="Keep track of every school day"
        showBackButton
        onBackPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.dateCard}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => shiftDate(-1)}
          >
            <MaterialIcons name="chevron-left" size={24} color="#087C2B" />
          </TouchableOpacity>
          <View style={styles.dateCopy}>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            <Text style={styles.dateHint}>
              {selectedDate === getClientDate() ? "Today" : selectedDate}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => shiftDate(1)}
          >
            <MaterialIcons name="chevron-right" size={24} color="#087C2B" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#159B3A" />
            <Text style={styles.muted}>Loading attendance...</Text>
          </View>
        ) : attendance.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-available" size={42} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No children linked yet</Text>
            <Text style={styles.muted}>
              Add a child to start seeing attendance history here.
            </Text>
          </View>
        ) : (
          attendance.map((item) => (
            <View key={item.childId} style={styles.childCard}>
              <View style={styles.childTopRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.childName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.childCopy}>
                  <Text style={styles.childName}>{item.childName}</Text>
                  <Text style={styles.schoolName}>
                    {item.schoolName || "School"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: `${statusColor(item.status)}18` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColor(item.status) },
                    ]}
                  >
                    {item.status === "not_recorded"
                      ? "Not recorded"
                      : item.status}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <MaterialIcons name="schedule" size={18} color="#607A98" />
                <Text style={styles.detailText}>
                  {item.arrivalTime
                    ? `Arrived ${new Date(item.arrivalTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "No arrival recorded"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => setReportingChild(item)}
              >
                <MaterialIcons name="event-busy" size={18} color="#087C2B" />
                <Text style={styles.reportButtonText}>Report absence</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={Boolean(reportingChild)}
        transparent
        animationType="slide"
        onRequestClose={() => setReportingChild(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report absence</Text>
            <Text style={styles.modalSubtitle}>
              Tell the school why {reportingChild?.childName || "your child"}{" "}
              will be absent on {dateLabel}.
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for absence"
              placeholderTextColor="#607A98"
              multiline
              textAlignVertical="top"
              style={styles.reasonInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setReportingChild(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!reason.trim() || submitting) && styles.disabledButton,
                ]}
                onPress={submitAbsence}
                disabled={!reason.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Send report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F9FF" },
  content: { padding: 16, paddingBottom: 36 },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    marginBottom: 16,
  },
  dateButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EDF7FF",
  },
  dateCopy: { flex: 1, alignItems: "center" },
  dateLabel: { color: "#17365E", fontSize: 16, fontWeight: "800" },
  dateHint: { color: "#607A98", fontSize: 12, marginTop: 3 },
  childCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DCEAF8",
  },
  childTopRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EDF7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#087C2B", fontSize: 20, fontWeight: "800" },
  childCopy: { flex: 1, marginLeft: 11 },
  childName: { color: "#17365E", fontSize: 16, fontWeight: "800" },
  schoolName: { color: "#607A98", fontSize: 12, marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  detailText: { color: "#607A98", fontSize: 13 },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: "#E9F8EE",
  },
  reportButtonText: { color: "#087C2B", fontSize: 13, fontWeight: "800" },
  centerState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    padding: 28,
    marginTop: 8,
  },
  emptyTitle: {
    color: "#17365E",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
  },
  muted: { color: "#607A98", fontSize: 13, textAlign: "center", marginTop: 5 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  modalTitle: { color: "#17365E", fontSize: 20, fontWeight: "800" },
  modalSubtitle: {
    color: "#607A98",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  reasonInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    color: "#17365E",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCEAF8",
    borderRadius: 10,
    paddingVertical: 12,
  },
  cancelText: { color: "#607A98", fontWeight: "800" },
  submitButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: "#159B3A",
  },
  submitText: { color: "#FFF", fontWeight: "800" },
  disabledButton: { opacity: 0.5 },
});
