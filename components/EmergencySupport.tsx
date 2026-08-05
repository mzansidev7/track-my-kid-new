import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface EmergencySupportProps {
  onReportEmergency?: (details: string) => void;
}

export default function EmergencySupport({
  onReportEmergency,
}: EmergencySupportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const emergencyTypes = [
    { id: "child-missing", label: "Child Not Arrived", icon: "⚠️" },
    { id: "driver-issue", label: "Driver Issue", icon: "👤" },
    { id: "accident", label: "Accident/Incident", icon: "🚗" },
    { id: "safety-concern", label: "Safety Concern", icon: "🛡️" },
    { id: "medical", label: "Medical Emergency", icon: "🏥" },
  ];

  const handleSubmit = () => {
    if (reportType && description) {
      onReportEmergency?.(description);
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setReportType("");
        setDescription("");
        setSubmitted(false);
      }, 3000);
    }
  };

  const handleCallSupport = () => {
    const phoneNumber = "0800TMKSAFE"; // South African toll-free format
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Error", "Unable to make phone call");
    });
  };

  return (
    <>
      {/* Sticky Emergency Button */}
      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.emergencyIcon}>🚨</Text>
        <Text style={styles.emergencyText}>Emergency</Text>
      </TouchableOpacity>

      {/* Emergency Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.emergencyModal}>
            {!submitted ? (
              <>
                <View style={styles.emergencyHeader}>
                  <Text style={styles.emergencyTitle}>🚨 Emergency Report</Text>
                  <Text style={styles.emergencySubtitle}>
                    Report an urgent issue with your child&apos;s transport.
                    We&apos;ll prioritize this immediately.
                  </Text>
                </View>

                <View style={styles.emergencyForm}>
                  <Text style={styles.formLabel}>
                    What&apos;s the emergency?
                  </Text>
                  <View style={styles.emergencyTypes}>
                    {emergencyTypes.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.typeBtn,
                          reportType === type.id && styles.typeBtnSelected,
                        ]}
                        onPress={() => setReportType(type.id)}
                      >
                        <Text style={styles.typeIcon}>{type.icon}</Text>
                        <Text
                          style={[
                            styles.typeLabel,
                            reportType === type.id && styles.typeLabelSelected,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.formLabel}>Describe the situation</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Provide as much detail as possible..."
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <View style={styles.emergencyActions}>
                    <TouchableOpacity
                      style={[
                        styles.submitEmergencyBtn,
                        !(reportType && description) && styles.btnDisabled,
                      ]}
                      onPress={handleSubmit}
                      disabled={!reportType || !description}
                    >
                      <Text style={styles.submitEmergencyText}>
                        🚨 Report Emergency
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.callSupportBtn}
                      onPress={handleCallSupport}
                    >
                      <Text style={styles.callSupportText}>
                        ☎️ Call Support Hotline
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setIsOpen(false)}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emergencySubmitted}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.submittedTitle}>Emergency Reported</Text>
                <Text style={styles.submittedMessage}>
                  Our team has been notified and will contact you immediately.
                </Text>
                <Text style={styles.supportHotline}>
                  <Text style={styles.hotlineLabel}>Support Hotline:</Text>{" "}
                  0800-TMK-SAFE
                </Text>
              </View>
            )}

            {!submitted && (
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setIsOpen(false)}
              >
                <MaterialIcons name="close" size={24} color="#cbd5e0" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  emergencyButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#ff4757",
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  emergencyIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  emergencyText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  emergencyModal: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    maxHeight: "90%",
    position: "relative",
  },
  emergencyHeader: {
    backgroundColor: "#ff4757",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  emergencySubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  emergencyForm: {
    padding: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: 12,
  },
  emergencyTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#f7fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 8,
  },
  typeBtnSelected: {
    backgroundColor: "#4a90e2",
    borderColor: "#4a90e2",
  },
  typeIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4a5568",
    textAlign: "center",
  },
  typeLabelSelected: {
    color: "white",
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  emergencyActions: {
    marginTop: 24,
    gap: 12,
  },
  submitEmergencyBtn: {
    backgroundColor: "#ff4757",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  submitEmergencyText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  callSupportBtn: {
    backgroundColor: "#4a90e2",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  callSupportText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelBtn: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  cancelText: {
    color: "#4a5568",
    fontSize: 14,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  emergencySubmitted: {
    padding: 40,
    alignItems: "center",
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  submittedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: 8,
  },
  submittedMessage: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginBottom: 16,
  },
  supportHotline: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4a90e2",
    textAlign: "center",
  },
  hotlineLabel: {
    color: "#718096",
  },
  modalClose: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 8,
  },
});
