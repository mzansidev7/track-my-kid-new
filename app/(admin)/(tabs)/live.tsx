import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useTheme } from "./../../../styles/theme";

const quickStats = [
  { label: "Live Trips", value: "24", subtitle: "On the road", icon: "local-taxi", accent: "#10B981" },
  { label: "On Route", value: "18", subtitle: "Active", icon: "play-circle-fill", accent: "#3B82F6" },
  { label: "At School", value: "3", subtitle: "Arrived", icon: "school", accent: "#F59E0B" },
  { label: "Completed", value: "2", subtitle: "Today", icon: "flag", accent: "#EF4444" },
];

const trips = [
  {
    id: "TMK-024",
    driver: "Kabelo M.",
    route: "ABC Primary School",
    children: 14,
    currentStop: "3rd Stop",
    stopName: "Oak Ave",
    eta: "08:45 AM",
    status: "ON ROUTE",
    color: "#10B981",
  },
  {
    id: "TMK-018",
    driver: "Thabo K.",
    route: "Bloemfontein North",
    children: 11,
    currentStop: "2nd Stop",
    stopName: "Maple Street",
    eta: "08:30 AM",
    status: "ON ROUTE",
    color: "#10B981",
  },
  {
    id: "TMK-031",
    driver: "Sipho D.",
    route: "Greenfield College",
    children: 16,
    status: "AT SCHOOL",
    arrived: "08:10 AM",
    color: "#F59E0B",
  },
];

export default function LiveScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={[styles.topBar, { backgroundColor: "transparent" }]}> 
        <TouchableOpacity style={styles.menuButton}>
          <MaterialIcons name="menu" size={26} color={"#0F172A"} />
        </TouchableOpacity>
        <View style={styles.brandWrap}>
          <Image source={require("@/assets/images/logo.png")} style={styles.logo} />
          <View>
            <Text style={styles.brandText}>TRACK</Text>
            <Text style={styles.brandTextSecondary}>MY KID</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.notificationWrap}>
            <MaterialIcons name="notifications-none" size={22} color="#0F172A" />
            <View style={styles.badge}><Text style={styles.badgeText}>5</Text></View>
          </View>
          <TouchableOpacity style={styles.avatarWrap}>
            <MaterialIcons name="account-circle" size={36} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          {quickStats.map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface }]}> 
              <View style={[styles.statIcon, { backgroundColor: s.accent }]}>
                <MaterialIcons name={s.icon as any} size={20} color="#fff" />
              </View>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statSubtitle}>{s.subtitle}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.mapWrap, { backgroundColor: colors.surface }]}> 
          <View style={styles.mapPlaceholder}>
            {/* Simulated map markers */}
            <View style={[styles.mapMarker, { left: '38%', top: '28%', backgroundColor: '#10B981' }]}>
              <MaterialIcons name="local-taxi" size={18} color="#fff" />
            </View>
            <View style={[styles.mapMarker, { left: '62%', top: '36%', backgroundColor: '#10B981' }]}>
              <MaterialIcons name="local-taxi" size={18} color="#fff" />
            </View>
            <View style={[styles.mapMarker, { left: '22%', top: '52%', backgroundColor: '#F59E0B' }]}>
              <MaterialIcons name="local-taxi" size={18} color="#fff" />
            </View>
          </View>

          <View style={styles.mapControlsLeft}>
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.background }]}>
              <MaterialIcons name="filter-list" size={20} color="#0F172A" />
              <Text style={styles.controlText}>Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.background, marginTop: 8 }]}>
              <MaterialIcons name="refresh" size={20} color="#0F172A" />
              <Text style={styles.controlText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapControlsRight}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.background }]}>
              <MaterialIcons name="gps-fixed" size={20} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.background, marginTop: 8 }]}>
              <MaterialIcons name="add" size={20} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.background, marginTop: 8 }]}>
              <MaterialIcons name="remove" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Active Trips (18)</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {trips.map((t) => (
            <View key={t.id} style={styles.tripItem}>
              <View style={[styles.tripAccent, { backgroundColor: t.color }]} />
              <View style={styles.tripContent}>
                <View style={styles.tripLeftCol}>
                  <Image source={require("@/assets/images/driver.jpeg")} style={styles.vehicleImg} />
                  <View style={styles.tripTextWrap}>
                    <Text style={styles.tripIdText}>{t.id}</Text>
                    <Text style={styles.tripMetaText}>Driver: {t.driver}</Text>
                    <Text style={styles.tripMetaText}>Route: {t.route}</Text>
                    <Text style={styles.tripMetaText}>Children: {t.children}</Text>
                  </View>
                </View>

                <View style={styles.tripRightCol}>
                  {t.currentStop ? (
                    <>
                      <Text style={styles.smallLabel}>Current Stop</Text>
                      <Text style={styles.smallValue}>{t.stopName}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.smallLabel}>Status</Text>
                      <Text style={styles.smallValue}>{t.status === 'AT SCHOOL' ? `At School\nArrived at ${t.arrived}` : t.status}</Text>
                    </>
                  )}

                  <Text style={styles.etaLabel}>ETA</Text>
                  <Text style={styles.etaValue}>{t.eta || (t.arrived ? t.arrived : '')}</Text>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.ctaButton}>
            <MaterialIcons name="map" size={18} color="#fff" />
            <Text style={styles.ctaText}>View Full Live Map</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <View style={[styles.bottomNav, { backgroundColor: colors.background }]}> 
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="home" size={24} color="#6B7280" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItemActive}>
          <MaterialIcons name="location-on" size={24} color="#10B981" />
          <Text style={[styles.navText, { color: '#10B981' }]}>Live</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navCenterButton}>
          <MaterialIcons name="add" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="support-agent" size={24} color="#6B7280" />
          <Text style={styles.navText}>Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="more-horiz" size={24} color="#6B7280" />
          <Text style={styles.navText}>More</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12 },
  menuButton: { padding: 8 },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 36, height: 36, marginRight: 8 },
  brandText: { fontSize: 14, fontWeight: '800' },
  brandTextSecondary: { fontSize: 12, color: '#10B981', fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  notificationWrap: { marginRight: 12 },
  badge: { position: 'absolute', right: -6, top: -6, backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  avatarWrap: { marginLeft: 8 },
  content: { padding: 14, paddingBottom: 140 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, marginHorizontal: 6, alignItems: 'flex-start' },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  statSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  mapWrap: { height: 360, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  mapPlaceholder: { flex: 1, backgroundColor: '#F8FAFC' },
  mapMarker: { position: 'absolute', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  mapControlsLeft: { position: 'absolute', left: 12, top: 12 },
  controlBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  controlText: { marginLeft: 8, fontSize: 13, color: '#0F172A' },
  mapControlsRight: { position: 'absolute', right: 12, top: 12, alignItems: 'center' },
  iconBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  bottomPanel: { backgroundColor: '#fff', borderRadius: 16, marginTop: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, elevation: 6 },
  sheetHandle: { width: 60, height: 6, borderRadius: 4, backgroundColor: '#E6E6E6', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '800' },
  viewAllLink: { color: '#10B981', fontWeight: '700' },
  tripItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tripAccent: { width: 6, borderRadius: 4, marginRight: 12 },
  tripContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripLeftCol: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleImg: { width: 56, height: 56, borderRadius: 10, marginRight: 10 },
  tripTextWrap: { maxWidth: '62%' },
  tripIdText: { fontSize: 15, fontWeight: '800' },
  tripMetaText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  tripRightCol: { alignItems: 'flex-end' },
  smallLabel: { fontSize: 12, color: '#94A3B8' },
  smallValue: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  etaLabel: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
  etaValue: { fontSize: 14, fontWeight: '800', color: '#10B981' },
  ctaButton: { marginTop: 8, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingHorizontal: 12 },
  navItem: { alignItems: 'center' },
  navItemActive: { alignItems: 'center' },
  navText: { fontSize: 12, color: '#6B7280' },
  navCenterButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 22 },
});
