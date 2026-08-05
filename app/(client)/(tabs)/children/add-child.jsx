import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { BASE_URL } from "../../../../url";
import * as Location from "expo-location";

const AddChildScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);

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
  const [schools, setSchools] = useState([]);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false);
  const [existingChildren, setExistingChildren] = useState([]);
  const [assignedVehicleOptions, setAssignedVehicleOptions] = useState([]);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [childNameQuery, setChildNameQuery] = useState("");
  const [childSearchLoading, setChildSearchLoading] = useState(false);
  const [showChildSuggestions, setShowChildSuggestions] = useState(false);
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

  const searchSchoolOnMap = useCallback(async (query) => {
    if (!query?.trim() || formValues.school_id) return;

    try {
      const geocodedResults = await Location.geocodeAsync(query.trim());
      const place = geocodedResults?.[0];

      if (!place) return;

      const coordinates = {
        latitude: place.latitude,
        longitude: place.longitude,
      };

      const addressParts = [
        place.street,
        place.city,
        place.region,
        place.country,
      ].filter(Boolean);
      const address = addressParts.length > 0
        ? addressParts.join(", ")
        : query.trim();

      setFormValues((prev) => ({
        ...prev,
        school_name: query.trim(),
        school_address: address,
        school_latitude: coordinates.latitude,
        school_longitude: coordinates.longitude,
      }));
      setDropoffLocation({
        address,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
    } catch (error) {
      console.error("School map search error:", error);
    }
  }, [formValues.school_id]);

  useEffect(() => {
    const fetchSchools = async () => {
      if (!user?.token) return;

      setSchoolLoading(true);
      try {
        const response = await fetch(`${BASE_URL}/client/schools`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Unable to load schools.");
        }

        const schoolList = Array.isArray(data)
          ? data
          : Array.isArray(data?.schools)
            ? data.schools
            : [];

        setSchools(schoolList);
      } catch (error) {
        console.error("Fetch schools error:", error);
      } finally {
        setSchoolLoading(false);
      }
    };

    const fetchExistingChildren = async () => {
      if (!user?.token) return;

      setChildSearchLoading(true);
      try {
        const response = await fetch(`${BASE_URL}/client/children`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Unable to load children.");
        }

        const childrenList = Array.isArray(data) ? data : [];
        setExistingChildren(childrenList);
      } catch (error) {
        console.error("Fetch children error:", error);
      } finally {
        setChildSearchLoading(false);
      }
    };

    fetchSchools();
    fetchExistingChildren();
  }, [user?.token]);

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
    if (!schoolQuery?.trim() || formValues.school_id) return;
    if (schoolQuery.trim().length < 3) return;

    const timeout = setTimeout(() => {
      searchSchoolOnMap(schoolQuery);
    }, 500);

    return () => clearTimeout(timeout);
  }, [formValues.school_id, schoolQuery, searchSchoolOnMap]);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Camera roll access is required to select an avatar."
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
      Alert.alert("Error", "Unable to select avatar.");
    }
  };

  const uploadChildAvatar = async (uri) => {
    setAvatarUploading(true);
    try {
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
        `${BASE_URL}/client/upload-child-avatar`,
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

  const handleAddChild = async () => {
    if (!formValues.name.trim()) {
      return Alert.alert("Missing value", "Please enter your child's first name.");
    }
    if (!formValues.lastname.trim()) {
      return Alert.alert("Missing value", "Please enter your child's last name.");
    }
    if (!formValues.grade.trim()) {
      return Alert.alert("Missing value", "Please enter your child's grade.");
    }
    if (!formValues.school_name.trim()) {
      return Alert.alert("Missing value", "Please enter your child's school name.");
    }

    setLoading(true);
    try {
      const selectedSchoolLatitude =
        formValues.school_latitude ?? dropoffLocation.latitude ?? null;
      const selectedSchoolLongitude =
        formValues.school_longitude ?? dropoffLocation.longitude ?? null;
      const selectedSchoolAddress =
        dropoffLocation.address?.trim() || formValues.school_address?.trim() || null;

      let avatarUrl = null;
      if (avatar) {
        avatarUrl = await uploadChildAvatar(avatar);
      }

      const response = await fetch(`${BASE_URL}/client/children`, {
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

      Alert.alert("Success", "Your child was added successfully.");
      setFormValues({
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
      setAvatar(null);
      setSchoolQuery("");
      setShowSchoolSuggestions(false);
      setChildNameQuery("");
      setShowChildSuggestions(false);
      setPickupLocation({ address: "", latitude: null, longitude: null });
      setDropoffLocation({ address: "", latitude: null, longitude: null });
      router.replace("/(client)/(tabs)/children");
    } catch (error) {
      console.error("Add child error:", error);
      Alert.alert("Error", error?.message || "Unable to add child. Please try again.");
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
    valueOverride = null
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

  const filteredSchools = (schoolQuery || "").trim()
    ? schools.filter((school) =>
        school?.name?.toLowerCase().includes(schoolQuery.toLowerCase())
      )
    : schools.slice(0, 8);

  const filteredChildren =
    formValues.school_id && (childNameQuery || "").trim()
      ? existingChildren.filter((child) => {
          const childSchoolName = (child.school_name || "").toLowerCase();
          const selectedSchoolName = (formValues.school_name || "").toLowerCase();
          const matchesSchool = childSchoolName === selectedSchoolName;
          if (!matchesSchool) return false;

          const childName = `${child.name || ""} ${child.lastname || ""}`.trim().toLowerCase();
          return childName.includes((childNameQuery || "").trim().toLowerCase());
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
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
                Add Child
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
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
              <MaterialCommunityIcons
                name="shield"
                size={32}
                color="#7C3AED"
              />
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
              <MaterialCommunityIcons
                name="school"
                size={50}
                color="#A78BFA"
              />
            </View>
          </View>

          {/* Child Information Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Child Information
            </Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                School <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <MaterialIcons
                  name="home"
                  size={20}
                  color={colors.text.secondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={schoolQuery}
                  onChangeText={(value) => {
                    setSchoolQuery(value);
                    setFormValues((prev) => ({
                      ...prev,
                      school_name: value,
                      school_address: prev.school_address,
                      school_id: "",
                      school_latitude: null,
                      school_longitude: null,
                    }));
                    setShowSchoolSuggestions(true);
                  }}
                  onFocus={() => setShowSchoolSuggestions(true)}
                  placeholder="Search or select school"
                  placeholderTextColor={colors.text.secondary}
                  style={[styles.input, { color: colors.text.primary }]}
                />
              </View>

              {schoolLoading ? (
                <View style={styles.schoolLoadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.schoolLoadingText, { color: colors.text.secondary }]}>Loading schools…</Text>
                </View>
              ) : null}

              {showSchoolSuggestions && (
                <View
                  style={[
                    styles.schoolList,
                    { backgroundColor: colors.surface, borderColor: colors.border },
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
                              school_address: school.address || prev.school_address,
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
                          <Text style={[styles.schoolItemText, { color: colors.text.primary }]}>
                            {school.name || "Unnamed school"}
                          </Text>
                          {school.address ? (
                            <Text style={[styles.schoolItemSubtext, { color: colors.text.secondary }]}>
                              {school.address}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={[styles.schoolItemText, { color: colors.text.secondary }]}>No schools found</Text>
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
                      { backgroundColor: colors.surface, borderColor: colors.border },
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
                        setShowChildSuggestions(Boolean(value.trim()) && Boolean(formValues.school_id));
                      }}
                      onFocus={() => {
                        if (formValues.school_id) {
                          setShowChildSuggestions(Boolean(childNameQuery.trim()));
                        }
                      }}
                      placeholder="Search existing child"
                      placeholderTextColor={colors.text.secondary}
                      style={[styles.input, { color: colors.text.primary }]}
                    />
                  </View>
                  {childSearchLoading ? (
                    <View style={styles.schoolLoadingRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.schoolLoadingText, { color: colors.text.secondary }]}>Checking children…</Text>
                    </View>
                  ) : null}
                  {showChildSuggestions && (
                    <View
                      style={[
                        styles.schoolList,
                        { backgroundColor: colors.surface, borderColor: colors.border },
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
                                school_name: child.school_name || prev.school_name,
                                school_id: child.school_id || prev.school_id,
                              }));
                              setChildNameQuery(`${child.name || ""} ${child.lastname || ""}`.trim());
                              setShowChildSuggestions(false);
                            }}
                          >
                            <Text style={[styles.schoolItemText, { color: colors.text.primary }]}>
                              {`${child.name || ""} ${child.lastname || ""}`.trim() || "Unnamed child"}
                            </Text>
                            {child.grade ? (
                              <Text style={[styles.schoolItemSubtext, { color: colors.text.secondary }]}>Grade {child.grade}</Text>
                            ) : null}
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={[styles.schoolItemText, { color: colors.text.secondary }]}>No children found for this school</Text>
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
                  <Text style={[styles.photoText, { color: colors.text.primary }]}>
                    Upload a photo of your child
                  </Text>
                  <Text style={[styles.photoSubtext, { color: colors.text.secondary }]}>
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
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}> 
                Pickup & Drop-off Locations
              </Text>
            </View>
            <Text style={[styles.sectionDesc, { color: colors.text.secondary }]}>
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
                  title="Select Pickup Location"
                  selectedLocation={pickupLocation.address}
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
                  <Text style={[styles.selectedLocation, { color: colors.text.secondary }]}>
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
                    formValues.school_latitude && formValues.school_longitude
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
                  <Text style={[styles.selectedLocation, { color: colors.text.secondary }]}>
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
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Assigned Vehicle <Text style={styles.optional}>(Optional)</Text>
              </Text>
            </View>
            {assignedVehicleOptions.length > 0 ? (
              <View>
                <TouchableOpacity
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.surface, borderColor: colors.border },
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
                        <Text style={[styles.vehicleOptionSubtext, { color: colors.text.secondary }]}> 
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
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="car"
                  size={20}
                  color={colors.text.secondary}
                  style={styles.inputIcon}
                />
                <Text
                  style={[styles.selectPlaceholder, { color: colors.text.secondary }]}
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
            onPress={() => router.back()}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}> 
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddChildScreen;

const styles = StyleSheet.create({
  // Banner
  banner: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 12,
  },
  bannerContent: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  bannerIllustration: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  optional: {
    fontSize: 13,
    fontWeight: "400",
  },

  // Input Fields
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  halfColumn: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  required: {
    color: "#EF4444",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  inputIcon: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  selectPlaceholder: {
    fontSize: 14,
    flex: 1,
  },
  schoolLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  schoolLoadingText: {
    fontSize: 12,
  },
  schoolList: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    maxHeight: 220,
  },
  schoolScrollView: {
    maxHeight: 220,
  },
  schoolScrollContent: {
    paddingBottom: 4,
  },
  schoolItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  schoolItemText: {
    fontSize: 13,
    fontWeight: "600",
  },
  schoolItemSubtext: {
    fontSize: 11,
    marginTop: 2,
  },

  // Photo Uploader
  photoUploader: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 160,
    overflow: "hidden",
  },
  photoImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    resizeMode: "cover",
  },
  photoText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  photoSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  vehiclePickerList: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(255,255,255,0.95)",
    overflow: "hidden",
  },
  vehicleOptionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.12)",
  },
  vehicleOptionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  vehicleOptionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },

  // Locations
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  locationLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  locationsRow: {
    flexDirection: "row",
    gap: 16,
  },
  locationColumn: {
    flex: 1,
  },
  selectedLocation: {
    marginTop: 8,
    fontSize: 12,
    fontStyle: "italic",
  },

  // Vehicle Header
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  // Buttons
  primaryButton: {
    flexDirection: "row",
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});