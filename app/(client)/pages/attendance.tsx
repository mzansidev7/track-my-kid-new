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
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import ClientHeader from "../components/ClientHeader";
import {
  ClientAttendanceItem,
  getClientDate,
  useClientAttendance,
} from "@/app-support/client/clientHelpers/hooks/useClientAttendance";

const getSouthAfricaDateTime = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

const getMinimumAbsenceDate = (schoolStartTime?: string | null) => {
  const current = getSouthAfricaDateTime();
  const startTime = /^([01]\d|2[0-3]):([0-5]\d)/.exec(schoolStartTime || "");
  const schoolStartMinutes = startTime
    ? Number(startTime[1]) * 60 + Number(startTime[2])
    : null;
  if (schoolStartMinutes === null || current.minutes < schoolStartMinutes) {
    return current.date;
  }

  const tomorrow = new Date(`${current.date}T12:00:00.000Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
};

const dateFromKey = (date: string) => new Date(`${date}T12:00:00`);

export default function AttendancePage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(getClientDate());
  const { attendance, history, loading, reload } =
    useClientAttendance(selectedDate);
  const [refreshing, setRefreshing] = useState(false);
  const [reportingChild, setReportingChild] =
    useState<ClientAttendanceItem | null>(null);
  const [absenceDate, setAbsenceDate] = useState(getClientDate());
  const [showAbsenceDatePicker, setShowAbsenceDatePicker] = useState(false);
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
  const absenceDateLabel = useMemo(
    () =>
      dateFromKey(absenceDate).toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [absenceDate],
  );
  const minimumAbsenceDate = getMinimumAbsenceDate(
    reportingChild?.schoolStartTime,
  );
  const absenceDateAllowed = absenceDate >= minimumAbsenceDate;

  const shiftDate = (days: number) => {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(getClientDate(next));
  };

  const submitAbsence = async () => {
    if (!reportingChild || !reason.trim() || !user?.token) return;
    if (!absenceDateAllowed) {
      Alert.alert(
        "Choose an available date",
        "Absences can only be reported for today before the school start time or for a future date.",
      );
      return;
    }
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
          absence_date: absenceDate,
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
      const errorMessage =
        error instanceof Error ? error.message : "Please try again.";
      Alert.alert(
        "Unable to report absence",
        errorMessage === "ABSENCE_REPORT_CUTOFF_PASSED"
          ? "Today's school start time has passed. Choose a future date."
          : errorMessage === "ABSENCE_DATE_CANNOT_BE_IN_PAST"
            ? "Choose today or a future date."
            : errorMessage,
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
                onPress={() => {
                  const minimumDate = getMinimumAbsenceDate(
                    item.schoolStartTime,
                  );
                  setAbsenceDate(
                    selectedDate >= minimumDate ? selectedDate : minimumDate,
                  );
                  setShowAbsenceDatePicker(false);
                  setReportingChild(item);
                }}
              >
                <MaterialIcons name="event-busy" size={18} color="#087C2B" />
                <Text style={styles.reportButtonText}>Report absence</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        {!loading && attendance.length > 0 && (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyTitle}>Attendance history</Text>
                <Text style={styles.historySubtitle}>
                  Recent attendance and parent absence reports
                </Text>
              </View>
              <MaterialIcons name="history" size={22} color="#087C2B" />
            </View>
            {history.length === 0 ? (
              <Text style={styles.historyEmpty}>
                Attendance history will appear here when the school records
                attendance or you report an absence.
              </Text>
            ) : (
              history.map((record) => (
                <View
                  key={`${record.childId}-${record.date}`}
                  style={styles.historyRow}
                >
                  <View style={styles.historyDateIcon}>
                    <MaterialIcons
                      name={
                        record.status === "absent"
                          ? "event-busy"
                          : "event-available"
                      }
                      size={18}
                      color={statusColor(record.status)}
                    />
                  </View>
                  <View style={styles.historyCopy}>
                    <Text style={styles.historyChild}>{record.childName}</Text>
                    <Text style={styles.historyDetail}>
                      {dateFromKey(record.date).toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" · "}
                      {record.status === "not_recorded"
                        ? "Not recorded"
                        : record.status.charAt(0).toUpperCase() +
                          record.status.slice(1)}
                      {record.reportStatus ? " · Parent reported" : ""}
                    </Text>
                    {record.reason ? (
                      <Text style={styles.historyReason}>
                        Reason: {record.reason}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
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
              will be absent on {absenceDateLabel}.
            </Text>
            <Text style={styles.dateInputLabel}>Absence date</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Absence date ${absenceDateLabel}`}
              style={styles.absenceDateButton}
              onPress={() => setShowAbsenceDatePicker((visible) => !visible)}
            >
              <MaterialIcons name="calendar-today" size={18} color="#087C2B" />
              <Text style={styles.absenceDateText}>{absenceDateLabel}</Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color="#607A98"
              />
            </TouchableOpacity>
            {showAbsenceDatePicker && (
              <DateTimePicker
                value={dateFromKey(absenceDate)}
                mode="date"
                display="default"
                minimumDate={dateFromKey(minimumAbsenceDate)}
                onChange={(_event, date) => {
                  setShowAbsenceDatePicker(false);
                  if (date) setAbsenceDate(getClientDate(date));
                }}
              />
            )}
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
                  (!reason.trim() || submitting || !absenceDateAllowed) &&
                    styles.disabledButton,
                ]}
                onPress={submitAbsence}
                disabled={!reason.trim() || submitting || !absenceDateAllowed}
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
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DCEAF8",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E7EFF7",
  },
  historyTitle: { color: "#17365E", fontSize: 16, fontWeight: "800" },
  historySubtitle: { color: "#607A98", fontSize: 11, marginTop: 4 },
  historyEmpty: {
    color: "#607A98",
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 14,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  historyDateIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F4F9FF",
  },
  historyCopy: { flex: 1 },
  historyChild: { color: "#17365E", fontSize: 13, fontWeight: "700" },
  historyDetail: { color: "#607A98", fontSize: 11, marginTop: 4 },
  historyReason: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
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
  dateInputLabel: {
    color: "#17365E",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 7,
  },
  absenceDateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  absenceDateText: { flex: 1, color: "#17365E", fontSize: 14 },
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
