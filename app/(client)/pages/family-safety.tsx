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
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useChildren } from "@/app-support/client/clientHelpers/hooks/useChildren";
import ClientHeader from "../components/ClientHeader";

type Contact = {
  id: string;
  child_id?: string | null;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  contact_type: "family" | "authorized_pickup" | "emergency";
  is_emergency_contact?: boolean;
  authorized_child_ids?: string[];
  authorized_child_names?: string[];
  invitation_status?: "not_invited" | "pending" | "accepted" | "declined" | "revoked";
  authorization_valid_until?: string | null;
  revoked_at?: string | null;
};

const typeLabels = {
  family: "Family / guardian",
  authorized_pickup: "Authorized pickup",
  emergency: "Emergency contact",
};

const dateFromKey = (date: string) => new Date(`${date}T12:00:00`);

const dateToKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [form, setForm] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
    contact_type: "family" as "family" | "emergency",
    child_id: "",
    addPickupAuthorization: false,
    child_ids: [] as string[],
    authorization_valid_until: "",
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
    const isPickupAuthorization = form.addPickupAuthorization;
    const existingPickupContact = contacts.find(
      (contact) =>
        contact.email?.trim().toLowerCase() ===
        form.email.trim().toLowerCase(),
    );
    if (
      !user?.token ||
      !form.name.trim() ||
      !form.relationship.trim() ||
      !form.phone.trim() ||
      (isPickupAuthorization &&
        (!form.email.trim() || !form.child_ids.length))
    )
      return;
    setSaving(true);
    let contactSaved = false;
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/client/contacts`,
        {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          relationship: form.relationship.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          contact_type: form.contact_type,
          child_id: form.child_id || null,
          authorization_valid_until:
            form.authorization_valid_until.trim() || null,
        }),
        },
      );
      let data = await response.json();
      if (!response.ok) {
        const errorMessage =
          data.error === "CONTACT_DETAILS_REQUIRED" &&
          Array.isArray(data.missing_fields)
            ? `Missing or invalid contact details: ${data.missing_fields.join(", ")}`
            : data.details || data.error || "Unable to save contact.";
        if (data.contact) {
          setContacts((current) => [...current, data.contact]);
          setModalVisible(false);
          setForm({
            name: "",
            relationship: "",
            phone: "",
            email: "",
            contact_type: "family",
            child_id: "",
            addPickupAuthorization: false,
            child_ids: [],
            authorization_valid_until: "",
          });
        }
        throw new Error(errorMessage);
      }
      contactSaved = true;
      if (isPickupAuthorization) {
        const pickupResponse = await fetch(
          `${baseUrl}/client/pickup-contacts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${user.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: form.name.trim(),
              relationship: form.relationship.trim(),
              phone: form.phone.trim(),
              email: form.email.trim(),
              child_ids: form.child_ids,
              authorization_valid_until:
                form.authorization_valid_until.trim() || null,
            }),
          },
        );
        data = await pickupResponse.json();
        if (!pickupResponse.ok) {
          throw new Error(
            data.details || data.error || "Unable to authorize pickup.",
          );
        }
      }
      setContacts((current) =>
        current.some((contact) => contact.id === data.id)
          ? current.map((contact) => (contact.id === data.id ? data : contact))
          : [...current, data],
      );
      setModalVisible(false);
      setForm({
        name: "",
        relationship: "",
        phone: "",
        email: "",
        contact_type: "family",
        child_id: "",
        addPickupAuthorization: false,
        child_ids: [],
        authorization_valid_until: "",
      });
      if (isPickupAuthorization) {
        if (
          existingPickupContact?.invitation_status === "accepted" &&
          data.invitation_status === "accepted"
        ) {
          Alert.alert(
            "Pickup access updated",
            "The contact can now collect the selected children.",
          );
        } else {
          Alert.alert(
            data.invitation_status === "accepted"
              ? "Temporary login sent"
              : "Invitation sent",
            data.invitation_status === "accepted"
              ? `Temporary login details were sent to ${data.email}. They will receive an OTP after signing in.`
              : `An invitation was sent to ${data.email}.`,
          );
        }
      }
      await loadContacts();
    } catch (error) {
      if (contactSaved) await loadContacts();
      const credentialEmailFailed =
        error instanceof Error &&
        error.message === "PICKUP_CREDENTIAL_EMAIL_FAILED";
      const invitationEmailFailed =
        error instanceof Error &&
        error.message === "PICKUP_INVITATION_EMAIL_FAILED";
      const message =
        error instanceof Error ? error.message : "Please try again.";
      Alert.alert(
        contactSaved
          ? credentialEmailFailed
            ? "Contact saved, login email not sent"
            : "Contact saved, pickup access not added"
          : invitationEmailFailed
            ? "Contact saved, invitation not sent"
            : credentialEmailFailed
            ? "Login email not sent"
            : "Unable to save contact",
        contactSaved && credentialEmailFailed
          ? "The contact remains saved. Use Send login details to retry."
          : invitationEmailFailed
            ? "The contact was saved, but the invitation email could not be delivered. Use Resend invitation to try again."
            : credentialEmailFailed
              ? "The account setup was rolled back because the temporary login email could not be delivered. Use Send login details to retry."
              : message,
      );
    } finally {
      setSaving(false);
    }
  };

  const resendInvitation = async (contact: Contact) => {
    if (!user?.token) return;
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/client/pickup-contacts/${contact.id}/invitation`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to send the invitation.");
      setContacts((current) =>
        current.map((item) => (item.id === contact.id ? data : item)),
      );
      Alert.alert(
        data.invitation_status === "accepted"
          ? "Temporary login sent"
          : "Invitation sent",
        data.invitation_status === "accepted"
          ? `Temporary login details were sent to ${contact.email}. They will receive an OTP after signing in.`
          : `An invitation was sent to ${contact.email}.`,
      );
    } catch (error) {
      Alert.alert(
        "Invitation not sent",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const generatePickupPin = async (contact: Contact) => {
    if (!user?.token) return;
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/client/pickup-contacts/${contact.id}/pin`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to generate a pickup PIN.");
      Alert.alert(
        "Temporary pickup PIN",
        `Share this one-use PIN with ${contact.name}: ${data.pin}\n\nIt expires at ${new Date(data.expires_at).toLocaleTimeString()}. It will only be shown once.`,
      );
    } catch (error) {
      Alert.alert(
        "PIN not generated",
        error instanceof Error ? error.message : "Please try again.",
      );
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
            try {
              const baseUrl = await resolveWorkingBaseUrl();
              const response = await fetch(
                `${baseUrl}/client/contacts/${contact.id}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${user.token}` },
                },
              );
              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Unable to remove contact.");
              }
              setContacts((current) =>
                current.filter((item) => item.id !== contact.id),
              );
            } catch (error) {
              Alert.alert(
                "Unable to remove contact",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
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
        onBackPress={() => router.replace("/(client)/(tabs)/profile")}
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
          <MaterialIcons name="report-problem" size={22} color="#C14BFF" />
          <View style={styles.sosCopy}>
            <Text style={styles.incidentReportTitle}>
              Report a transport incident
            </Text>
            <Text style={styles.incidentReportText}>
              Send a safety, route, vehicle, or student concern to the school.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#C14BFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.incidentReportButton}
          onPress={() => router.push("/pickup-contact" as never)}
        >
          <MaterialIcons name="verified-user" size={22} color="#C14BFF" />
          <View style={styles.sosCopy}>
            <Text style={styles.incidentReportTitle}>Pickup access for me</Text>
            <Text style={styles.incidentReportText}>
              View children another family has authorized you to collect.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#C14BFF" />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View style={styles.contactsHeading}>
            <Text style={styles.sectionTitle}>Your contacts</Text>
            <Text style={styles.muted} numberOfLines={2}>
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
            <ActivityIndicator color="#C14BFF" />
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
                    contact.contact_type === "emergency" ||
                    contact.is_emergency_contact
                      ? "emergency"
                      : contact.contact_type === "authorized_pickup"
                        ? "directions-car"
                        : "person"
                  }
                  size={22}
                  color="#C14BFF"
                />
              </View>
              <View style={styles.contactCopy}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactMeta}>
                  {[
                    contact.contact_type === "family" && typeLabels.family,
                    (contact.contact_type === "emergency" ||
                      contact.is_emergency_contact) &&
                      typeLabels.emergency,
                    (contact.contact_type === "authorized_pickup" ||
                      contact.authorized_child_ids?.length) &&
                      typeLabels.authorized_pickup,
                  ]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  · {contact.relationship}
                </Text>
                <Text style={styles.contactMeta}>
                  {contact.phone}
                  {contact.email ? ` · ${contact.email}` : ""}
                </Text>
                {!!contact.authorized_child_names?.length && (
                  <Text style={styles.contactMeta}>
                    Pickup for: {contact.authorized_child_names.join(", ")}
                  </Text>
                )}
                {contact.contact_type === "authorized_pickup" && (
                  <Text style={styles.contactMeta}>
                    {contact.invitation_status === "accepted"
                      ? "Pickup authorization active"
                      : contact.invitation_status === "revoked"
                        ? "Authorization revoked"
                        : contact.invitation_status === "not_invited"
                          ? "Not invited"
                          : "Invitation pending"}
                    {contact.authorization_valid_until
                      ? ` · Until ${contact.authorization_valid_until}`
                      : ""}
                  </Text>
                )}
                {contact.contact_type === "authorized_pickup" &&
                  contact.invitation_status === "accepted" &&
                  !contact.revoked_at && (
                    <TouchableOpacity
                      onPress={() => generatePickupPin(contact)}
                      style={styles.pinButton}
                    >
                      <Text style={styles.pinButtonText}>
                        Generate one-use pickup PIN
                      </Text>
                    </TouchableOpacity>
                  )}
                {contact.contact_type === "authorized_pickup" &&
                  ["pending", "not_invited"].includes(
                    contact.invitation_status || "",
                  ) &&
                  contact.email &&
                  contact.child_id && (
                    <TouchableOpacity
                      onPress={() => resendInvitation(contact)}
                      style={styles.pinButton}
                    >
                      <Text style={styles.pinButtonText}>
                        {contact.invitation_status === "not_invited"
                          ? "Send login details"
                          : "Resend invitation"}
                      </Text>
                    </TouchableOpacity>
                  )}
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
            <Text style={styles.modalTitle}>
              {form.addPickupAuthorization
                ? "Add contact and pickup access"
                : "Add safety contact"}
            </Text>
            <Text style={styles.muted}>
              {form.addPickupAuthorization
                ? "Select one or more children. Email is required for pickup access."
                : "Add this person to your family or emergency contacts."}
            </Text>
            {(["name", "relationship", "phone", "email"] as const).map(
              (field) => (
                <TextInput
                  key={field}
                  style={styles.input}
                  placeholderTextColor="#B9AFC4"
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
                          : form.addPickupAuthorization
                            ? "Email address (required)"
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
            <TouchableOpacity
              style={[
                styles.typeButton,
                form.addPickupAuthorization && styles.typeButtonActive,
              ]}
              onPress={() =>
                setForm((current) => ({
                  ...current,
                  addPickupAuthorization: !current.addPickupAuthorization,
                  child_id: current.addPickupAuthorization ? current.child_id : "",
                  child_ids: current.addPickupAuthorization
                    ? []
                    : current.child_ids,
                }))
              }
            >
              <Text
                style={[
                  styles.typeText,
                  form.addPickupAuthorization && styles.typeTextActive,
                ]}
              >
                {form.addPickupAuthorization
                  ? "✓ Trusted pickup access"
                  : "＋ Also authorize pickup"}
              </Text>
            </TouchableOpacity>
            {children.length > 0 && (
              <View style={styles.childPicker}>
                <Text style={styles.pickerLabel}>
                  {form.addPickupAuthorization
                    ? "Authorized to collect"
                    : "Applies to"}
                </Text>
                <View style={styles.typeRow}>
                  {!form.addPickupAuthorization && (
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
                  )}
                  {children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.typeButton,
                        (form.addPickupAuthorization
                          ? form.child_ids.includes(child.id)
                          : form.child_id === child.id) &&
                          styles.typeButtonActive,
                      ]}
                      onPress={() =>
                        setForm((current) =>
                          current.addPickupAuthorization
                            ? {
                                ...current,
                                child_ids: current.child_ids.includes(child.id)
                                  ? current.child_ids.filter(
                                      (id) => id !== child.id,
                                    )
                                  : [...current.child_ids, child.id],
                              }
                            : { ...current, child_id: child.id },
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.typeText,
                          (form.addPickupAuthorization
                            ? form.child_ids.includes(child.id)
                            : form.child_id === child.id) &&
                            styles.typeTextActive,
                        ]}
                      >
                        {child.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {form.addPickupAuthorization && (
              <View style={styles.expiryDateSection}>
                <Text style={styles.pickerLabel}>Authorization expiry</Text>
                <View style={styles.expiryDateActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={
                      form.authorization_valid_until
                        ? `Authorization expires ${form.authorization_valid_until}`
                        : "Choose authorization expiry date"
                    }
                    style={styles.expiryDateButton}
                    onPress={() =>
                      setShowExpiryDatePicker((visible) => !visible)
                    }
                  >
                    <MaterialIcons
                      name="calendar-today"
                      size={18}
                      color="#C14BFF"
                    />
                    <Text style={styles.expiryDateText}>
                      {form.authorization_valid_until
                        ? dateFromKey(
                            form.authorization_valid_until,
                          ).toLocaleDateString()
                        : "No expiry date"}
                    </Text>
                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={20}
                      color="#B9AFC4"
                    />
                  </TouchableOpacity>
                  {form.authorization_valid_until ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Clear authorization expiry date"
                      style={styles.clearExpiryButton}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          authorization_valid_until: "",
                        }))
                      }
                    >
                      <Text style={styles.clearExpiryText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {showExpiryDatePicker && (
                  <DateTimePicker
                    value={
                      form.authorization_valid_until
                        ? dateFromKey(form.authorization_valid_until)
                        : new Date()
                    }
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(_event, date) => {
                      setShowExpiryDatePicker(false);
                      if (date) {
                        setForm((current) => ({
                          ...current,
                          authorization_valid_until: dateToKey(date),
                        }));
                      }
                    }}
                  />
                )}
              </View>
            )}
            <View style={styles.typeRow}>
              {(["family", "emergency"] as const).map(
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
                  (form.addPickupAuthorization &&
                    (!form.email.trim() || !form.child_ids.length)) ||
                  saving) &&
                    styles.disabled,
                ]}
                onPress={saveContact}
                disabled={
                  saving ||
                  !form.name.trim() ||
                  !form.relationship.trim() ||
                  !form.phone.trim() ||
                  (form.addPickupAuthorization &&
                    (!form.email.trim() || !form.child_ids.length))
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
  safe: { flex: 1, backgroundColor: "#07040B" },
  content: { padding: 16, paddingBottom: 40 },
  childPicker: { marginTop: 14 },
  pickerLabel: { color: "#B9AFC4", fontSize: 11, fontWeight: "800" },
  expiryDateSection: { marginTop: 14 },
  expiryDateActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  expiryDateButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#130D1A",
  },
  expiryDateText: { flex: 1, color: "#FBF8FF", fontSize: 13 },
  clearExpiryButton: { paddingVertical: 10, paddingHorizontal: 4 },
  clearExpiryText: { color: "#C14BFF", fontSize: 12, fontWeight: "800" },
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
    borderColor: "#352341",
    backgroundColor: "#1C1026",
  },
  incidentReportTitle: { color: "#FBF8FF", fontSize: 13, fontWeight: "800" },
  incidentReportText: {
    color: "#B9AFC4",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  sosCopy: { flex: 1 },
  sosTitle: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  sosText: { color: "#FEE2E2", fontSize: 11, marginTop: 3 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  contactsHeading: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  sectionTitle: { color: "#FBF8FF", fontSize: 15, fontWeight: "800" },
  muted: { color: "#B9AFC4", fontSize: 11, marginTop: 4 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#9B2BE7",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexShrink: 0,
  },
  addText: { color: "#FFF", fontWeight: "800" },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#130D1A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#352341",
    padding: 14,
    marginBottom: 10,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#1C1026",
    alignItems: "center",
    justifyContent: "center",
  },
  contactCopy: { flex: 1, marginLeft: 11 },
  contactName: { color: "#FBF8FF", fontSize: 14, fontWeight: "800" },
  contactMeta: { color: "#B9AFC4", fontSize: 11, marginTop: 3 },
  pinButton: { alignSelf: "flex-start", marginTop: 7 },
  pinButtonText: { color: "#C14BFF", fontSize: 11, fontWeight: "800" },
  center: { paddingVertical: 60, alignItems: "center" },
  empty: {
    alignItems: "center",
    backgroundColor: "#130D1A",
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 16,
    padding: 26,
  },
  emptyTitle: {
    color: "#FBF8FF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  modal: {
    backgroundColor: "#130D1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  modalTitle: { color: "#FBF8FF", fontSize: 17, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#130D1A",
    color: "#FBF8FF",
    fontSize: 13,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  typeButton: {
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  typeButtonActive: { borderColor: "#C14BFF", backgroundColor: "#1C1026" },
  typeText: { color: "#B9AFC4", fontSize: 11, fontWeight: "700" },
  typeTextActive: { color: "#C14BFF" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 10,
  },
  cancelText: { color: "#B9AFC4", fontWeight: "800" },
  saveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#9B2BE7",
  },
  saveText: { color: "#FFF", fontWeight: "800" },
  disabled: { opacity: 0.5 },
});
