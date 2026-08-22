import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../../../styles/theme";
import { AuthContext } from "../../../../context/authContext/auth-context";
import LocationPicker from "../../../../components/LocationPicker.native";
import GooglePlacesAutoComplete from "../../../../components/GooglePlacesAutoComplete";
import AppNotification from "../../../../components/Notification";
import { resolveWorkingBaseUrl } from "@/url";
import { useChildren } from "../../clientHelpers/hooks/useChildren";
import { useClientProfile } from "../../clientHelpers/hooks/useClientProfile";

const AddChildScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);
  const { schools, children: existingChildren, schoolsLoading, childrenLoading } = useChildren();
  const { client } = useClientProfile();


  const [formValues, setFormValues] = useState({
    name: "",
    lastname: "",
    grade: "",
    school_name: "",
    school_address: "",
    school_id: "",
    school_latitude: null,
    school_longitude: null,
    vehicle_id: "",
  });

  const [avatar, setAvatar] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [childNameQuery, setChildNameQuery] = useState("");
  const [showChildSuggestions, setShowChildSuggestions] = useState(false);
  const [schoolSelectionLocked, setSchoolSelectionLocked] = useState(false);
  const [locationPickerResetKey, setLocationPickerResetKey] = useState(0);
  const [pickupLocation, setPickupLocation] = useState({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [dropoffLocation, setDropoffLocation] = useState({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [loading, setLoading] = useState(false);
  const [profileNotification, setProfileNotification] = useState({
    visible: false,
    message: "",
    type: "warning",
  });

  const [assignedVehicleOptions, setAssignedVehicleOptions] = useState([]);

  const showNotification = (message, type) => {
    setProfileNotification({ visible: true, message, type });
  };

  useEffect(() => {
    const vehicles = existingChildren
      .map((child) => child.vehicle)
      .filter(Boolean)
      .reduce((acc, vehicle) => {
        if (!acc.some((item) => item.id === vehicle.id)) {
          acc.push(vehicle);
        }
        return acc;
      }, []);

    setAssignedVehicleOptions(vehicles);
  }, [existingChildren]);

  useEffect(() => {
    if (!client) return;

    setFormValues((current) => ({
      ...current,
      lastname: current.lastname || client.last_name || "",
    }));

    setPickupLocation((current) => ({
      address: current.address || client.home_address || "",
      latitude: current.latitude ?? client.home_latitude ?? null,
      longitude: current.longitude ?? client.home_longitude ?? null,
    }));
  }, [client]);

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showNotification(
          "Camera roll access is required to select an avatar.",
          "warning",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking avatar:", error);
      showNotification("Unable to select avatar.", "error");
    }
  };

  const uploadChildAvatar = async (uri) => {
    setAvatarUploading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const fileName = uri.split("/").pop() || `child-${Date.now()}.jpg`;
      const lowerName = fileName.toLowerCase();
      const contentType = lowerName.endsWith(".png")
        ? "image/png"
        : lowerName.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";

      const formData = new FormData();
      formData.append("avatar", {
        uri,
        name: fileName,
        type: contentType,
      });

      const uploadResponse = await fetch(
        `${baseUrl}/client/upload-child-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
          body: formData,
        },
      );

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(
          uploadData.error || uploadData.message || "Unable to upload avatar.",
        );
      }

      return uploadData.avatarUrl || uploadData.url || null;
    } finally {
      setAvatarUploading(false);
    }
  };

  const resetChildForm = () => {
    setFormValues({
      name: "",
      lastname: client?.last_name || "",
      grade: "",
      school_name: "",
      school_address: "",
      school_id: "",
      school_latitude: null,
      school_longitude: null,
      vehicle_id: "",
    });
    setAvatar(null);
    setSchoolQuery("");
    setShowSchoolSuggestions(false);
    setChildNameQuery("");
    setShowChildSuggestions(false);
    setPickupLocation({
      address: client?.home_address || "",
      latitude: client?.home_latitude ?? null,
      longitude: client?.home_longitude ?? null,
    });
    setDropoffLocation({ address: "", latitude: null, longitude: null });
    setLocationPickerResetKey((prev) => prev + 1);
  };

  const handleAddChild = async () => {
    const phone = (client?.phone || "").replace(/[\s()-]/g, "");
    const profileComplete = Boolean(
      client?.first_name?.trim() &&
        client?.last_name?.trim() &&
        /^\+?[0-9]{7,15}$/.test(phone) &&
        client?.relationship &&
        client?.home_address?.trim() &&
        client?.home_latitude !== null &&
        client?.home_latitude !== undefined &&
        client?.home_longitude !== null &&
        client?.home_longitude !== undefined,
    );

    if (!profileComplete) {
      setProfileNotification({
        visible: true,
        message: "Please complete your personal information before adding a child.",
        type: "warning",
      });
      return;
    }

    if (!formValues.name.trim()) {
      return showNotification("Please enter your child's first name.", "warning");
    }
    if (!formValues.lastname.trim()) {
      return showNotification("Please enter your child's last name.", "warning");
    }
    if (!formValues.grade.trim()) {
      return showNotification("Please enter your child's grade.", "warning");
    }
    if (!formValues.school_name.trim()) {
      return showNotification("Please enter your child's school name.", "warning");
    }

    setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const selectedSchoolLatitude =
        formValues.school_latitude ?? dropoffLocation.latitude ?? null;
      const selectedSchoolLongitude =
        formValues.school_longitude ?? dropoffLocation.longitude ?? null;
      const selectedSchoolAddress =
        dropoffLocation.address?.trim() ||
        formValues.school_address?.trim() ||
        null;

      let avatarUrl = null;
      if (avatar) {
        avatarUrl = await uploadChildAvatar(avatar);
      }

      const response = await fetch(`${baseUrl}/client/children`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: formValues.name.trim(),
          lastname: formValues.lastname.trim(),
          grade: formValues.grade.trim(),
          school_id: formValues.school_id || null,
          school_name: formValues.school_name.trim(),
          school_address: selectedSchoolAddress,
          school_latitude: selectedSchoolLatitude,
          school_longitude: selectedSchoolLongitude,
          pickup_latitude: pickupLocation.latitude,
          pickup_longitude: pickupLocation.longitude,
          dropoff_latitude: selectedSchoolLatitude,
          dropoff_longitude: selectedSchoolLongitude,
          vehicle_id: formValues.vehicle_id || null,
          avatar: avatarUrl || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to add child.");
      }

      showNotification("Your child was added successfully.", "success");
      resetChildForm();
      router.replace("/(client)/(tabs)/children");
    } catch (error) {
      console.error("Add child error:", error);
      showNotification(
        error?.message || "Unable to add child. Please try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputField = (
    key,
    label,
    placeholder,
    icon,
    required = true,
    onChangeTextOverride = null,
    valueOverride = null,
  ) => (
    <View key={key} style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={20}
          color={colors.text.secondary}
          style={styles.inputIcon}
        />
        <TextInput
          value={valueOverride !== null ? valueOverride : formValues[key] || ""}
          onChangeText={(value) => {
            if (onChangeTextOverride) {
              onChangeTextOverride(value);
            } else {
              setFormValues((prev) => ({ ...prev, [key]: value }));
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          style={[styles.input, { color: colors.text.primary }]}
        />
      </View>
    </View>
  );

  const normalizedSchoolQuery = (schoolQuery || "").trim();

  const filteredSchools = normalizedSchoolQuery
    ? schools.filter((school) =>
        school?.name?.toLowerCase().includes(normalizedSchoolQuery.toLowerCase()),
      )
    : schools.slice(0, 8);

  const shouldShowSchoolAutocomplete =
    showSchoolSuggestions &&
    normalizedSchoolQuery.length >= 1 &&
    !schoolSelectionLocked;

  const isKnownSchoolSelected =
    Boolean(formValues.school_id) &&
    schools.some((school) => school?.id === formValues.school_id);

  const selectedSchoolNameForLookup = (formValues.school_name || "").trim();

  const matchingExistingChildren = existingChildren.length > 0 ? existingChildren : [];

  const filteredChildren =
    formValues.school_id && (childNameQuery || "").trim()
      ? existingChildren.filter((child) => {
          const childSchoolName = (child.school_name || "").toLowerCase();
          const selectedSchoolName = (
            formValues.school_name || ""
          ).toLowerCase();
          const matchesSchool = childSchoolName === selectedSchoolName;
          if (!matchesSchool) return false;

          const childName = `${child.name || ""} ${child.lastname || ""}`
            .trim()
            .toLowerCase();
          return childName.includes(
            (childNameQuery || "").trim().toLowerCase(),
          );
        })
      : [];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text
                style={[styles.headerTitle, { color: colors.text.primary }]}
              >
                Add Child
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: colors.text.secondary },
                ]}
              >
                Add your child&apos;s details
              </Text>
            </View>
            <MaterialCommunityIcons
              name="account-circle"
              size={40}
              color={colors.primary}
            />
          </View>

          {/* Safety Banner */}
          <View style={[styles.banner, { backgroundColor: "#F3E8FF" }]}>
            <View style={styles.bannerContent}>
              <MaterialCommunityIcons name="shield" size={32} color="#7C3AED" />
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: "#1E1B4B" }]}>
                  Your child&apos;s safety is our priority
                </Text>
                <Text style={[styles.bannerDesc, { color: "#6B7280" }]}>
                  Provide accurate information to ensure a smooth and safe trip.
                </Text>
              </View>
            </View>
            <View style={styles.bannerIllustration}>
              <MaterialCommunityIcons name="school" size={50} color="#A78BFA" />
            </View>
          </View>

          {matchingExistingChildren.length > 0 && (
            <View style={[styles.section, { marginBottom: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                {`Use child information : "Todo"`}
              </Text>
              {matchingExistingChildren.map((child) => {
                const childDisplayName =
                  `${child.name || ""} ${child.lastname || ""}`.trim() ||
                  "Existing child";

                return (
                  <TouchableOpacity
                    key={child.id || childDisplayName}
                    style={[
                      styles.schoolItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        marginTop: 8,
                      },
                    ]}
                    onPress={() => {
                      const reusedSchoolLatitude =
                        child.school_latitude ??
                        child.school_location?.latitude ??
                        null;
                      const reusedSchoolLongitude =
                        child.school_longitude ??
                        child.school_location?.longitude ??
                        null;
                      const reusedSchoolAddress =
                        child.school_address ||
                        child.school_location?.address ||
                        child.school_name ||
                        "";
                      const reusedPickupLatitude =
                        child.pickup_latitude ?? reusedSchoolLatitude ?? null;
                      const reusedPickupLongitude =
                        child.pickup_longitude ?? reusedSchoolLongitude ?? null;
                      const reusedDropoffLatitude =
                        child.dropoff_latitude ?? reusedSchoolLatitude ?? null;
                      const reusedDropoffLongitude =
                        child.dropoff_longitude ?? reusedSchoolLongitude ?? null;

                      setFormValues((prev) => ({
                        ...prev,
                        lastname: child.lastname || prev.lastname,
                        school_name: child.school_name || prev.school_name,
                        school_address: reusedSchoolAddress,
                        school_id: child.school_id || prev.school_id,
                        school_latitude: reusedSchoolLatitude,
                        school_longitude: reusedSchoolLongitude,
                        vehicle_id: child.vehicle_id || prev.vehicle_id,
                      }));

                      setSchoolQuery(child.school_name || formValues.school_name || "");
                      setDropoffLocation({
                        address: reusedSchoolAddress,
                        latitude: reusedDropoffLatitude,
                        longitude: reusedDropoffLongitude,
                      });
                      setPickupLocation({
                        address: reusedSchoolAddress,
                        latitude: reusedPickupLatitude,
                        longitude: reusedPickupLongitude,
                      });
                      setLocationPickerResetKey((prev) => prev + 1);
                      setShowSchoolSuggestions(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.schoolItemText,
                        { color: colors.text.primary },
                      ]}
                    >
                      Use child information ({childDisplayName})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Child Information Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Child Information
            </Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                School <Text style={styles.required}>*</Text>
              </Text>

<GooglePlacesAutoComplete
  value={schoolQuery}
  placeholder="Search or select school"
  debounce={400}
  onChangeText={(value) => {
    const nextValue = value || "";

    setSchoolQuery(nextValue);

    setFormValues((prev) => ({
      ...prev,
      school_name: nextValue,
      school_address: nextValue,
      school_id: "",
      school_latitude: null,
      school_longitude: null,
    }));

    if (!nextValue.trim()) {
      setDropoffLocation({
        address: "",
        latitude: null,
        longitude: null,
      });

      setShowSchoolSuggestions(false);
      return;
    }

    setShowSchoolSuggestions(true);
  }}
  onSelect={(name, coords, details) => {
    const selectedName =
      details?.name || name || "";

    const selectedAddress =
      details?.address || name || "";

    console.log("SELECTED SCHOOL:", {
      selectedName,
      selectedAddress,
      coords,
    });

    // This is the value that should appear in the input.
    setSchoolQuery(selectedName);

    setFormValues((prev) => ({
      ...prev,
      school_name: selectedName,
      school_address: selectedAddress,
      school_id: "",
      school_latitude: coords?.latitude ?? null,
      school_longitude: coords?.longitude ?? null,
    }));

    setDropoffLocation({
      address: selectedAddress,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    });

    setShowSchoolSuggestions(false);
    setChildNameQuery("");
    setShowChildSuggestions(false);
  }}
/>

              {schoolsLoading ? (
                <View style={styles.schoolLoadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    style={[
                      styles.schoolLoadingText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Loading schools…
                  </Text>
                </View>
              ) : null}

              {formValues.school_latitude && formValues.school_longitude ? (
                <View
                  style={[
                    styles.mapPinHint,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <MaterialIcons name="my-location" size={16} color={colors.primary} />
                  <Text style={[styles.mapPinHintText, { color: colors.text.secondary }]}>
                    School location selected on map
                  </Text>
                </View>
              ) : null}

              {shouldShowSchoolAutocomplete && (
                <View
                  style={[
                    styles.schoolList,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    style={styles.schoolScrollView}
                    contentContainerStyle={styles.schoolScrollContent}
                  >
                    {filteredSchools.length > 0 ? (
                      filteredSchools.map((school) => (
                        <TouchableOpacity
                          key={school.id || school.name}
                          style={styles.schoolItem}
                          onPress={() => {
                            setSchoolQuery(school.name || "");
                            setFormValues((prev) => ({
                              ...prev,
                              school_name: school.name || "",
                              school_address:
                                school.address || prev.school_address,
                              school_id: school.id || "",
                              school_latitude: school.latitude ?? null,
                              school_longitude: school.longitude ?? null,
                            }));
                            setDropoffLocation({
                              address: school.name || "",
                              latitude: school.latitude ?? null,
                              longitude: school.longitude ?? null,
                            });
                            setShowSchoolSuggestions(false);
                            setChildNameQuery("");
                            setShowChildSuggestions(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.schoolItemText,
                              { color: colors.text.primary },
                            ]}
                          >
                            {school.name || "Unnamed school"}
                          </Text>
                          {school.address ? (
                            <Text
                              style={[
                                styles.schoolItemSubtext,
                                { color: colors.text.secondary },
                              ]}
                            >
                              {school.address}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text
                        style={[
                          styles.schoolItemText,
                          { color: colors.text.secondary },
                        ]}
                      >
                        No schools found
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
            <View style={styles.row}>
              <View style={styles.halfColumn}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>
                    First Name <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="person"
                      size={20}
                      color={colors.text.secondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      value={formValues.name || ""}
                      onChangeText={(value) => {
                        setFormValues((prev) => ({ ...prev, name: value }));
                        setChildNameQuery(value);
                        setShowChildSuggestions(
                          Boolean(value.trim()) &&
                            Boolean(formValues.school_id),
                        );
                      }}
                      onFocus={() => {
                        if (formValues.school_id) {
                          setShowChildSuggestions(
                            Boolean(childNameQuery.trim()),
                          );
                        }
                      }}
                      placeholder={
                        isKnownSchoolSelected
                          ? "Search existing child"
                          : "Enter child's name"
                      }
                      placeholderTextColor={colors.text.secondary}
                      style={[styles.input, { color: colors.text.primary }]}
                    />
                  </View>
                  {childrenLoading ? (
                    <View style={styles.schoolLoadingRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text
                        style={[
                          styles.schoolLoadingText,
                          { color: colors.text.secondary },
                        ]}
                      >
                        Checking children…
                      </Text>
                    </View>
                  ) : null}
                  {showChildSuggestions && (
                    <View
                      style={[
                        styles.schoolList,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {filteredChildren.length > 0 ? (
                        filteredChildren.map((child) => (
                          <TouchableOpacity
                            key={child.id}
                            style={styles.schoolItem}
                            onPress={() => {
                              setFormValues((prev) => ({
                                ...prev,
                                name: child.name || "",
                                lastname: child.lastname || "",
                                grade: child.grade || "",
                                school_name:
                                  child.school_name || prev.school_name,
                                school_id: child.school_id || prev.school_id,
                              }));
                              setChildNameQuery(
                                `${child.name || ""} ${child.lastname || ""}`.trim(),
                              );
                              setShowChildSuggestions(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.schoolItemText,
                                { color: colors.text.primary },
                              ]}
                            >
                              {`${child.name || ""} ${child.lastname || ""}`.trim() ||
                                "Unnamed child"}
                            </Text>
                            {child.grade ? (
                              <Text
                                style={[
                                  styles.schoolItemSubtext,
                                  { color: colors.text.secondary },
                                ]}
                              >
                                Grade {child.grade}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text
                          style={[
                            styles.schoolItemText,
                            { color: colors.text.secondary },
                          ]}
                        >
                          No children found for this school
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.halfColumn}>
                {inputField("lastname", "Last Name", "Lili", "person")}
              </View>
            </View>
            {inputField("grade", "Grade", "4", "school")}
          </View>

          {/* Profile Photo Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Profile Photo <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.photoUploader,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handlePickImage}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.photoImage} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="camera"
                    size={40}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.photoText, { color: colors.text.primary }]}
                  >
                    Upload a photo of your child
                  </Text>
                  <Text
                    style={[
                      styles.photoSubtext,
                      { color: colors.text.secondary },
                    ]}
                  >
                    JPG, PNG or WEBP (Max 2MB)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Pickup & Drop-off Locations */}
          <View style={styles.section}>
            <View style={styles.locationHeader}>
              <MaterialIcons
                name="location-on"
                size={20}
                color={colors.primary}
              />
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Pickup & Drop-off Locations
              </Text>
            </View>
            <Text
              style={[styles.sectionDesc, { color: colors.text.secondary }]}
            >
              Tap on the map to select pickup and drop-off locations.
            </Text>

            <View style={styles.locationsRow}>
              {/* Pickup Location */}
              <View style={styles.locationColumn}>
                <View style={styles.locationLabel}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={18}
                    color="#10B981"
                  />
                  <Text style={[styles.locationTitle, { color: "#10B981" }]}>
                    Pickup Location
                  </Text>
                </View>
                <LocationPicker
                  key={locationPickerResetKey}
                  title="Select Pickup Location"
                  selectedLocation={pickupLocation.address}
                  initialCoordinates={
                    pickupLocation.latitude && pickupLocation.longitude
                      ? {
                          latitude: pickupLocation.latitude,
                          longitude: pickupLocation.longitude,
                        }
                      : null
                  }
                  onLocationSelect={(address, coordinates) => {
                    setPickupLocation({
                      address,
                      latitude: coordinates.latitude,
                      longitude: coordinates.longitude,
                    });
                  }}
                  placeholder="Tap to select pickup"
                />
                {pickupLocation.address && (
                  <Text
                    style={[
                      styles.selectedLocation,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {pickupLocation.address}
                  </Text>
                )}
              </View>

              {/* Dropoff Location */}
              <View style={styles.locationColumn}>
                <View style={styles.locationLabel}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={18}
                    color="#3B82F6"
                  />
                  <Text style={[styles.locationTitle, { color: "#3B82F6" }]}>
                    Drop-off Location
                  </Text>
                </View>
                <LocationPicker
                  key={locationPickerResetKey}
                  title="Select Drop-off Location"
                  selectedLocation={dropoffLocation.address}
                  initialCoordinates={
                    formValues.school_latitude && formValues.school_longitude
                      ? {
                          latitude: formValues.school_latitude,
                          longitude: formValues.school_longitude,
                        }
                      : null
                  }
                  locked={Boolean(
                    formValues.school_latitude && formValues.school_longitude,
                  )}
                  onLocationSelect={(address, coordinates) => {
                    setDropoffLocation({
                      address,
                      latitude: coordinates.latitude,
                      longitude: coordinates.longitude,
                    });
                  }}
                  placeholder="Tap to select dropoff"
                />
                {dropoffLocation.address && (
                  <Text
                    style={[
                      styles.selectedLocation,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {dropoffLocation.address}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Assigned Vehicle Section */}
          <View style={styles.section}>
            <View style={styles.vehicleHeader}>
              <MaterialCommunityIcons
                name="car"
                size={20}
                color={colors.primary}
              />
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Assigned Vehicle <Text style={styles.optional}>(Optional)</Text>
              </Text>
            </View>
            {assignedVehicleOptions.length > 0 ? (
              <View>
                <TouchableOpacity
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setVehiclePickerOpen((prev) => !prev)}
                >
                  <MaterialCommunityIcons
                    name="car"
                    size={20}
                    color={colors.text.secondary}
                    style={styles.inputIcon}
                  />
                  <Text
                    style={[
                      styles.selectPlaceholder,
                      { color: colors.text.primary },
                    ]}
                  >
                    {formValues.vehicle_id
                      ? assignedVehicleOptions.find(
                          (option) => option.id === formValues.vehicle_id,
                        )?.name || "Assigned vehicle"
                      : "Select vehicle to share"}
                  </Text>
                </TouchableOpacity>
                {vehiclePickerOpen && (
                  <View style={styles.vehiclePickerList}>
                    {assignedVehicleOptions.map((vehicle) => (
                      <TouchableOpacity
                        key={vehicle.id}
                        style={styles.vehicleOptionItem}
                        onPress={() => {
                          setFormValues((prev) => ({
                            ...prev,
                            vehicle_id: vehicle.id,
                          }));
                          setVehiclePickerOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.vehicleOptionText,
                            {
                              color:
                                formValues.vehicle_id === vehicle.id
                                  ? colors.primary
                                  : colors.text.primary,
                            },
                          ]}
                        >
                          {vehicle.name || vehicle.license_plate || "Vehicle"}
                        </Text>
                        <Text
                          style={[
                            styles.vehicleOptionSubtext,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {vehicle.license_plate || "No plate"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="car"
                  size={20}
                  color={colors.text.secondary}
                  style={styles.inputIcon}
                />
                <Text
                  style={[
                    styles.selectPlaceholder,
                    { color: colors.text.secondary },
                  ]}
                >
                  No assigned vehicle options available
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleAddChild}
            disabled={loading || avatarUploading}
          >
            {(loading || avatarUploading) && (
              <ActivityIndicator size="small" color="#fff" />
            )}
            <Text style={styles.primaryButtonText}>
              {loading || avatarUploading ? "Saving..." : "Save Child"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={() => {
              resetChildForm();
              router.back();
            }}
          >
            <Text
              style={[styles.secondaryButtonText, { color: colors.primary }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <AppNotification
          message={profileNotification.message}
          type={profileNotification.type}
          visible={profileNotification.visible}
          onHide={() =>
            setProfileNotification((current) => ({
              ...current,
              visible: false,
            }))
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddChildScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  /* ───────────────── HEADER ───────────────── */

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerTitles: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },

  /* ───────────────── SAFETY CARD ───────────────── */

  banner: {
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
  },

  bannerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  bannerText: {
    flex: 1,
    marginLeft: 12,
  },

  bannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  bannerDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  bannerIllustration: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* ───────────────── SECTIONS ───────────────── */

  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 14,
  },

  sectionDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },

  optional: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.6,
  },

  /* ───────────────── INPUTS ───────────────── */

  inputGroup: {
    marginBottom: 14,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },

  required: {
    color: "#EF4444",
  },

  inputWrapper: {
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  inputIcon: {
    marginRight: 10,
    opacity: 0.7,
  },

  input: {
    flex: 1,
    height: 54,
    fontSize: 14,
    fontWeight: "500",
  },

  selectPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },

  /* ───────────────── SCHOOL DROPDOWN ───────────────── */

  schoolLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },

  schoolLoadingText: {
    fontSize: 12,
    marginLeft: 8,
  },

  schoolList: {
    marginTop: 6,
    borderRadius: 15,
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: 210,
  },

  schoolScrollView: {
    maxHeight: 210,
  },

  schoolScrollContent: {
    paddingVertical: 4,
  },

  schoolItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.10)",
  },

  schoolItemText: {
    fontSize: 13,
    fontWeight: "700",
  },

  schoolItemSubtext: {
    fontSize: 11,
    marginTop: 3,
  },

  /* ───────────────── PHOTO ───────────────── */

  photoUploader: {
    minHeight: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  photoImage: {
    width: 150,
    height: 150,
    borderRadius: 20,
  },

  photoText: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },

  photoSubtext: {
    fontSize: 11,
    marginTop: 4,
  },

  /* ───────────────── LOCATIONS ───────────────── */

  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  locationLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  locationTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6,
  },

  locationsRow: {
    gap: 14,
  },

  locationColumn: {
    width: "100%",
  },

  selectedLocation: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
    paddingHorizontal: 3,
  },

  /* ───────────────── VEHICLE ───────────────── */

  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  vehiclePickerList: {
    marginTop: 6,
    borderRadius: 15,
    borderWidth: 1,
    overflow: "hidden",
  },

  vehicleOptionItem: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.10)",
  },

  vehicleOptionText: {
    fontSize: 14,
    fontWeight: "700",
  },

  vehicleOptionSubtext: {
    fontSize: 11,
    marginTop: 3,
  },

  /* ───────────────── BUTTONS ───────────────── */

  primaryButton: {
    height: 54,
    marginHorizontal: 20,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    height: 50,
    marginHorizontal: 20,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
