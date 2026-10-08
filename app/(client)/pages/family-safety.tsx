import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useChildren } from "../clientHelpers/hooks/useChildren";
import ClientHeader from "../components/ClientHeader";

type Contact = {
  id: string;
  child_id?: string | null;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  contact_type: "family" | "authorized_pickup" | "emergency";
};

const typeLabels = {
  family: "Family / guardian",
  authorized_pickup: "Authorized pickup",
  emergency: "Emergency contact",
};

export default function FamilySafetyPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { children } = useChildren();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
    contact_type: "family" as Contact["contact_type"],
    child_id: "",
  });

  const loadContacts = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/contacts`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to load contacts.");
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert(
        "Unable to load contacts",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts]),
  );

  const saveContact = async () => {
    if (
      !user?.token ||
      !form.name.trim() ||
      !form.relationship.trim() ||
      !form.phone.trim()
    )
      return;
    setSaving(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...form, child_id: form.child_id || null }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to save contact.");
      setContacts((current) => [...current, data]);
      setModalVisible(false);
      setForm({
        name: "",
        relationship: "",
        phone: "",
        email: "",
        contact_type: "family",
        child_id: "",
      });
    } catch (error) {
      Alert.alert(
        "Unable to save contact",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeContact = (contact: Contact) => {
    Alert.alert(
      "Remove contact",
      `Remove ${contact.name} from your safety contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!user?.token) return;
            const baseUrl = await resolveWorkingBaseUrl();
            const response = await fetch(
              `${baseUrl}/client/contacts/${contact.id}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${user.token}` },
              },
            );
            if (response.ok)
              setContacts((current) =>
                current.filter((item) => item.id !== contact.id),
              );
          },
        },
      ],
    );
  };

  const sendSos = () => {
    Alert.alert(
      "Send emergency alert?",
      "This will notify Track My Kid support that you need urgent help.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send alert",
          style: "destructive",
          onPress: async () => {
            if (!user?.token) return;
            setSosLoading(true);
            try {
              const baseUrl = await resolveWorkingBaseUrl();
              const response = await fetch(
                `${baseUrl}/client/emergency-alerts`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${user.token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    message: "Parent requested urgent assistance.",
                  }),
                },
              );
              const data = await response.json();
              if (!response.ok)
                throw new Error(
                  data.error || "Unable to send emergency alert.",
                );
              Alert.alert(
                "Alert sent",
                "Support has received your emergency request.",
              );
            } catch (error) {
              Alert.alert(
                "Unable to send alert",
                error instanceof Error
                  ? error.message
                  : "Please call emergency services if there is immediate danger.",
              );
            } finally {
              setSosLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ClientHeader
        title="Family & Safety"
        subtitle="People who can help keep your child safe"
        showBackButton
        onBackPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.sosButton}
          onPress={sendSos}
          disabled={sosLoading}
        >
          {sosLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <MaterialIcons name="sos" size={24} color="#FFF" />
          )}
          <View style={styles.sosCopy}>
            <Text style={styles.sosTitle}>Emergency help</Text>
            <Text style={styles.sosText}>
              Send an urgent alert to Track My Kid support
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.incidentReportButton}
          onPress={() => router.push("/(client)/incident-report" as never)}
        >
          <MaterialIcons name="report-problem" size={22} color="#087C2B" />
          <View style={styles.sosCopy}>
            <Text style={styles.incidentReportTitle}>
              Report a transport incident
            </Text>
            <Text style={styles.incidentReportText}>
              Send a safety, route, vehicle, or student concern to the school.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#087C2B" />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your contacts</Text>
            <Text style={styles.muted}>
              Guardians, family, and approved pickup people
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <MaterialIcons name="add" size={20} color="#FFF" />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#159B3A" />
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="group-add" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No safety contacts yet</Text>
            <Text style={styles.muted}>
              Add a trusted family member or authorized pickup person.
            </Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <MaterialIcons
                  name={
                    contact.contact_type === "emergency"
                      ? "emergency"
                      : contact.contact_type === "authorized_pickup"
                        ? "directions-car"
                        : "person"
                  }
                  size={22}
                  color="#159B3A"
                />
              </View>
              <View style={styles.contactCopy}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactMeta}>
                  {typeLabels[contact.contact_type]} · {contact.relationship}
                </Text>
                <Text style={styles.contactMeta}>
                  {contact.phone}
                  {contact.email ? ` · ${contact.email}` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeContact(contact)}>
                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color="#DC2626"
                />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add safety contact</Text>
            <Text style={styles.muted}>
              This person may be contacted about your child&apos;s transport.
            </Text>
            {(["name", "relationship", "phone", "email"] as const).map(
              (field) => (
                <TextInput
                  key={field}
                  style={styles.input}
                  placeholderTextColor="#607A98"
                  value={form[field]}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, [field]: value }))
                  }
                  placeholder={
                    field === "name"
                      ? "Full name"
                      : field === "relationship"
                        ? "Relationship"
                        : field === "phone"
                          ? "Phone number"
                          : "Email (optional)"
                  }
                  keyboardType={
                    field === "phone"
                      ? "phone-pad"
                      : field === "email"
                        ? "email-address"
                        : "default"
                  }
                />
              ),
            )}
            {children.length > 0 && (
              <View style={styles.childPicker}>
                <Text style={styles.pickerLabel}>Applies to</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      !form.child_id && styles.typeButtonActive,
                    ]}
                    onPress={() =>
                      setForm((current) => ({ ...current, child_id: "" }))
                    }
                  >
                    <Text
                      style={[
                        styles.typeText,
                        !form.child_id && styles.typeTextActive,
                      ]}
                    >
                      All children
                    </Text>
                  </TouchableOpacity>
                  {children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.typeButton,
                        form.child_id === child.id && styles.typeButtonActive,
                      ]}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          child_id: child.id,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.typeText,
                          form.child_id === child.id && styles.typeTextActive,
                        ]}
                      >
                        {child.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.typeRow}>
              {(Object.keys(typeLabels) as Contact["contact_type"][]).map(
                (type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      form.contact_type === type && styles.typeButtonActive,
                    ]}
                    onPress={() =>
                      setForm((current) => ({ ...current, contact_type: type }))
                    }
                  >
                    <Text
                      style={[
                        styles.typeText,
                        form.contact_type === type && styles.typeTextActive,
                      ]}
                    >
                      {typeLabels[type]}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!form.name.trim() ||
                    !form.relationship.trim() ||
                    !form.phone.trim() ||
                    saving) &&
                    styles.disabled,
                ]}
                onPress={saveContact}
                disabled={
                  saving ||
                  !form.name.trim() ||
                  !form.relationship.trim() ||
                  !form.phone.trim()
                }
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveText}>Save contact</Text>
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
  content: { padding: 16, paddingBottom: 40 },
  childPicker: { marginTop: 14 },
  pickerLabel: { color: "#607A98", fontSize: 12, fontWeight: "800" },
  sosButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#DC2626",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  incidentReportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    marginBottom: 22,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    backgroundColor: "#EDF7FF",
  },
  incidentReportTitle: { color: "#17365E", fontSize: 14, fontWeight: "800" },
  incidentReportText: {
    color: "#607A98",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  sosCopy: { flex: 1 },
  sosTitle: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  sosText: { color: "#FEE2E2", fontSize: 12, marginTop: 3 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { color: "#17365E", fontSize: 18, fontWeight: "800" },
  muted: { color: "#607A98", fontSize: 12, marginTop: 4 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#159B3A",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  addText: { color: "#FFF", fontWeight: "800" },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    padding: 14,
    marginBottom: 10,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EDF7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  contactCopy: { flex: 1, marginLeft: 11 },
  contactName: { color: "#17365E", fontSize: 15, fontWeight: "800" },
  contactMeta: { color: "#607A98", fontSize: 12, marginTop: 3 },
  center: { paddingVertical: 60, alignItems: "center" },
  empty: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCEAF8",
    borderRadius: 16,
    padding: 26,
  },
  emptyTitle: {
    color: "#17365E",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  modalTitle: { color: "#17365E", fontSize: 20, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#DCEAF8",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    color: "#17365E",
    fontSize: 14,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  typeButton: {
    borderWidth: 1,
    borderColor: "#DCEAF8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  typeButtonActive: { borderColor: "#159B3A", backgroundColor: "#E9F8EE" },
  typeText: { color: "#607A98", fontSize: 11, fontWeight: "700" },
  typeTextActive: { color: "#087C2B" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    borderRadius: 10,
  },
  cancelText: { color: "#607A98", fontWeight: "800" },
  saveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#159B3A",
  },
  saveText: { color: "#FFF", fontWeight: "800" },
  disabled: { opacity: 0.5 },
});
