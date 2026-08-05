import { Dimensions, StyleSheet } from "react-native";
import { useTheme } from "./theme";

export const useWelcomeScreenStyles = () => {
  const { colors, shadows } = useTheme();
  const { width, height } = Dimensions.get("window");

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "white" },

    header: {
      alignItems: "center",
      paddingVertical: 40,
      borderBottomWidth: 1,
      marginBottom: 30,
    },

    logo: {
      width: 250,
      height: 250,
      resizeMode: "contain",
      marginBottom: 12,
    },

    title: { fontSize: 22, fontWeight: "800" },

    tagline: {
      fontSize: 20,
      color: "#0B57D0",
      marginTop: 8,
      fontWeight: "700",
    },

    taglineSecondary: {
      fontSize: 20,
      color: "#0B57D0",
      marginTop: 2,
      fontWeight: "700",
    },

    subText: {
      fontSize: 14,
      marginTop: 10,
      textAlign: "center",
      paddingHorizontal: 28,
      lineHeight: 20,
    },

    scrollView: {
      flex: 1,
      width: "100%",
      backgroundColor: "white",
    },

    scrollContent: {
      flexGrow: 1,
      paddingBottom: 40,
      alignItems: "center",
    },

    contentWrapper: {
      width: "100%",
      maxWidth: width,
      paddingTop: 10,
      paddingHorizontal: 16,
      alignItems: "center",
    },

    selectRoleContainer: {
      width: "100%",
      paddingTop: 16,
      paddingHorizontal: 16,
      alignItems: "center",
    },

    headerRow: {
      width: "100%",
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      marginBottom: 16,
    },

    backButton: {
      position: "absolute",
      left: 0,

      width: 44,
      height: 44,
      borderRadius: 22,

      borderWidth: 1,

      justifyContent: "center",
      alignItems: "center",
    },

    roleTitle: {
      fontSize: 28,
      fontWeight: "800",
      textAlign: "center",
    },

    roleSubtitle: {
      fontSize: 14,
      textAlign: "center",
      marginBottom: 22,
      lineHeight: 20,
    },

    roleCards: {
      width: "100%",
    },

    roleCard: {
      width: "100%",
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
    },

    roleCardSelected: {
      borderWidth: 2,
      transform: [{ scale: 1.01 }],
    },

    roleCardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    roleCardImage: {
      width: 62,
      height: 62,
      borderRadius: 18,
      marginRight: 14,
    },

    roleCardIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    roleCardIcon: {
      fontSize: 20,
    },

    roleCardText: {
      flex: 1,
      paddingRight: 10,
    },

    roleCardTitle: {
      fontSize: 17,
      fontWeight: "700",
    },

    roleCardDescription: {
      fontSize: 13,
      marginTop: 5,
      lineHeight: 18,
    },

    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },

    radioSelected: {
      borderColor: "#FFFFFF",
    },

    radioFilled: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#FFFFFF",
    },

    heroCard: {
      width: "100%",
      borderRadius: 28,
      padding: 20,
      marginTop: 50,
      marginBottom: 24,
      borderWidth: 1,
      shadowColor: "#000",
    },

    heroBadgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },

    heroBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },

    heroBadgeText: {
      fontSize: 11,
      fontWeight: "600",
    },

    heroContent: {
      alignItems: "center",
    },

    heroEyebrow: {
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginBottom: 8,
    },

    heroStats: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 20,
      borderRadius: 18,
      padding: 12,
    },

    heroStat: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 6,
    },

    heroStatValue: {
      fontSize: 16,
      fontWeight: "800",
    },

    heroStatLabel: {
      fontSize: 11,
      marginTop: 3,
      textAlign: "center",
    },

    ctaWrap: {
      width: "100%",
      paddingHorizontal: 16,
      alignItems: "center",
      marginTop: 6,
    },

    continueBtn: {
      width: "100%",
      maxWidth: width - 32,
      backgroundColor: "#2563EB",
      paddingVertical: 18,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },

    continueBtnDisabled: {
      backgroundColor: "#94A3B8",
    },

    continueText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },

    helpText: {
      color: "#64748B",
      fontSize: 12,
      textAlign: "center",
    },

    section: { paddingHorizontal: 20, marginTop: 25 },

    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 12,
    },

    featureCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#EAF3FF",
      padding: 12,
      borderRadius: 12,
      marginBottom: 10,
    },

    featureIcon: { marginRight: 10 },

    featureText: { fontWeight: "600" },

    step: {
      fontSize: 13,
      marginBottom: 6,
      color: "#555",
    },

    card: {
      padding: 18,
      borderRadius: 14,
      marginBottom: 12,
    },

    cardTitle: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 15,
    },

    cardDesc: {
      color: "#FFF",
      fontSize: 12,
      marginTop: 4,
    },

    loginBtn: {
      borderWidth: 1,
      borderColor: "#4A90E2",
      padding: 14,
      borderRadius: 10,
      alignItems: "center",
    },

    loginText: { color: "#4A90E2", fontWeight: "600" },

    trustBox: {
      backgroundColor: "#EAF3FF",
      margin: 20,
      padding: 16,
      borderRadius: 12,
    },

    heroImageWrap: {
      width: "100%",
      height: 260,
      position: "relative",
      overflow: "hidden",
      marginTop: 20,
      marginBottom: -30,
    },

    heroImage: {
      width: "100%",
      height: "100%",
    },

    imageFade: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 120,
    },

    getStartedBtn: {
      width: "100%",
      maxWidth: width - 32,
      paddingVertical: 18,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 30,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },

    getStartedText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },

    loginLinkWrap: {
      paddingVertical: 6,
    },

    loginLink: {
      color: "#2563EB",
      fontSize: 15,
      fontWeight: "600",
    },

    trustTitle: {
      fontWeight: "700",
      marginBottom: 6,
    },

    trustText: {
      fontSize: 12,
      color: "#333",
    },

    testimonial: {
      backgroundColor: "#FFF",
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
    },

    quote: {
      fontStyle: "italic",
      color: "#444",
    },

    author: {
      marginTop: 6,
      fontSize: 12,
      color: "#888",
    },

    stats: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 30,
    },

    statCard: { alignItems: "center" },

    statNumber: { color: "#4A90E2", fontWeight: "700" },

    statLabel: { fontSize: 12, color: "#666" },

    footer: {
      marginTop: 40,
      marginBottom: 20,
      alignItems: "center",
    },

    themeToggleContainer: {
      position: "absolute",
      top: 0,
      right: 0,
      zIndex: 1,
    },
    headerWrapper: {
      width: "100%",
      alignItems: "center",
      paddingTop: 10,
    },
    footerText: {
      fontSize: 11,
      color: "#999",
    },
  });
};

export type WelcomeScreenStyles = ReturnType<typeof useWelcomeScreenStyles>;
