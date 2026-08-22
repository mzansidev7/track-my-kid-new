import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/styles/theme";
import { AuthContext } from "@/context/authContext/auth-context";
import { useDriverProfile } from "@/app/(driver)/driverHelpers/hooks/useDriverProfile";
import { resolveWorkingBaseUrl } from "@/url";
import DriverHeader from "@/app/(driver)/components/DriverHeader";
import { validateSouthAfricanId } from "@/utils/saId";
import AppNotification from "@/components/Notification";

type AddressFormData = {
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

type DriverFormData = {
  name: string;
  phone: string;
  email: string;
  dob: string;
  idNumber: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: AddressFormData;
  experience: string;
};

const createAddressValue = (value: unknown): AddressFormData => {
  if (typeof value === "object" && value !== null) {
    const source = value as Record<string, unknown>;
    return {
      street: typeof source.street === "string" ? source.street : "",
      suburb: typeof source.suburb === "string" ? source.suburb : "",
      city: typeof source.city === "string" ? source.city : "",
      province: typeof source.province === "string" ? source.province : "",
      postalCode:
        typeof source.postalCode === "string"
          ? source.postalCode
          : typeof source.postal_code === "string"
            ? source.postal_code
            : "",
      country: typeof source.country === "string" ? source.country : "",
    };
  }

  const text = typeof value === "string" && value.trim() ? value : "";
  return {
    street: text,
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
  };
};

const EditDriverProfile = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);
  const { driver, loading, refreshDriver } = useDriverProfile();
  const [formData, setFormData] = useState<DriverFormData>({
    name: "",
    phone: "",
    email: "",
    dob: "",
    idNumber: "",
    licenseNumber: "",
    licenseExpiry: "",
    address: {
      street: "",
      suburb: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
    },
    experience: "Example: 5 Years",
  });

  const [saving, setSaving] = useState(false);
  const [selectedAvatarUri, setSelectedAvatarUri] = useState<string | null>(
    null,
  );
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle] = useState<string | null>(null);
  const [modalMessage] = useState<string | null>(null);
  const [modalOnConfirm] = useState<(() => void) | null>(null);

  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showLicensePicker, setShowLicensePicker] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifType, setNotifType] = useState<"success" | "error" | "warning">(
    "error",
  );
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  const closeModal = () => {
    setModalVisible(false);
    // call confirm after closing to keep UX predictable
    if (modalOnConfirm) {
      const cb = modalOnConfirm;
      setTimeout(() => cb(), 150);
    }
  };

  useEffect(() => {
    if (!driver) {
      return;
    }

    const resolvedAddress = createAddressValue(driver?.address);

    const resolvedAvatar =
      typeof driver?.avatar === "string"
        ? driver.avatar
        : driver?.avatar?.url || driver?.avatar?.avatar_url || null;

    const normalize = (val: any) => {
      if (!val) return "";
      const iso = ensureIso(typeof val === "string" ? val : String(val));
      return iso || String(val);
    };

    setFormData((prev) => ({
      ...prev,
      name: driver?.user?.name || prev.name,
      phone: driver?.user?.phone || prev.phone,
      email: driver?.user?.email || prev.email,
      dob: normalize(driver?.date_of_birth || prev.dob),
      idNumber: driver?.id_number || prev.idNumber,
      licenseNumber: driver?.vehicle_plate_number || prev.licenseNumber,
      licenseExpiry: normalize(driver?.licence_expiry || prev.licenseExpiry),
      address: resolvedAddress,
      experience: driver?.experience || prev.experience,
    }));

    setAvatarPreviewUri(resolvedAvatar);
    setSelectedAvatarUri(null);
  }, [driver]);

  const handleInputChange = (
    field: keyof DriverFormData,
    value: string | AddressFormData,
  ) => {
    setFormData(
      (prev) =>
        ({
          ...prev,
          [field]: value,
        }) as DriverFormData,
    );
  };

  const renderRequiredLabel = (label: string) => (
    <Text style={[localStyles.fieldLabel, { color: colors.text.primary }]}>
      {label}
      <Text style={localStyles.requiredAsterisk}> *</Text>
    </Text>
  );

  const formatDate = (value: string) => {
    if (!value) return "";
    const iso = ensureIso(value);
    if (!iso) return value;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const ensureIso = (value?: string | null) => {
    if (!value) return null;
    const v = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // Try Date parse
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    // Try parsing DD MMM YYYY e.g. 10 Sep 1990
    const alt = Date.parse(v);
    if (!isNaN(alt)) return new Date(alt).toISOString().slice(0, 10);
    return null;
  };

  const validateRequiredFields = () => {
    const missingFields: string[] = [];

    if (!formData.name.trim()) missingFields.push("Full Name");
    if (!formData.phone.trim()) missingFields.push("Phone Number");
    if (!formData.email.trim()) missingFields.push("Email Address");
    if (!formData.dob.trim()) missingFields.push("Date of Birth");
    if (!formData.idNumber.trim()) missingFields.push("ID Number");
    if (!formData.licenseExpiry.trim())
      missingFields.push("License Expiry Date");
    if (!formData.experience.trim()) missingFields.push("Driving Experience");
    if (!formData.address.street.trim()) missingFields.push("Street Address");
    if (!formData.address.suburb.trim()) missingFields.push("Suburb");
    if (!formData.address.city.trim()) missingFields.push("City");
    if (!formData.address.province.trim()) missingFields.push("Province");
    if (!formData.address.postalCode.trim()) missingFields.push("Postal Code");
    if (!formData.address.country.trim()) missingFields.push("Country");

    if (missingFields.length > 0) {
      const msg = `Please fill in: ${missingFields.join(", ")}`;
      setNotifType("error");
      setNotifMessage(msg);
      setNotifVisible(true);
      return false;
    }

    // Validate South African ID number structure and checksum
    const idValue = formData.idNumber.trim();
    if (idValue) {
      const validation = validateSouthAfricanId(idValue);
      if (!validation.valid) {
        const msg = `ID number appears invalid: ${validation.reasons?.join(", ")}`;
        setNotifType("error");
        setNotifMessage(msg);
        setNotifVisible(true);
        return false;
      }

      // Confirm DOB in ID matches entered DOB (compare YYYY-MM-DD)
      if (formData.dob.trim()) {
        const enteredIso = ensureIso(formData.dob) || null;
        const fromId = validation.dob ? validation.dob.slice(0, 10) : null;
        if (fromId && enteredIso && enteredIso !== fromId) {
          const msg = `DOB (${formatDate(enteredIso)}) does not match DOB in ID (${formatDate(fromId)}).`;
          setNotifType("error");
          setNotifMessage(msg);
          setNotifVisible(true);
          return false;
        }
      }
    }

    return true;
  };

  const handlePickAvatar = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      const msg =
        "Please allow access to your photo library to update your profile picture.";
      setNotifType("error");
      setNotifMessage(msg);
      setNotifVisible(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setSelectedAvatarUri(result.assets[0].uri);
      setAvatarPreviewUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    const baseUrl = await resolveWorkingBaseUrl();

    if (!user?.token) {
      const msg = "You are not signed in.";
      setNotifType("error");
      setNotifMessage(msg);
      setNotifVisible(true);
      return;
    }

    if (!validateRequiredFields()) {
      return;
    }

    try {
      setSaving(true);

      const profilePayload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dob.trim(),
        idNumber: formData.idNumber.trim(),
        licenseExpiry: formData.licenseExpiry.trim(),
        address: {
          street: formData.address.street.trim(),
          suburb: formData.address.suburb.trim(),
          city: formData.address.city.trim(),
          province: formData.address.province.trim(),
          postalCode: formData.address.postalCode.trim(),
          country: formData.address.country.trim(),
        },
        experience: formData.experience.trim(),
      };

      const profileResponse = await fetch(`${baseUrl}/driver/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(profilePayload),
      });

      const profileData = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok) {
        throw new Error(profileData.error || "Failed to update profile.");
      }

      if (selectedAvatarUri) {
        const avatarFileName =
          selectedAvatarUri.split("/").pop() || "avatar.jpg";
        const avatarFileType = avatarFileName.toLowerCase().endsWith("png")
          ? "image/png"
          : "image/jpeg";

        const avatarFormData = new FormData();
        avatarFormData.append("avatar", {
          uri: selectedAvatarUri,
          name: avatarFileName,
          type: avatarFileType,
        } as any);

        const avatarResponse = await fetch(`${baseUrl}/driver/avatar`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
          body: avatarFormData,
        });

        const avatarData = await avatarResponse.json().catch(() => ({}));
        if (!avatarResponse.ok) {
          throw new Error(
            avatarData.error || "Failed to upload profile picture.",
          );
        }
      }

      await refreshDriver();
      setNotifType("success");
      setNotifMessage("Profile updated successfully!");
      setNotifVisible(true);
      setTimeout(() => router.push("/(driver)/(tabs)/profile"), 800);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to update profile.";
      setNotifType("error");
      setNotifMessage(msg);
      setNotifVisible(true);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[localStyles.container, localStyles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        <DriverHeader
          title="Profile"
          subtitle="Manage your profile and account settings"
          showBackButton={true}
        />

        <ScrollView
          contentContainerStyle={[localStyles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          <View style={localStyles.avatarSection}>
            <View style={localStyles.avatarWrapper}>
              <Image
                source={
                  avatarPreviewUri
                    ? { uri: avatarPreviewUri }
                    : require("@/assets/images/driver.png")
                }
                style={localStyles.avatarImage}
              />
            </View>
            <TouchableOpacity
              style={[
                localStyles.avatarButton,
                { borderColor: colors.primary },
              ]}
              onPress={handlePickAvatar}
            >
              <MaterialIcons
                name="photo-camera"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[
                  localStyles.avatarButtonText,
                  { color: colors.primary },
                ]}
              >
                Change Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Personal Information Section */}
          <View style={localStyles.section}>
            <Text style={[localStyles.sectionTitle, { color: colors.primary }]}>
              Personal Information
            </Text>

            <View style={localStyles.formGroup}>
              {renderRequiredLabel("Full Name")}
              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
                value={formData.name}
                onChangeText={(value) => handleInputChange("name", value)}
                placeholder="Enter full name"
                placeholderTextColor={colors.text.secondary}
              />
            </View>

            <View style={localStyles.formGroup}>
              {renderRequiredLabel("Date of Birth")}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.surface,
                    justifyContent: "center",
                  },
                ]}
                onPress={() => setShowDobPicker(true)}
              >
                <Text
                  style={{
                    color: formData.dob
                      ? colors.text.primary
                      : colors.text.secondary,
                  }}
                >
                  {formData.dob
                    ? formatDate(formData.dob)
                    : "Select date of birth"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={localStyles.formGroup}>
              {renderRequiredLabel("ID Number")}
              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
                value={formData.idNumber}
                onChangeText={(value) => handleInputChange("idNumber", value)}
                placeholder="Enter ID number"
                placeholderTextColor={colors.text.secondary}
              />
            </View>

            <View style={localStyles.formGroup}>
              {renderRequiredLabel("Address")}

              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                    marginBottom: 16,
                  },
                ]}
                value={formData.address.street}
                onChangeText={(value) =>
                  handleInputChange("address", {
                    ...formData.address,
                    street: value,
                  })
                }
                placeholder="Street Address"
                placeholderTextColor={colors.text.secondary}
              />

              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                    marginBottom: 16,
                  },
                ]}
                value={formData.address.suburb}
                onChangeText={(value) =>
                  handleInputChange("address", {
                    ...formData.address,
                    suburb: value,
                  })
                }
                placeholder="Suburb"
                placeholderTextColor={colors.text.secondary}
              />

              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                    marginBottom: 16,
                  },
                ]}
                value={formData.address.city}
                onChangeText={(value) =>
                  handleInputChange("address", {
                    ...formData.address,
                    city: value,
                  })
                }
                placeholder="City"
                placeholderTextColor={colors.text.secondary}
              />

              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                    marginBottom: 16,
                  },
                ]}
                value={formData.address.province}
                onChangeText={(value) =>
                  handleInputChange("address", {
                    ...formData.address,
                    province: value,
                  })
                }
                placeholder="Province"
                placeholderTextColor={colors.text.secondary}
              />

              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                    marginBottom: 16,
                  },
                ]}
                value={formData.address.postalCode}
                onChangeText={(value) =>
                  handleInputChange("address", {
                    ...formData.address,
                    postalCode: value,
                  })
                }
                placeholder="Postal Code"
                keyboardType="numeric"
                placeholderTextColor={colors.text.secondary}
              />

              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                    marginBottom: 16,
                  },
                ]}
                value={formData.address.country}
                onChangeText={(value) =>
                  handleInputChange("address", {
                    ...formData.address,
                    country: value,
                  })
                }
                placeholder="Country"
                placeholderTextColor={colors.text.secondary}
              />
            </View>
          </View>

          {/* Contact Information Section */}
          <View style={localStyles.section}>
            <Text style={[localStyles.sectionTitle, { color: colors.primary }]}>
              Contact Information
            </Text>

            <View style={localStyles.formGroup}>
              {renderRequiredLabel("Phone Number")}
              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
                value={formData.phone}
                onChangeText={(value) => handleInputChange("phone", value)}
                placeholder="Enter phone number"
                placeholderTextColor={colors.text.secondary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={localStyles.formGroup}>
              {renderRequiredLabel("Email Address")}
              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
                placeholder="Enter email address"
                placeholderTextColor={colors.text.secondary}
                keyboardType="email-address"
                editable={false}
              />
            </View>
          </View>

          {/* License Information Section */}
          <View style={localStyles.section}>
            <Text style={[localStyles.sectionTitle, { color: colors.primary }]}>
              License Information
            </Text>

            <View style={localStyles.formGroup}>
              {renderRequiredLabel("License Expiry Date")}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.surface,
                    justifyContent: "center",
                  },
                ]}
                onPress={() => setShowLicensePicker(true)}
              >
                <Text
                  style={{
                    color: formData.licenseExpiry
                      ? colors.text.primary
                      : colors.text.secondary,
                  }}
                >
                  {formData.licenseExpiry
                    ? formatDate(formData.licenseExpiry)
                    : "Select expiry date"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={localStyles.formGroup}>
              {renderRequiredLabel("Driving Experience")}
              <TextInput
                style={[
                  localStyles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.text.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
                value={formData.experience}
                onChangeText={(value) => handleInputChange("experience", value)}
                placeholder="e.g., 5 Years"
                placeholderTextColor={colors.text.secondary}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={localStyles.actionsContainer}>
            <TouchableOpacity
              style={[
                localStyles.cancelButton,
                { borderColor: colors.primary },
              ]}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Text
                style={[
                  localStyles.cancelButtonText,
                  { color: colors.primary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={localStyles.saveButtonGradient}
            >
              <TouchableOpacity
                style={localStyles.saveButton}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={18} color="#fff" />
                    <Text style={localStyles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Date pickers (rendered outside ScrollView so Android modal works reliably) */}
      {showDobPicker && (
        <DateTimePicker
          value={formData.dob ? new Date(formData.dob) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setShowDobPicker(Platform.OS === "ios");
            if (selected) {
              handleInputChange("dob", selected.toISOString());
            }
          }}
        />
      )}

      {showLicensePicker && (
        <DateTimePicker
          value={
            formData.licenseExpiry
              ? new Date(formData.licenseExpiry)
              : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selected) => {
            setShowLicensePicker(Platform.OS === "ios");
            if (selected) {
              handleInputChange("licenseExpiry", selected.toISOString());
            }
          }}
        />
      )}
      <AppNotification
        message={notifMessage ?? ""}
        type={notifType}
        visible={notifVisible}
        onHide={() => setNotifVisible(false)}
      />

      {modalVisible && (
        <View style={localStyles.modalOverlay}>
          <View style={[localStyles.modalCard, { borderColor: colors.border }]}>
            <Text
              style={[localStyles.modalTitle, { color: colors.text.primary }]}
            >
              {modalTitle}
            </Text>
            <Text
              style={[
                localStyles.modalMessage,
                { color: colors.text.secondary },
              ]}
            >
              {modalMessage}
            </Text>
            <View style={localStyles.modalActions}>
              <TouchableOpacity
                style={[
                  localStyles.modalButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.text.secondary }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  localStyles.modalPrimaryButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={closeModal}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  avatarButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: "#EF4444",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  saveButtonGradient: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  saveButton: {
    flexDirection: "row",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(2,6,23,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 14,
    padding: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  modalPrimaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default EditDriverProfile;
