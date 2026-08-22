import React, { useEffect, useState, useContext } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useClientProfile } from "../clientHelpers/hooks/useClientProfile";
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
};

const PersonalInformation = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { client, loading, refreshClient } = useClientProfile();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  useEffect(() => {
    if (!client) return;

    setForm({
      first_name: client.first_name || user?.userData?.first_name || "",
      last_name: client.last_name || user?.userData?.last_name || "",
      phone: client.phone || user?.userData?.phone || "",
      alternate_phone: client.alternate_phone || "",
      home_address: client.home_address || "",
      home_latitude: client.home_latitude ?? null,
      home_longitude: client.home_longitude ?? null,
      relationship: client.relationship || "parent",
    });
  }, [client, user]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
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

    const phone = form.phone.replace(/[\s()-]/g, "");
    if (!phone) return "Enter your phone number.";
    if (!/^\+?[0-9]{7,15}$/.test(phone)) {
      return "Enter a valid phone number.";
    }

    const alternatePhone = form.alternate_phone.replace(/[\s()-]/g, "");
    if (alternatePhone && !/^\+?[0-9]{7,15}$/.test(alternatePhone)) {
      return "Enter a valid alternate phone number.";
    }
    if (alternatePhone && alternatePhone === phone) {
      return "Alternate phone number must be different from your primary phone.";
    }

    if (!form.relationship) return "Select your relationship to the child.";
    if (!form.home_address.trim())
      return "Search and select your home address.";
    if (form.home_latitude === null || form.home_longitude === null) {
      return "Select your home address from the map search results.";
    }

    return null;
  };

  const saveProfile = async () => {
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
          <ActivityIndicator size="small" color="#2563EB" />
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
            <MaterialIcons name="arrow-back" size={23} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Personal Information</Text>
            <Text style={styles.subtitle}>
              Keep your client details up to date
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Basic details</Text>
          <View style={styles.card}>
            <Field
              label="First name"
              value={form.first_name || ""}
              onChangeText={(value) => updateField("first_name", value)}
            />
            <Field
              label="Last name"
              value={form.last_name || ""}
              onChangeText={(value) => updateField("last_name", value)}
            />
            <Text style={styles.label}>Relationship to child</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.relationship || client?.relationship}
                onValueChange={(value) => updateField("relationship", value)}
              >
                <Picker.Item label="Parent" value="parent" />
                <Picker.Item label="Guardian" value="guardian" />
                <Picker.Item label="Grandparent" value="grandparent" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Contact details</Text>
          <View style={styles.card}>
            <Field
              label="Phone number"
              value={form.phone || ""}
              onChangeText={(value) => updateField("phone", value)}
              keyboardType="phone-pad"
            />
            <Field
              label="Alternate phone"
              value={form.alternate_phone || ""}
              onChangeText={(value) => updateField("alternate_phone", value)}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.sectionTitle}>Home address</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Search home address</Text>
            <GooglePlacesAutoComplete
              value={form.home_address}
              onChangeText={(value) => updateField("home_address", value)}
              onSelect={handleAddressSelected}
              placeholder="Search for your home address"
            />
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
        </ScrollView>
        <AppNotification
          message={notification.message}
          type={notification.type}
          visible={notification.visible}
          onHide={() => {
            const wasSuccessful = notification.type === "success";
            setNotification((current) => ({ ...current, visible: false }));
            if (wasSuccessful) router.back();
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Field = ({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={styles.input}
      placeholderTextColor="#94A3B8"
    />
  </View>
);

export default PersonalInformation;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: "#64748B", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerText: { flex: 1 },
  title: { color: "#0F172A", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 12, marginTop: 3 },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 22,
  },
  field: { marginBottom: 13 },
  label: { color: "#475569", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 9,
    color: "#0F172A",
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },
  map: {
    height: 190,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 9,
    overflow: "hidden",
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    marginTop: 2,
  },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
