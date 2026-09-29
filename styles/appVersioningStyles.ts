import { StyleSheet } from "react-native";

export const appVersionStyles = StyleSheet.create({
  versionContainer: {
    alignItems: "center",
    marginTop: 30,
    paddingBottom: 20,
  },

  appName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },

  versionBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },

  versionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
});
