import React, { useEffect, useState, useContext } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useClientProfile } from "@/app-support/client/clientHelpers/hooks/useClientProfile";
import { resolveWorkingBaseUrl } from "../../../url";
import { AuthContext } from "../../../context/authContext/auth-context";
import GooglePlacesAutoComplete from "../../../components/GooglePlacesAutoComplete";
import AppNotification from "../../../components/Notification";

type ProfileForm = {
  first_name: string;
  last_name: string;
  phone: string;
  alternate_phone: string;
  home_address: string;
  home_latitude: number | null;
  home_longitude: number | null;
  relationship: string;
  relationship_other: string;
};

const emptyForm: ProfileForm = {
  first_name: "",
  last_name: "",
  phone: "",
  alternate_phone: "",
  home_address: "",
  home_latitude: null,
  home_longitude: null,
  relationship: "parent",
  relationship_other: "",
};

const relationshipOptions = [
  { label: "Parent", value: "parent" },
  { label: "Guardian", value: "guardian" },
  { label: "Grandparent", value: "grandparent" },
  { label: "Other", value: "other" },
];

const getProfileValue = (...values: unknown[]) => {
  const value = values.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );
  return typeof value === "string" ? value : "";
};

type ProfileSource = {
  first_name?: string | null;
  firstName?: string | null;
  last_name?: string | null;
  lastName?: string | null;
  phone?: string | null;
  alternate_phone?: string | null;
  alternatePhone?: string | null;
  home_address?: string | null;
  homeAddress?: string | null;
  home_latitude?: number | null;
  homeLatitude?: number | null;
  home_longitude?: number | null;
  homeLongitude?: number | null;
  relationship?: string | null;
  relationship_other?: string | null;
  relationshipOther?: string | null;
  name?: string | null;
  email?: string | null;
};

type ClientProfileSource = ProfileSource & { client?: ProfileSource };
type UserSource = ProfileSource & { userData?: ProfileSource };

const getFormFromProfile = (
  client: ClientProfileSource | null,
  user: UserSource | null,
) => {
  const profile = client?.client || client || {};
  const userData = user?.userData || user || {};
  return {
    first_name: getProfileValue(
      profile.first_name,
      profile.firstName,
      userData.first_name,
      userData.firstName,
      profile.name,
    ),
    last_name: getProfileValue(
      profile.last_name,
      profile.lastName,
      userData.last_name,
      userData.lastName,
    ),
    phone: getProfileValue(profile.phone, userData.phone),
    alternate_phone: getProfileValue(
      profile.alternate_phone,
      profile.alternatePhone,
    ),
    home_address: getProfileValue(profile.home_address, profile.homeAddress),
    home_latitude: profile.home_latitude ?? profile.homeLatitude ?? null,
    home_longitude: profile.home_longitude ?? profile.homeLongitude ?? null,
    relationship: profile.relationship || "parent",
    relationship_other: getProfileValue(
      profile.relationship_other,
      profile.relationshipOther,
    ),
  };
};

const PersonalInformation = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { client, loading, refreshClient } = useClientProfile();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [relationshipPickerVisible, setRelationshipPickerVisible] =
    useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });
  useEffect(() => {
    if (!client || isEditing) return undefined;
    const timeout = setTimeout(
      () => setForm(getFormFromProfile(client, user)),
      0,
    );
    return () => clearTimeout(timeout);
  }, [client, isEditing, user]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const phone = form.phone.replace(/[\s()-]/g, "");
  const alternatePhone = form.alternate_phone.replace(/[\s()-]/g, "");
  const fieldHasError = (field: keyof ProfileForm) => {
    if (!showValidationErrors) return false;

    if (field === "phone") {
      return !/^\+?[0-9]{7,15}$/.test(phone);
    }
    if (field === "alternate_phone") {
      return (
        !/^\+?[0-9]{7,15}$/.test(alternatePhone) || alternatePhone === phone
      );
    }

    const value = form[field];
    return typeof value !== "string" || !value.trim();
  };

  const selectedCoordinates =
    form.home_latitude !== null && form.home_longitude !== null
      ? {
          latitude: form.home_latitude,
          longitude: form.home_longitude,
        }
      : null;

  const mapRegion = {
    ...(selectedCoordinates || {
      latitude: -26.2041,
      longitude: 28.0473,
    }),
    latitudeDelta: selectedCoordinates ? 0.008 : 8,
    longitudeDelta: selectedCoordinates ? 0.008 : 8,
  };

  const handleAddressSelected = (
    address: string,
    coordinates: { latitude: number; longitude: number } | null,
  ) => {
    setForm((current) => ({
      ...current,
      home_address: address,
      home_latitude: coordinates?.latitude ?? null,
      home_longitude: coordinates?.longitude ?? null,
    }));
  };

  const handleMapPress = async (event: {
    nativeEvent: {
      coordinate: { latitude: number; longitude: number };
    };
  }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    setForm((current) => ({
      ...current,
      home_latitude: latitude,
      home_longitude: longitude,
    }));

    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      );
      const data = await response.json();
      const address =
        data.localityInfo?.administrative?.[2]?.name ||
        data.city ||
        `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      setForm((current) => ({ ...current, home_address: address }));
    } catch (error) {
      console.error("Map reverse geocoding failed:", error);
      setForm((current) => ({
        ...current,
        home_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      }));
      showNotification(
        "Pin added. Search the address to replace the coordinate label.",
        "warning",
      );
    }
  };

  const showNotification = (
    message: string,
    type: "success" | "error" | "warning",
  ) => {
    setNotification({ message, type, visible: true });
  };

  const validateForm = () => {
    if (!form.first_name.trim()) return "Enter your first name.";
    if (!form.last_name.trim()) return "Enter your last name.";

    if (!phone) return "Enter your phone number.";
    if (!/^\+?[0-9]{7,15}$/.test(phone)) {
      return "Enter a valid phone number.";
    }

    if (!alternatePhone) return "Enter your alternate phone number.";
    if (alternatePhone && !/^\+?[0-9]{7,15}$/.test(alternatePhone)) {
      return "Enter a valid alternate phone number.";
    }
    if (alternatePhone && alternatePhone === phone) {
      return "Alternate phone number must be different from your primary phone.";
    }

    if (!form.relationship) return "Select your relationship to the child.";
    if (form.relationship === "other" && !form.relationship_other.trim()) {
      return "Specify your relationship to the child.";
    }
    if (!form.home_address.trim())
      return "Search and select your home address.";
    if (form.home_latitude === null || form.home_longitude === null) {
      return "Select your home address from the map search results.";
    }

    return null;
  };

  const saveProfile = async () => {
    setShowValidationErrors(true);
    const validationError = validateForm();
    if (validationError) {
      showNotification(validationError, "warning");
      return;
    }

    if (!user?.token) {
      showNotification(
        "Your session has expired. Please log in again.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to update your information.");
      }

      await refreshClient();
      setShowValidationErrors(false);
      setIsEditing(false);
      showNotification("Your personal information has been saved.", "success");
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Unable to save your information.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && !client) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#C14BFF" />
          <Text style={styles.loadingText}>Loading your information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={23} color="#FBF8FF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Personal Information</Text>
            <Text style={styles.subtitle}>
              {isEditing
                ? "Update your client details"
                : "Your contact and account details"}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              isEditing ? "Cancel editing personal information" : "Edit personal information"
            }
            style={styles.editButton}
            onPress={() => {
              if (isEditing) {
                setForm(getFormFromProfile(client, user));
                setShowValidationErrors(false);
              }
              setIsEditing((current) => !current);
            }}
          >
            <MaterialIcons
              name={isEditing ? "close" : "edit"}
              size={20}
              color="#C14BFF"
            />
            <Text style={styles.editButtonText}>
              {isEditing ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!isEditing ? (
            <>
              <View style={styles.profileSummaryCard}>
                <View style={styles.profileAvatar}>
                  <MaterialIcons name="person" size={30} color="#C14BFF" />
                </View>
                <Text style={styles.profileName}>
                  {[form.first_name, form.last_name].filter(Boolean).join(" ") ||
                    user?.userData?.name ||
                    "Client"}
                </Text>
                <Text style={styles.profileRelationship}>
                  {relationshipOptions.find(
                    (option) => option.value === form.relationship,
                  )?.label || "Parent"}
                </Text>
              </View>
              <Text style={styles.sectionTitle}>Contact information</Text>
              <View style={styles.card}>
                <InfoRow
                  icon="email"
                  label="Email address"
                  value={user?.userData?.email || user?.email || "Not provided"}
                />
                <InfoRow
                  icon="phone"
                  label="Phone number"
                  value={form.phone || "Not provided"}
                />
                <InfoRow
                  icon="phone-android"
                  label="Alternate phone"
                  value={form.alternate_phone || "Not provided"}
                />
              </View>
              <Text style={styles.sectionTitle}>Home address</Text>
              <View style={styles.card}>
                <InfoRow
                  icon="home"
                  label="Address"
                  value={form.home_address || "Not provided"}
                />
              </View>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => setIsEditing(true)}
                accessibilityRole="button"
              >
                <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Edit information</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
          <Text style={styles.sectionTitle}>Basic details</Text>
          <View style={styles.card}>
            <Field
              label="First name"
              required
              error={fieldHasError("first_name")}
              value={form.first_name || user?.userData?.name || ""}
              onChangeText={(value) => updateField("first_name", value)}
            />
            <Field
              label="Last name"
              required
              error={fieldHasError("last_name")}
              value={form.last_name || ""}
              onChangeText={(value) => updateField("last_name", value)}
            />
            <Text style={styles.label}>
              Relationship to child{" "}
              <Text style={styles.requiredMarker}> *</Text>
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Select relationship to child"
              activeOpacity={0.7}
              onPress={() => setRelationshipPickerVisible(true)}
              style={[
                styles.relationshipTrigger,
                showValidationErrors && !form.relationship && styles.inputError,
              ]}
            >
              <Text style={styles.relationshipValue}>
                {relationshipOptions.find(
                  (option) => option.value === form.relationship,
                )?.label || "Select relationship"}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={24}
                color="#B9AFC4"
              />
            </TouchableOpacity>
            {form.relationship === "other" && (
              <View style={styles.otherRelationshipField}>
                <Field
                  label="Specify relationship"
                  required
                  error={fieldHasError("relationship_other")}
                  value={form.relationship_other}
                  onChangeText={(value) =>
                    updateField("relationship_other", value)
                  }
                  placeholder="e.g. Aunt, sibling, or caregiver"
                />
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Contact details</Text>
          <View style={styles.card}>
            <Field
              label="Phone number"
              required
              error={fieldHasError("phone")}
              value={form.phone || user?.userData?.phone || ""}
              onChangeText={(value) => updateField("phone", value)}
              keyboardType="phone-pad"
            />
            <Field
              required
              label="Alternate phone"
              error={fieldHasError("alternate_phone")}
              value={form.alternate_phone || ""}
              onChangeText={(value) => updateField("alternate_phone", value)}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.sectionTitle}>Home address</Text>
          <View style={styles.card}>
            <Text style={styles.label}>
              Search home address <Text style={styles.requiredMarker}> *</Text>
            </Text>
            <View
              style={[
                styles.addressInput,
                showValidationErrors &&
                  (!form.home_address.trim() || !selectedCoordinates) &&
                  styles.inputError,
              ]}
            >
              <GooglePlacesAutoComplete
                value={form.home_address}
                onChangeText={(value) => updateField("home_address", value)}
                onSelect={handleAddressSelected}
                placeholder="Search for your home address"
              />
            </View>
            <MapView
              style={styles.map}
              region={mapRegion}
              onPress={handleMapPress}
            >
              {selectedCoordinates && (
                <Marker coordinate={selectedCoordinates} title="Home address" />
              )}
            </MapView>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={saving}
            onPress={saveProfile}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
            </>
          )}
        </ScrollView>
        <Modal
          visible={relationshipPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setRelationshipPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              accessibilityLabel="Close relationship selector"
              style={styles.modalDismissArea}
              onPress={() => setRelationshipPickerVisible(false)}
            />
            <View style={styles.relationshipSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Relationship to child</Text>
              {relationshipOptions.map((option) => {
                const isSelected = form.relationship === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.7}
                    onPress={() => {
                      updateField("relationship", option.value);
                      setRelationshipPickerVisible(false);
                    }}
                    style={[
                      styles.relationshipOption,
                      isSelected && styles.relationshipOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.relationshipOptionText,
                        isSelected && styles.relationshipOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check" size={22} color="#C14BFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
        <AppNotification
          message={notification.message}
          type={notification.type}
          visible={notification.visible}
          onHide={() => {
            setNotification((current) => ({ ...current, visible: false }));
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Field = ({
  label,
  required = false,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  error = false,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  placeholder?: string;
  error?: boolean;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.requiredMarker}> *</Text>}
    </Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder}
      style={[styles.input, error && styles.inputError]}
      placeholderTextColor="#B9AFC4"
    />
  </View>
);

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
    <View style={styles.infoIcon}>
      <MaterialIcons name={icon} size={18} color="#C14BFF" />
    </View>
    <View style={styles.infoCopy}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

export default PersonalInformation;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#07040B" },
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: "#B9AFC4", fontSize: 13 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#130D1A",
    borderBottomWidth: 1,
    borderBottomColor: "#352341",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerText: { flex: 1 },
  editButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#1C1026",
  },
  editButtonText: { color: "#C14BFF", fontSize: 12, fontWeight: "800" },
  title: { color: "#FBF8FF", fontSize: 18, fontWeight: "800" },
  subtitle: { color: "#B9AFC4", fontSize: 10, marginTop: 3 },
  content: { padding: 20, paddingBottom: 40 },
  profileSummaryCard: {
    alignItems: "center",
    padding: 22,
    marginBottom: 24,
    borderRadius: 20,
    backgroundColor: "#130D1A",
    borderWidth: 1,
    borderColor: "#352341",
  },
  profileAvatar: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 31,
    backgroundColor: "#1C1026",
  },
  profileName: {
    marginTop: 12,
    color: "#FBF8FF",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  profileRelationship: {
    marginTop: 4,
    color: "#B9AFC4",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#FBF8FF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#130D1A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#352341",
    padding: 14,
    marginBottom: 22,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  infoIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1C1026",
  },
  infoCopy: { flex: 1 },
  infoLabel: { color: "#B9AFC4", fontSize: 10, fontWeight: "700" },
  infoValue: {
    marginTop: 3,
    color: "#FBF8FF",
    fontSize: 13,
    fontWeight: "600",
  },
  editProfileButton: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#9B2BE7",
  },
  field: { marginBottom: 13 },
  label: { color: "#B9AFC4", fontSize: 11, fontWeight: "700", marginBottom: 6 },
  requiredMarker: { color: "#DC2626" },
  addressInput: { borderRadius: 9 },
  inputError: { borderColor: "#DC2626" },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 9,
    color: "#FBF8FF",
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: "#130D1A",
  },
  map: {
    height: 190,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 14,
  },
  relationshipTrigger: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#130D1A",
  },
  relationshipValue: { color: "#FBF8FF", fontSize: 13, fontWeight: "600" },
  otherRelationshipField: { marginTop: 14, marginBottom: -2 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modalDismissArea: { flex: 1 },
  relationshipSheet: {
    backgroundColor: "#130D1A",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1C1026",
    marginBottom: 18,
  },
  sheetTitle: {
    color: "#FBF8FF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  relationshipOption: {
    minHeight: 52,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  relationshipOptionSelected: { backgroundColor: "#1C1026" },
  relationshipOptionText: { color: "#B9AFC4", fontSize: 14 },
  relationshipOptionTextSelected: { color: "#C14BFF", fontWeight: "700" },
  saveButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9B2BE7",
    marginTop: 2,
  },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
