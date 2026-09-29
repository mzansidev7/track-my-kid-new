import { View, Text, Modal, TouchableOpacity } from "react-native";
import React from "react";
import { ownersProfileStyles, useOwnerStyles } from "../styles/ownerStyles";
import { useTheme } from "@/styles/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export const ForceProfileUpdate = ({ missingOwnerFields }: any) => {
  const styles = useOwnerStyles();
  const { colors, shadows } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <Modal
        visible
        transparent={false}
        animationType="slide"
        onRequestClose={() => undefined}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#F8FAFC",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#FEF2F2",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <MaterialIcons name="warning" size={32} color="#DC2626" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Profile update required
            </Text>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 19,
                color: colors.text.secondary,
                marginBottom: 16,
              }}
            >
              It has been 3 months or more since your profile was created.
              Please complete the missing information below to continue using
              the app.
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Missing fields:
            </Text>
            {missingOwnerFields.map((field: any) => (
              <Text
                key={field}
                style={{
                  fontSize: 12,
                  color: colors.text.secondary,
                  marginBottom: 6,
                }}
              >
                • {field}
              </Text>
            ))}
            <TouchableOpacity
              style={{
                marginTop: 20,
                backgroundColor: colors.primaryDark,
                borderRadius: 14,
                paddingVertical: 11,
                alignItems: "center",
              }}
              onPress={() => router.push("/(owner)/personal-info")}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#FFF", fontWeight: "700" }}>
                Update profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export const LogoutModal = ({
  showLogoutModal,
  setShowLogoutModal,
  confirmLogout,
}: any) => {
  const { colors, shadows } = useTheme();
  return (
    <Modal
      visible={showLogoutModal}
      animationType="fade"
      transparent
      onRequestClose={() => setShowLogoutModal(false)}
    >
      <View style={ownersProfileStyles.modalOverlay}>
        <View style={ownersProfileStyles.modalCard}>
          <Text style={ownersProfileStyles.modalTitle}>Confirm logout</Text>
          <Text style={ownersProfileStyles.modalMessage}>
            Are you sure you want to sign out of your owner account?
          </Text>
          <View style={ownersProfileStyles.modalActions}>
            <TouchableOpacity
              style={[
                ownersProfileStyles.modalButton,
                ownersProfileStyles.modalCancelButton,
              ]}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={ownersProfileStyles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                ownersProfileStyles.modalButton,
                ownersProfileStyles.modalConfirmButton,
              ]}
              onPress={confirmLogout}
            >
              <Text style={ownersProfileStyles.modalConfirmText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
