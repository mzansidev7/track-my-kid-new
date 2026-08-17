import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useOwnerProfile } from "../../ownerHelpers/hooks/useOwnerProfile";
import { updateUser } from "../../asyncStorage/authStore";
import { AuthContext } from "../../context/authContext/auth-context";
import AppNotification from "../../components/Notification";
import { resolveWorkingBaseUrl } from "../../url";

const normalizeAddressValue = (value: any) => {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    if (typeof value.full_address === "string") return value.full_address;
    if (typeof value.address === "string") return value.address;
    if (typeof value.street === "string") return value.street;
    return JSON.stringify(value);
  }

  return "";
};

const PersonalInfo = () => {
  const router = useRouter();
  const { user, setUser } = useContext(AuthContext);
  const { owner, loading, refreshOwner } = useOwnerProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedAvatarUri, setSelectedAvatarUri] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const profileUser = owner || user?.userData;

  const [formData, setFormData] = useState({
    name: profileUser?.name || "",
    email: profileUser?.email || "",
    phone: profileUser?.phone || "",
    company_name: owner?.company_name || profileUser?.company_name || "",
    identity_number:
      owner?.identity_number || profileUser?.identity_number || "",
    address: normalizeAddressValue(owner?.address || profileUser?.address),
  });

  useEffect(() => {
    if (owner || profileUser) {
      setFormData({
        name: owner?.name || profileUser?.name || "",
        email: profileUser?.email || "",
        phone: profileUser?.phone || "",
        company_name: owner?.company_name || profileUser?.company_name || "",
        identity_number:
          owner?.identity_number || profileUser?.identity_number || "",
        address: normalizeAddressValue(owner?.address || profileUser?.address),
      });

      const avatarData = owner?.avatar || profileUser?.avatar;
      if (avatarData) {
        if (typeof avatarData === "string") {
          setAvatarUri(avatarData);
        } else if (avatarData.url) {
          setAvatarUri(avatarData.url);
        } else if (avatarData.avatar_url) {
          setAvatarUri(avatarData.avatar_url);
        } else if (avatarData.avatar_data && avatarData.content_type) {
          setAvatarUri(
            `data:${avatarData.content_type};base64,${avatarData.avatar_data}`,
          );
        }
      }
    }
  }, [owner, profileUser]);

  const handlePickCompanyLogo = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotification({
          visible: true,
          message: "Image library permission is required.",
          type: "error",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSaving(true);
        try {
          const logoUrl = await uploadCompanyLogo(uri);
          setNotification({
            visible: true,
            message: "Company logo uploaded successfully.",
            type: "success",
          });
          await refreshOwner();
          return logoUrl;
        } catch (err: any) {
          setNotification({
            visible: true,
            message: err.message || "Unable to upload company logo.",
            type: "error",
          });
        } finally {
          setSaving(false);
        }
      }
    } catch (err: any) {
      setNotification({
        visible: true,
        message: err.message || "Unable to pick company logo.",
        type: "error",
      });
    }
  };

  const handlePickAvatar = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotification({
          visible: true,
          message: "Image library permission is required.",
          type: "error",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSelectedAvatarUri(uri);
        setIsEditing(true); // Enter edit mode to show save button
        setNotification({
          visible: true,
          message: "Avatar selected. Click save to upload.",
          type: "success",
        });
      }
    } catch (err: any) {
      setNotification({
        visible: true,
        message: err.message || "Unable to pick an avatar.",
        type: "error",
      });
    }
  };

  const uploadAvatar = async (uri: string) => {
    const fileName = uri.split("/").pop() || `avatar-${Date.now()}.jpg`;
    const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";

    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("avatar", blob, fileName);
    } else {
      formData.append("avatar", {
        uri,
        name: fileName,
        type: contentType,
      } as any);
    }

    const baseUrl = await resolveWorkingBaseUrl();
    const response = await fetch(`${baseUrl}/owner/avatar`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${user?.token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Failed to upload avatar.");
    }

    const newAvatar = data.avatar;
    const avatarUrl = newAvatar?.avatar_url || newAvatar?.url || uri;

    setAvatarUri(avatarUrl);
    setSelectedAvatarUri(null);

    return avatarUrl;
  };

  const uploadCompanyLogo = async (uri: string) => {
    const fileName = uri.split("/").pop() || `company-logo-${Date.now()}.jpg`;
    const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";

    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("avatar", blob, fileName);
    } else {
      formData.append("avatar", {
        uri,
        name: fileName,
        type: contentType,
      } as any);
    }

    const baseUrl = await resolveWorkingBaseUrl();
    const response = await fetch(`${baseUrl}/owner/company-avatar`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${user?.token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Failed to upload company logo.",
      );
    }

    const newLogo = data.avatar;
    return newLogo?.avatar_url || newLogo?.url || uri;
  };

  const handleSaveProfile = async () => {
    const updatedErrors: { name?: string; phone?: string } = {};

    if (!formData.name.trim()) {
      updatedErrors.name = "Enter your full name.";
    }
    if (!formData.phone.trim()) {
      updatedErrors.phone = "Enter your phone number.";
    }

    if (Object.keys(updatedErrors).length > 0) {
      setErrors(updatedErrors);
      setNotification({
        visible: true,
        message: "Please fix the highlighted fields.",
        type: "error",
      });
      return;
    }

    if (!user?.token) {
      setNotification({
        visible: true,
        message: "Unable to authenticate request.",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          company_name: formData.company_name.trim(),
          identity_number: formData.identity_number.trim(),
          address: formData.address.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Failed to update profile.",
        );
      }

      let avatarUrl: string | null = null;
      if (selectedAvatarUri) {
        avatarUrl = await uploadAvatar(selectedAvatarUri);
      }

      if (user?.userData) {
        const updatedUser = {
          ...user.userData,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          ...(avatarUrl ? { avatar: avatarUrl } : {}),
        };

        await updateUser(updatedUser);
        setUser({ ...user, userData: updatedUser });
      }

      await refreshOwner();

      setNotification({
        visible: true,
        message:
          data.message ||
          (selectedAvatarUri
            ? "Profile and avatar updated successfully."
            : "Profile updated successfully."),
        type: "success",
      });
      setErrors({});
      setIsEditing(false);
    } catch (err: any) {
      setNotification({
        visible: true,
        message: err.message || "Unable to save profile.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const setingProfileHeader = () => (
    <View style={styles.header}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(owner)/(tabs)/profile")}
          style={{ padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: "white",
            marginLeft: 12,
          }}
        >
          Update your personal details
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {setingProfileHeader()}
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading profile details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {setingProfileHeader()}

      <AppNotification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onHide={() => setNotification({ ...notification, visible: false })}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {owner?.company_avatar ? (
          <ImageBackground
            source={{ uri: owner.company_avatar }}
            style={styles.profileCard}
            imageStyle={styles.profileCardBackground}
          >
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                {selectedAvatarUri || avatarUri ? (
                  <Image
                    source={{
                      uri: selectedAvatarUri || avatarUri || undefined,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {(profileUser?.name || "D")[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>
                  {profileUser?.name
                    ? profileUser.name.charAt(0).toUpperCase() +
                      profileUser.name.slice(1)
                    : "Unknown"}
                </Text>
                <Text style={styles.profileDetail}>
                  {profileUser?.email || "No email"}
                </Text>
                <Text style={styles.profileDetail}>
                  {profileUser?.phone || "No phone"}
                </Text>
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={handlePickAvatar}
                >
                  <Text style={styles.avatarButtonText}>Change avatar</Text>
                </TouchableOpacity>
                {selectedAvatarUri ? (
                  <Text style={styles.avatarHint}>
                    New avatar selected. Tap Save changes to upload.
                  </Text>
                ) : null}
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.profileCard}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                {selectedAvatarUri || avatarUri ? (
                  <Image
                    source={{
                      uri: selectedAvatarUri || avatarUri || undefined,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {(profileUser?.name || "D")[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>
                  {profileUser?.name
                    ? profileUser.name.charAt(0).toUpperCase() +
                      profileUser.name.slice(1)
                    : "Unknown"}
                </Text>
                <Text style={styles.profileDetail}>
                  {profileUser?.email || "No email"}
                </Text>
                <Text style={styles.profileDetail}>
                  {profileUser?.phone || "No phone"}
                </Text>
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={handlePickAvatar}
                >
                  <Text style={styles.avatarButtonText}>Change avatar</Text>
                </TouchableOpacity>
                {selectedAvatarUri ? (
                  <Text style={styles.avatarHint}>
                    New avatar selected. Tap Save changes to upload.
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        )}
        <View style={[styles.statusRow]}>
          {user?.userData?.is_verified ? (
            <View
              style={[
                styles.verifiedBadge,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                },
              ]}
            >
              <MaterialIcons name="verified" size={16} color="#0369A1" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>
        {(owner?.company_name || owner?.company_avatar) && (
          <>
            {owner?.company_name ? (
              <View
                style={[
                  styles.verifiedBadge,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 10,
                    marginBottom: 10,
                  },
                ]}
              >
                <MaterialIcons name="business" size={16} color="#4A90E2" />
                <Text style={styles.verifiedText}>{owner.company_name}</Text>
              </View>
            ) : null}
            {owner?.address ? (
              <View
                style={[
                  styles.verifiedBadge,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 10,
                  },
                ]}
              >
                <MaterialIcons name="place" size={16} color="#4A90E2" />
                <Text style={styles.verifiedText}>{owner.address}</Text>
              </View>
            ) : null}
            <View>
              {owner?.company_avatar ? (
                <Image
                  source={{ uri: owner.company_avatar }}
                  style={styles.companyAvatar}
                />
              ) : (
                <TouchableOpacity
                  style={[
                    styles.verifiedBadge,
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      borderWidth: 1,
                      borderColor: "#4A90E2",
                      backgroundColor: "#EFF6FF",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 10,
                    },
                  ]}
                  onPress={handlePickCompanyLogo}
                >
                  <MaterialIcons
                    name="add-business"
                    size={16}
                    color="#4A90E2"
                  />
                  <Text style={styles.verifiedText}>Add Company Logo</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Role</Text>
            <Text style={styles.summaryValue}>
              {(profileUser?.role || "Owner").charAt(0).toUpperCase() +
                (profileUser?.role || "Owner").slice(1)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Joined</Text>
            <Text style={styles.summaryValue}>
              {owner?.created_at
                ? new Date(owner.created_at).toLocaleDateString()
                : "-"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          {isEditing && (
            <>
              <View
                style={[
                  styles.cardHeader,
                  { flexDirection: "row", justifyContent: "space-between" },
                ]}
              >
                <Text style={styles.cardTitle}>Account Details </Text>
                <TouchableOpacity onPress={setIsEditing.bind(null, false)}>
                  <MaterialIcons name="close" size={30} color="red" />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardSubtitle}>
                Update your name and phone number so customers can reach you.
              </Text>
              {/* Create a devider */}
              <View style={styles.divider} />

              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={[
                  styles.input,
                  !isEditing && styles.readOnlyInput,
                  errors.name && styles.inputError,
                ]}
                value={formData.name}
                editable={isEditing}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                textContentType="name"
              />
              {errors.name ? (
                <Text style={styles.errorText}>{errors.name}</Text>
              ) : null}

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={[
                  styles.input,
                  !isEditing && styles.readOnlyInput,
                  errors.phone && styles.inputError,
                ]}
                value={formData.phone}
                editable={isEditing}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
              {errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}

              <Text style={styles.fieldLabel}>Company Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.readOnlyInput]}
                value={formData.company_name}
                editable={isEditing}
                onChangeText={(text) =>
                  setFormData({ ...formData, company_name: text })
                }
                placeholder="Enter your company name"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.fieldLabel}>Identity Number</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.readOnlyInput]}
                value={formData.identity_number}
                editable={isEditing}
                onChangeText={(text) =>
                  setFormData({ ...formData, identity_number: text })
                }
                placeholder="Enter your identity number"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.fieldLabel}>Business Address</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.readOnlyInput]}
                value={formData.address}
                editable={isEditing}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
                placeholder="Enter your business address"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={formData.email}
                editable={false}
                placeholder="Email cannot be changed"
              />
            </>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isEditing ? styles.saveBtn : styles.editBtn,
              ]}
              onPress={() =>
                isEditing ? handleSaveProfile() : setIsEditing(true)
              }
              disabled={saving}
            >
              <Text style={styles.actionText}>
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Save changes"
                    : "Edit profile"}
              </Text>
            </TouchableOpacity>
            {isEditing ? (
              <TouchableOpacity
                style={[styles.secondaryButton, styles.cancelBtn]}
                onPress={() => {
                  setIsEditing(false);
                  setErrors({});
                  setFormData({
                    name: profileUser?.name || "",
                    email: profileUser?.email || "",
                    phone: profileUser?.phone || "",
                    company_name:
                      owner?.company_name || profileUser?.company_name || "",
                    identity_number:
                      owner?.identity_number ||
                      profileUser?.identity_number ||
                      "",
                    address: normalizeAddressValue(
                      owner?.address || profileUser?.address,
                    ),
                  });
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 16 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#2563EB",
  },
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    overflow: "hidden",
  },
  profileCardBackground: {
    borderRadius: 16,
    opacity: 0.18,
  },

  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },

  avatarInitials: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "700",
  },

  profileText: {
    flex: 1,
  },

  avatarImage: {
    width: 120,
    height: 120,
    resizeMode: "cover",
  },

  avatarButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#0F766E",
    alignSelf: "flex-start",
  },

  avatarButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  avatarHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#475569",
  },

  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },

  profileDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },

  statusRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  statusBadge: {
    backgroundColor: "#E5F8ED",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  statusText: {
    color: "#15803D",
    fontWeight: "700",
    fontSize: 12,
  },

  verifiedBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  verifiedText: {
    color: "#0369A1",
    fontWeight: "700",
    fontSize: 12,
  },
  companyAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 14,
    alignItems: "flex-start",
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 6,
    textTransform: "uppercase",
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  card: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
    color: "#111827",
  },

  readOnlyInput: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
    marginTop: 16,
  },

  buttonRow: {
    flexDirection: "row",
    marginTop: 24,
    alignItems: "center",
  },

  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    backgroundColor: "#F3F4F6",
  },

  saveBtn: {
    backgroundColor: "#4A90E2",
  },

  editBtn: {
    backgroundColor: "#0F766E",
  },

  cancelBtn: {
    backgroundColor: "#FFFFFF",
  },

  actionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  cancelText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "700",
  },

  inputError: {
    borderColor: "#F87171",
    backgroundColor: "#FEF2F2",
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    marginTop: 8,
    marginBottom: -4,
  },

  cardHeader: {
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 20,
  },
});

export default PersonalInfo;
