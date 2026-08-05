import { StyleSheet, Dimensions } from "react-native";
import { useTheme } from "./theme";

export const useAuthStyles = () => {
  const { width, height } = Dimensions.get("window");
  const { colors, shadows } = useTheme();

  return StyleSheet.create({
    // ===========================
    // Container
    // ===========================
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // ===========================
    // Header / Hero
    // ===========================
    header: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },

    heroContent: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },

    logo: {
      width: 140,
      height: 140,
      marginBottom: 24,
    },

    appTitle: {
      fontSize: 34,
      fontWeight: "800",
      color: colors.text.primary,
      letterSpacing: 0.5,
      textAlign: "center",
      marginBottom: 10,
    },

    tagline: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: 24,
      marginBottom: 48,
    },

    // ===========================
    // Loading
    // ===========================
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
    },

    loadingText: {
      marginTop: 16,
      fontSize: 15,
      color: colors.text.secondary,
      fontWeight: "500",
    },

    // ===========================
    // Card
    // ===========================
    card: {
      width: "90%",
      maxWidth: 420,
      alignSelf: "center",
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.md,
    },

    // ===========================
    // Buttons
    // ===========================
    button: {
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      ...shadows.sm,
    },

    buttonText: {
      color: colors.text.inverse,
      fontSize: 16,
      fontWeight: "700",
    },

    secondaryButton: {
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },

    secondaryButtonText: {
      color: colors.text.primary,
      fontSize: 16,
      fontWeight: "600",
    },

    // ===========================
    // Text
    // ===========================
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text.primary,
      marginBottom: 8,
    },

    subtitle: {
      fontSize: 16,
      color: colors.text.secondary,
      lineHeight: 24,
      marginBottom: 24,
    },

    description: {
      fontSize: 14,
      color: colors.text.tertiary,
      lineHeight: 22,
    },

    // ===========================
    // Inputs
    // ===========================
    inputContainer: {
      marginBottom: 20,
    },

    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text.primary,
      marginBottom: 8,
    },

    input: {
      height: 56,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      color: colors.text.primary,
      fontSize: 16,
    },

    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 2,
    },

    // ===========================
    // Divider
    // ===========================
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 24,
    },

    dividerText: {
      fontSize: 13,
      color: colors.text.tertiary,
      textAlign: "center",
      marginVertical: 8,
    },

    // ===========================
    // Footer
    // ===========================
    footer: {
      marginTop: 32,
      alignItems: "center",
    },

    footerText: {
      color: colors.text.secondary,
      fontSize: 14,
    },

    footerLink: {
      color: colors.primary,
      fontWeight: "700",
    },

    // ===========================
    // Error
    // ===========================
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 8,
      textAlign: "center",
    },

    successText: {
      color: colors.success,
      fontSize: 14,
      marginTop: 8,
      textAlign: "center",
    },

    // ===========================
    // Avatar
    // ===========================
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      marginBottom: 16,
    },

    // ===========================
    // Row
    // ===========================
    row: {
      flexDirection: "row",
      alignItems: "center",
    },

    spaceBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    center: {
      justifyContent: "center",
      alignItems: "center",
    },
  });
};

export type AuthStyles = ReturnType<typeof useAuthStyles>;
