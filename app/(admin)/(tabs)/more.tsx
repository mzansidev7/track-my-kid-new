import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useTheme } from "../../../styles/theme";

const platformItems = [
  { key: 'users', label: 'Users', sub: 'Manage all users', icon: 'person' },
  { key: 'schools', label: 'Schools', sub: 'Manage schools', icon: 'school' },
  { key: 'parents', label: 'Parents', sub: 'Manage parents', icon: 'people' },
  { key: 'children', label: 'Children', sub: 'Manage children', icon: 'child-care' },
  { key: 'drivers', label: 'Drivers', sub: 'Manage drivers', icon: 'drive-eta' },
  { key: 'vehicles', label: 'Vehicles', sub: 'Manage vehicles', icon: 'directions-car' },
  { key: 'routes', label: 'Routes', sub: 'Manage routes', icon: 'settings-ethernet' },
  { key: 'trips', label: 'Trips', sub: 'Manage trips', icon: 'local-taxi' },
];

const operationsItems = [
  { key: 'live', label: 'Live Tracking', sub: 'View live vehicles', icon: 'location-on' },
  { key: 'attendance', label: 'Attendance', sub: 'View attendance', icon: 'check-circle' },
  { key: 'incidents', label: 'Incidents', sub: 'Manage incidents', icon: 'report-problem' },
  { key: 'announcements', label: 'Announcements', sub: 'Send announcements', icon: 'campaign' },
  { key: 'notifications', label: 'Notifications', sub: 'System notifications', icon: 'notifications' },
  { key: 'reports', label: 'Reports', sub: 'View reports', icon: 'bar-chart' },
  { key: 'support', label: 'Support Tickets', sub: 'Manage tickets', icon: 'support-agent' },
  { key: 'feedback', label: 'Feedback', sub: 'View feedback', icon: 'feedback' },
];

const businessItems = [
  { key: 'subscriptions', label: 'Subscriptions', sub: 'Manage plans', icon: 'credit-card' },
  { key: 'payments', label: 'Payments', sub: 'Transaction history', icon: 'account-balance-wallet' },
  { key: 'activity', label: 'Activity Logs', sub: 'System activities', icon: 'history' },
  { key: 'settings', label: 'Settings', sub: 'System settings', icon: 'settings' },
  { key: 'admins', label: 'Admins', sub: 'Manage admins', icon: 'admin-panel-settings' },
  { key: 'roles', label: 'Roles & Permissions', sub: 'Access control', icon: 'lock' },
  { key: 'appconfig', label: 'App Config', sub: 'App configuration', icon: 'tune' },
  { key: 'dataexport', label: 'Data Export', sub: 'Export data', icon: 'file-download' },
];

const quickActions = [
  { key: 'add-school', label: 'Add School', icon: 'add' },
  { key: 'add-driver', label: 'Add Driver', icon: 'person-add' },
  { key: 'add-vehicle', label: 'Add Vehicle', icon: 'directions-car' },
  { key: 'create-route', label: 'Create Route', icon: 'settings-ethernet' },
  { key: 'send-notice', label: 'Send Notice', icon: 'send' },
];

export default function AdminMore() {
  const router = useRouter();
  const { colors } = useTheme();

  const Tile = ({ item, onPress }: any) => (
    <TouchableOpacity style={[styles.tile, { backgroundColor: '#fff' }]} onPress={onPress}>
      <View style={styles.tileIcon}><MaterialIcons name={item.icon as any} size={22} color="#10B981" /></View>
      <Text style={styles.tileLabel}>{item.label}</Text>
      <Text style={styles.tileSub}>{item.sub}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>More</Text>
            <Text style={styles.subtitle}>Admin Panel</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconRound}><MaterialIcons name="notifications-none" size={20} color="#0F172A" /></TouchableOpacity>
            <TouchableOpacity style={styles.avatarRound}><MaterialIcons name="account-circle" size={36} color="#0F172A" /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <View style={styles.profileIcon}><MaterialIcons name="verified" size={24} color="#10B981" /></View>
            <View>
              <Text style={styles.profileName}>Admin</Text>
              <Text style={styles.profileRole}>Super Administrator</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
        </View>

        <Text style={styles.sectionHeader}>PLATFORM MANAGEMENT</Text>
        <View style={styles.grid}>
          {platformItems.map((it) => (
            <Tile key={it.key} item={it} onPress={() => router.push(`/(admin)/pages/${it.key}`)} />
          ))}
        </View>

        <Text style={styles.sectionHeader}>OPERATIONS</Text>
        <View style={styles.grid}>
          {operationsItems.map((it) => (
            <Tile key={it.key} item={it} onPress={() => router.push(`/(admin)/pages/${it.key}`)} />
          ))}
        </View>

        <Text style={styles.sectionHeader}>BUSINESS & SYSTEM</Text>
        <View style={styles.grid}>
          {businessItems.map((it) => (
            <Tile key={it.key} item={it} onPress={() => router.push(`/(admin)/pages/${it.key}`)} />
          ))}
        </View>

        <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
        <View style={styles.quickRow}>
          {quickActions.map((a) => (
            <TouchableOpacity key={a.key} style={styles.quickBtn} onPress={() => router.push(`/(admin)/pages/${a.key}`)}>
              <MaterialIcons name={a.icon as any} size={18} color="#10B981" />
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.helpRow} onPress={() => router.push('/(admin)/pages/support')}>
          <Text style={styles.helpText}>Help & Support</Text>
          <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 140 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  logo: { width: 64, height: 64 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, color: '#6B7280' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconRound: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarRound: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  profileCard: { backgroundColor: '#DCFCE7', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  profileLeft: { flexDirection: 'row', alignItems: 'center' },
  profileIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E6F9ED', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileName: { fontSize: 16, fontWeight: '800' },
  profileRole: { fontSize: 12, color: '#6B7280' },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginTop: 8, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  tile: { width: '48%', padding: 14, borderRadius: 12, marginBottom: 8, minHeight: 100, justifyContent: 'center' },
  tileIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  tileLabel: { fontSize: 14, fontWeight: '800' },
  tileSub: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  quickBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  quickLabel: { marginLeft: 8, fontWeight: '700' },
  helpRow: { marginTop: 8, backgroundColor: '#fff', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helpText: { fontSize: 14, fontWeight: '700' },
});
