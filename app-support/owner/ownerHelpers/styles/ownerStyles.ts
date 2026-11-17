import { Dimensions, StyleSheet } from "react-native";
import { useOwnerTheme } from "../../../../styles/theme";

export const useOwnerStyles = () => {
  const { width, height } = Dimensions.get("window");
  const { colors, shadows } = useOwnerTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#050907",
    },
    header: {
      backgroundColor: "#0D1713",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#294238",
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerDate: {
      fontSize: 11,
      color: "#B1C4BC",
      fontWeight: "500",
    },
    headerIcons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
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
      paddingVertical: 10,
      gap: 8,
    },
    summaryCard: {
      backgroundColor: "#0D1713",
      borderRadius: 14,
      padding: 10,
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
      fontSize: 14,
      fontWeight: "700",
    },
    summaryBadge: {
      backgroundColor: "#13231D",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    summaryBadgeText: {
      fontSize: 11,
      color: "#35D9B3",
      fontWeight: "600",
    },
    summaryStatsRow: {
      flexDirection: "row",
      gap: 8,
    },
    summaryStatBox: {
      flex: 1,
      backgroundColor: "#0D1713",
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      alignItems: "center",
    },
    summaryStatValue: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 2,
    },
    summaryStatLabel: {
      fontSize: 10,
      fontWeight: "500",
    },
    metricsRow: {
      flexDirection: "row",
      gap: 12,
    },
    metricCard: {
      flex: 1,
      backgroundColor: "#0D1713",
      borderRadius: 12,
      padding: 10,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    metricCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    metricIconBox: {
      width: 34,
      height: 34,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    metricPercentage: {
      fontSize: 12,
      fontWeight: "600",
      color: "#35D9B3",
    },
    metricValue: {
      fontSize: 18,
      fontWeight: "700",
      color: "#F4FBF8",
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: "#B1C4BC",
      marginBottom: 2,
    },
    metricSubtext: {
      fontSize: 11,
      color: "#82968D",
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#F4FBF8",
    },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#13231D",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#35D9B3",
    },
    liveText: {
      fontSize: 12,
      color: "#35D9B3",
      fontWeight: "600",
    },
    routeBadge: {
      backgroundColor: "#13231D",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    routeBadgeText: {
      fontSize: 12,
      color: "#35D9B3",
      fontWeight: "600",
    },
    mapPlaceholder: {
      borderRadius: 16,
      padding: 12,
      gap: 8,
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
      backgroundColor: "#13231D",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    mapPillText: {
      fontSize: 11,
      color: "#35D9B3",
      fontWeight: "600",
    },
    mapCanvas: {
      height: 160,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#294238",
    },
    fullScreenMapContainer: {
      flex: 1,
      backgroundColor: "#0D1713",
    },
    fullScreenMapHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#294238",
    },
    fullScreenMapTitle: {
      fontSize: 16,
      fontWeight: "700",
    },
    fullScreenMapClose: {
      fontSize: 14,
      color: "#35D9B3",
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
      borderColor: "#294238",
    },
    mapFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    mapStat: {
      flex: 1,
      backgroundColor: "#0D1713",
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
      backgroundColor: "#0D1713",
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
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
      color: "#F4FBF8",
      marginBottom: 4,
    },
    routeDriver: {
      fontSize: 12,
      color: "#B1C4BC",
      marginBottom: 2,
    },
    routeStudents: {
      fontSize: 11,
      color: "#82968D",
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
      color: "#B1C4BC",
      fontWeight: "500",
    },
    chartContainer: {
      backgroundColor: "#0D1713",
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
      backgroundColor: "#00B894",
    },
    afternoonBar: {
      backgroundColor: "#13231D",
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
      backgroundColor: "#00B894",
    },
    legendDotAfternoon: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#13231D",
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
      backgroundColor: "#00B894",
    },
    targetBar: {
      backgroundColor: "#13231D",
    },
    chartSubtitle: {
      fontSize: 12,
      color: "#82968D",
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
      color: "#82968D",
      marginTop: 12,
    },
  });
};
export type OwnerStyles = ReturnType<typeof useOwnerStyles>;

export const driversPageStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050907",
  },

  statusCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 18,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: "#0D1713",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 4,
  },
  statusCardNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F4FBF8",
  },
  statusCardLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#B1C4BC",
    textTransform: "uppercase",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1713",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#294238",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainerCompact: {
    flex: 1,
    marginHorizontal: 0,
    marginVertical: 10,
    height: 40,
    paddingVertical: 0,
    borderRadius: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerSafeArea: { backgroundColor: "#050907" },
  managementHeaderRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 10,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  headerSpacer: { flex: 1 },
  managementHeaderTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  filterButton: {
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#0D1713",
    borderWidth: 1,
    borderColor: "#294238",
  },
  filterRow: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingBottom: 5,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#294238",
    backgroundColor: "#13231D",
  },
  filterChipSelected: { backgroundColor: "#00B894", borderColor: "#00B894" },
  filterChipText: { color: "#B1C4BC", fontSize: 10, fontWeight: "600" },
  filterChipTextSelected: { color: "#FFFFFF" },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#F4FBF8",
    paddingVertical: 4,
  },

  clearButton: {
    padding: 4,
    marginLeft: 8,
  },

  list: {
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: "#B1C4BC",
  },

  errorText: {
    fontSize: 15,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 14,
  },

  /* CARD */
  card: {
    backgroundColor: "#0D1713",
    padding: 12,
    borderRadius: 13,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#294238",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F4FBF8",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#13231D",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#35D9B3",
    fontWeight: "800",
    fontSize: 15,
  },

  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  cardMeta: {
    flex: 1,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },

  activePill: {
    backgroundColor: "#13231D",
  },

  inactivePill: {
    backgroundColor: "#13231D",
  },

  activeText: {
    color: "#35D9B3",
  },

  inactiveText: {
    color: "#B1C4BC",
  },

  cardStats: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },

  statItem: {
    backgroundColor: "#13231D",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    alignItems: "center",
  },

  statLabel: {
    marginTop: 4,
    fontSize: 11,
    color: "#B1C4BC",
    textTransform: "uppercase",
  },

  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F4FBF8",
  },

  summaryCard: {
    backgroundColor: "#0D1713",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#294238",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: "#13231D",
    marginHorizontal: 16,
    marginBottom: 16,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F4FBF8",
  },

  summarySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#B1C4BC",
  },

  summaryMetrics: {
    flexDirection: "row",
    gap: 12,
  },

  metricBlock: {
    alignItems: "center",
  },

  metricNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F4FBF8",
  },

  metricLabel: {
    fontSize: 11,
    color: "#B1C4BC",
  },

  listEmptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },

  emptyState: {
    padding: 24,
    backgroundColor: "#0D1713",
    borderRadius: 18,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#294238",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#F4FBF8",
  },

  emptyBody: {
    textAlign: "center",
    color: "#B1C4BC",
    marginBottom: 16,
    lineHeight: 20,
  },

  refreshButton: {
    backgroundColor: "#7ED321",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },

  refreshButtonText: {
    color: "#FFF",
    fontWeight: "700",
  },

  subText: {
    fontSize: 13,
    color: "#B1C4BC",
  },

  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  /* STATUS */
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  active: {
    backgroundColor: "rgba(126,211,33,0.12)",
  },

  inactive: {
    backgroundColor: "#13231D",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7ED321",
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#0D1713",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },

  modalHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7ED321",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F4FBF8",
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  profileText: {
    fontSize: 12,
    color: "#B1C4BC",
  },

  infoCard: {
    backgroundColor: "#0D1713",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },

  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  label: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#B1C4BC",
  },

  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F4FBF8",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16,
  },

  modalText: {
    fontSize: 13,
    color: "#B1C4BC",
  },

  closeBtn: {
    marginTop: 18,
    backgroundColor: "#7ED321",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  closeText: {
    color: "#FFF",
    fontWeight: "700",
  },
  cardInactive: {
    backgroundColor: "#050907",
    opacity: 0.7,
  },
  nameInactive: {
    color: "#B1C4BC",
  },
  subTextInactive: {
    color: "#B1C4BC",
  },
  avatarTextInactive: {
    color: "#B1C4BC",
  },
  driverDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    marginHorizontal: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#13231D",
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B1C4BC",
  },
  pageHeader: {
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  pageHeaderTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 4,
  },
  pageHeaderSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  addButton: {
    marginTop: 20,
    backgroundColor: "#0D1713",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  addButtonText: {
    color: "#8B5CF6",
    fontSize: 15,
    fontWeight: "700",
  },
});

export const ownersProfileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050907" },
  logoBackgroundContainer: {
    backgroundColor: "transparent",
  },
  pageForeground: {
    flex: 1,
  },
  safeArea: { backgroundColor: "#050907" },
  logoBackgroundHeader: { backgroundColor: "transparent" },
  pageBackgroundImage: { opacity: 0.025 },
  logoSurface: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  logoInsetSurface: {
    backgroundColor: "rgba(238, 245, 252, 0.96)",
  },
  pageHeader: {
    minHeight: 54,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeaderTitle: {
    position: "absolute",
    left: 60,
    right: 60,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  profileScroll: {},
  content: { paddingHorizontal: 16 },
  scrollContent: { paddingTop: 0, paddingBottom: 18 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#050907",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Profile Header
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: "#B1C4BC",
    fontSize: 16,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#00B894",
    borderRadius: 9,
  },
  retryText: {
    color: "#FFF",
    fontWeight: "600",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1713",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#294238",
    marginBottom: 10,
  },
  accountAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#13231D",
    justifyContent: "center",
    alignItems: "center",
  },
  accountAvatarText: {
    fontSize: 24,
    color: "#35D9B3",
    fontWeight: "800",
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F4FBF8",
    marginBottom: 4,
  },
  accountRole: {
    fontSize: 14,
    color: "#B1C4BC",
    marginBottom: 4,
  },
  accountSince: {
    fontSize: 12,
    color: "#B1C4BC",
  },
  profileSummary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "#0D1713",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  profileAvatarWrap: {
    width: 92,
    height: 92,
    padding: 4,
    borderRadius: 46,
    backgroundColor: "#0D1713",
    borderWidth: 1,
    borderColor: "#294238",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  profileIdentity: {
    flex: 1,
    marginLeft: 12,
  },
  ownerBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#13231D",
  },
  ownerBadgeText: {
    color: "#35D9B3",
    fontSize: 11,
    fontWeight: "700",
  },
  contactCard: {
    backgroundColor: "#0D1713",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#294238",
    marginBottom: 12,
  },
  profileDetailRow: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#294238",
  },
  lastProfileDetailRow: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    width: 30,
  },
  profileDetailText: {
    flex: 1,
    paddingVertical: 8,
  },
  detailLabel: {
    color: "#B1C4BC",
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    color: "#F4FBF8",
    fontSize: 13,
    fontWeight: "500",
  },
  sectionCard: {
    backgroundColor: "#0D1713",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#294238",
  },
  overviewHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  overviewDescription: {
    color: "#B1C4BC",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  statsCard: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#13231D",
    borderRadius: 9,
    marginBottom: 9,
    paddingVertical: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: "#F4FBF8",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  statLabel: {
    color: "#B1C4BC",
    fontSize: 10,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: "#13231D",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#F4FBF8",
    marginBottom: 5,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#294238",
  },
  lastSettingRow: {
    borderBottomWidth: 0,
  },
  settingRowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F4FBF8",
  },
  settingRowSubtitle: {
    fontSize: 13,
    color: "#B1C4BC",
    marginTop: 4,
    maxWidth: 250,
  },
  logoutBtn: {
    backgroundColor: "#13231D",
    padding: 13,
    borderRadius: 11,
    alignItems: "center",
    marginTop: 2,
    marginBottom: 24,
  },
  logoutText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13, 31, 51, 0.48)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#0D1713",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#294238",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F4FBF8",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    color: "#B1C4BC",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#13231D",
  },
  modalConfirmButton: {
    backgroundColor: "#13231D",
  },
  modalCancelText: {
    color: "#374151",
    fontWeight: "700",
  },
  modalConfirmText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
