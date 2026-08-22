import { Dimensions, StyleSheet } from "react-native";
import { useTheme } from "../../../../styles/theme";

export const useOwnerStyles = () => {
  const { width, height } = Dimensions.get("window");
  const { colors, shadows } = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F5F5F5",
    },
    header: {
      backgroundColor: "#FFF",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerDate: {
      fontSize: 13,
      color: "#6B7280",
      fontWeight: "500",
    },
    headerIcons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    avatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 14,
      fontWeight: "700",
    },
    scrollContent: {
      paddingBottom: 30,
    },
    metricsSection: {
      paddingHorizontal: 16,
      paddingVertical: 20,
      gap: 12,
    },
    summaryCard: {
      backgroundColor: "#FFF",
      borderRadius: 14,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    summaryCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    summaryCardTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    summaryBadge: {
      backgroundColor: "#DBEAFE",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    summaryBadgeText: {
      fontSize: 11,
      color: "#2563EB",
      fontWeight: "600",
    },
    summaryStatsRow: {
      flexDirection: "row",
      gap: 10,
    },
    summaryStatBox: {
      flex: 1,
      backgroundColor: "#F9FAFB",
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      alignItems: "center",
    },
    summaryStatValue: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 2,
    },
    summaryStatLabel: {
      fontSize: 11,
      fontWeight: "500",
    },
    metricsRow: {
      flexDirection: "row",
      gap: 12,
    },
    metricCard: {
      flex: 1,
      backgroundColor: "#FFF",
      borderRadius: 12,
      padding: 16,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    metricCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    metricIconBox: {
      width: 40,
      height: 40,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    metricPercentage: {
      fontSize: 12,
      fontWeight: "600",
      color: "#10B981",
    },
    metricValue: {
      fontSize: 22,
      fontWeight: "700",
      color: "#1F2937",
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: "#4B5563",
      marginBottom: 2,
    },
    metricSubtext: {
      fontSize: 11,
      color: "#9CA3AF",
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#1F2937",
    },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#ECFDF5",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#10B981",
    },
    liveText: {
      fontSize: 12,
      color: "#10B981",
      fontWeight: "600",
    },
    routeBadge: {
      backgroundColor: "#DBEAFE",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    routeBadgeText: {
      fontSize: 12,
      color: "#0284C7",
      fontWeight: "600",
    },
    mapPlaceholder: {
      borderRadius: 16,
      padding: 16,
      gap: 12,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    mapHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    mapHeaderTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    mapHeaderSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    mapPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#ECFDF5",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    mapPillText: {
      fontSize: 11,
      color: "#10B981",
      fontWeight: "600",
    },
    mapCanvas: {
      height: 160,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#E5E7EB",
    },
    fullScreenMapContainer: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    fullScreenMapHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
    },
    fullScreenMapTitle: {
      fontSize: 16,
      fontWeight: "700",
    },
    fullScreenMapClose: {
      fontSize: 14,
      color: "#2563EB",
      fontWeight: "600",
    },
    fullScreenMap: {
      flex: 1,
    },
    mapPin: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: "#FFFFFF",
    },
    mapFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    mapStat: {
      flex: 1,
      backgroundColor: "#F9FAFB",
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    mapStatValue: {
      fontSize: 13,
      fontWeight: "700",
    },
    mapStatLabel: {
      fontSize: 10,
      marginTop: 2,
    },
    routeItem: {
      backgroundColor: "#FFF",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    routeItemContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    routeItemLeft: {
      flex: 1,
    },
    routeItemRight: {
      alignItems: "flex-end",
      gap: 8,
    },
    routeName: {
      fontSize: 14,
      fontWeight: "700",
      color: "#1F2937",
      marginBottom: 4,
    },
    routeDriver: {
      fontSize: 12,
      color: "#6B7280",
      marginBottom: 2,
    },
    routeStudents: {
      fontSize: 11,
      color: "#9CA3AF",
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "600",
    },
    routeEta: {
      fontSize: 11,
      color: "#6B7280",
      fontWeight: "500",
    },
    chartContainer: {
      backgroundColor: "#FFF",
      borderRadius: 12,
      minHeight: 140,
      paddingVertical: 16,
      paddingHorizontal: 12,
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    chartBarsRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      height: 100,
    },
    chartColumn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-end",
      marginHorizontal: 2,
    },
    barStack: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 4,
      height: 84,
    },
    bar: {
      width: 8,
      borderRadius: 4,
      minHeight: 12,
    },
    morningBar: {
      backgroundColor: "#4F46E5",
    },
    afternoonBar: {
      backgroundColor: "#F59E0B",
    },
    dayLabel: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: "600",
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDotMorning: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#4F46E5",
    },
    legendDotAfternoon: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#F59E0B",
    },
    legendText: {
      fontSize: 11,
      fontWeight: "500",
    },
    revenueChartRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      height: 100,
    },
    revenueChartColumn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-end",
      marginHorizontal: 2,
    },
    revenueBarStack: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 4,
      height: 84,
    },
    revenueBar: {
      width: 8,
      borderRadius: 4,
      minHeight: 10,
    },
    actualBar: {
      backgroundColor: "#4F46E5",
    },
    targetBar: {
      backgroundColor: "#F59E0B",
    },
    chartSubtitle: {
      fontSize: 12,
      color: "#9CA3AF",
      marginBottom: 12,
    },
    loadingContainer: {
      height: 200,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 14,
      color: "#9CA3AF",
      marginTop: 12,
    },
  });
};
export type OwnerStyles = ReturnType<typeof useOwnerStyles>;
