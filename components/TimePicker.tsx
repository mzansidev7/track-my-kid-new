import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface TimePickerProps {
  value: string; // ISO format time string or empty
  onChangeTime: (time: string) => void;
  minHour?: string;
  maxHour?: string;
  minTime?: string; // Time in HH:MM format (e.g., "06:00")
  compact?: boolean;
  placeholder?: string;
}

const TimePicker = ({
  value,
  onChangeTime,
  minHour,
  maxHour,
  minTime,
  compact = false,
  placeholder = "Select time",
}: TimePickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState("08");
  const [selectedMinute, setSelectedMinute] = useState("00");

  // Helper function to compare times in HH:MM format
  const isTimeAfter = (time: string, minTime: string): boolean => {
    const [timeHour, timeMin] = time.split(":").map(Number);
    const [minHour, minMin] = minTime.split(":").map(Number);
    return timeHour > minHour || (timeHour === minHour && timeMin > minMin);
  };

  React.useEffect(() => {
    if (!value) return;
    const timePart = value.includes("T") ? value.split("T")[1] : value;
    const [hour, minute] = timePart.split(":");
    if (!hour || !minute) return;
    let parsedHour = Number(hour);
    let parsedMinute = Number(minute);
    if (!Number.isInteger(parsedHour) || !Number.isInteger(parsedMinute)) return;
    if (minHour && parsedHour < Number(minHour)) parsedHour = Number(minHour);
    if (maxHour && parsedHour > Number(maxHour)) parsedHour = Number(maxHour);
    let normalized = `${String(parsedHour).padStart(2, "0")}:${String(parsedMinute).padStart(2, "0")}`;
    if (minTime && !isTimeAfter(normalized, minTime)) {
      const [minTimeHour, minTimeMinute] = minTime.split(":").map(Number);
      parsedHour = minTimeHour;
      parsedMinute = minTimeMinute + 1;
      if (parsedMinute >= 60) {
        parsedHour += 1;
        parsedMinute = 0;
      }
      if (maxHour && parsedHour > Number(maxHour)) {
        parsedHour = Number(maxHour);
        parsedMinute = 59;
      }
    }
    setSelectedHour(String(parsedHour).padStart(2, "0"));
    setSelectedMinute(String(parsedMinute).padStart(2, "0"));
  }, [value, minHour, maxHour, minTime]);

  const handleConfirm = () => {
    // Format time as HH:MM (will be used with date to create ISO string)
    const timeString = `${selectedHour}:${selectedMinute}`;
    onChangeTime(timeString);
    setShowPicker(false);
  };

  const displayTime = value
    ? value.includes("T")
      ? value.split("T")[1]?.substring(0, 5) || "08:00"
      : value.substring(0, 5)
    : placeholder;

  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0"),
  ).filter((hour) => {
    const h = parseInt(hour);
    if (minHour && h < parseInt(minHour)) return false;
    if (maxHour && h > parseInt(maxHour)) return false;
    // If minTime is set, only allow hours after the minTime hour
    if (minTime) {
      const [minTimeHour] = minTime.split(":").map(Number);
      if (h < minTimeHour) return false;
    }
    return true;
  });
  const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0"),
  ).filter((minute) => {
    // If minTime is set and selected hour equals minTime hour, filter minutes to be > minTime minutes
    if (minTime) {
      const [minTimeHour, minTimeMin] = minTime.split(":").map(Number);
      if (parseInt(selectedHour) === minTimeHour) {
        return parseInt(minute) > minTimeMin;
      }
    }
    return true;
  });

  return (
    <View>
      <TouchableOpacity
        style={[styles.timeButton, compact && styles.timeButtonCompact]}
        onPress={() => setShowPicker(true)}
      >
        <Text
          style={[
            styles.timeButtonText,
            compact && styles.timeButtonTextCompact,
            !value && compact && styles.timeButtonTextPlaceholder,
          ]}
        >
          {displayTime}
        </Text>
        {!compact ? (
          <Text style={styles.timeButtonSubtext}>Tap to set time</Text>
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.pickerHeaderBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Time</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={[styles.pickerHeaderBtn, styles.confirmBtn]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContent}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <Picker
                  selectedValue={selectedHour}
                  onValueChange={(itemValue) => setSelectedHour(itemValue)}
                  style={styles.picker}
                >
                  {hours.map((hour) => (
                    <Picker.Item
                      key={hour}
                      label={hour}
                      value={hour}
                      color="#333"
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <Picker
                  selectedValue={selectedMinute}
                  onValueChange={(itemValue) => setSelectedMinute(itemValue)}
                  style={styles.picker}
                >
                  {minutes.map((minute) => (
                    <Picker.Item
                      key={minute}
                      label={minute}
                      value={minute}
                      color="#333"
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  timeButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  timeButtonCompact: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    backgroundColor: "#F8FAFC",
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timeButtonTextCompact: {
    fontSize: 15,
    color: "#1E293B",
  },
  timeButtonTextPlaceholder: {
    color: "#71869C",
  },
  timeButtonSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  pickerHeaderBtn: {
    fontSize: 16,
    color: "#4A90E2",
    fontWeight: "600",
  },
  confirmBtn: {
    color: "#7ED321",
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  pickerContent: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  pickerColumn: {
    alignItems: "center",
    marginHorizontal: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
  },
  picker: {
    width: 80,
    height: 200,
    backgroundColor: "#FFF",
  },
});

export default TimePicker;
