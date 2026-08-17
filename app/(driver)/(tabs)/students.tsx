import React from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/styles/theme";

const sampleStudents = [
  {
    id: "1",
    name: "Amelia Johnson",
    school: "Curro Hazeldean",
    grade: "Grade 3",
    status: "ONBOARD",
    pickedUp: "07:15 AM",
    avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "2",
    name: "Liam Williams",
    school: "Curro Hazeldean",
    grade: "Grade 4",
    status: "ONBOARD",
    pickedUp: "07:20 AM",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "3",
    name: "Zoe Mokoena",
    school: "The Meadows Primary",
    grade: "Grade 2",
    status: "ONBOARD",
    pickedUp: "07:55 AM",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "4",
    name: "Ethan van der Merwe",
    school: "Lombardy Primary",
    grade: "Grade 5",
    status: "CURRENT STOP",
    pickedUp: "Onboard",
    avatar: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80",
    highlight: true,
  },
  {
    id: "5",
    name: "Sarah Khan",
    school: "Lombardy Primary",
    grade: "Grade 1",
    status: "ONBOARD",
    pickedUp: "08:18 AM",
    avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80",
  },
];

const Students = () => {
  const { colors } = useTheme();
  const router = useRouter();


  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}> 

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroCard, {marginTop: 20}]}> 
          <View style={styles.heroIconCircle}> 
            <MaterialIcons name="directions-bus" size={26} color="#0F9D58" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.heroLabel}>Current Route</Text>
            <Text style={styles.heroTitle}>Pretoria East - Morning Route</Text>
            <Text style={styles.heroSubtitle}>Curro Hazeldean → Various Schools</Text>
          </View>
          <View style={styles.heroBadge}> 
            <Text style={styles.heroBadgeText}>IN PROGRESS</Text>
          </View>
        </View>

        <View style={styles.heroStats}> 
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Children Onboard</Text>
            <Text style={styles.heroStatValue}>12 / 16</Text>
          </View>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Next Stop</Text>
            <Text style={styles.heroStatValue}>Lombardy Estate</Text>
            <Text style={styles.heroStatMeta}>ETA 5 min</Text>
          </View>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Route Progress</Text>
            <Text style={styles.heroStatValue}>40%</Text>
          </View>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Distance Left</Text>
            <Text style={styles.heroStatValue}>18.4 km</Text>
            <Text style={styles.heroStatMeta}>Est. 45 min</Text>
          </View>
        </View>

        <View style={styles.tabRow}> 
          <TouchableOpacity style={[styles.tabItem, styles.tabActive]}>
            <Text style={[styles.tabText, styles.tabTextActive]}>Onboard (12)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Text style={styles.tabText}>Not Picked Up (3)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Text style={styles.tabText}>Dropped Off (7)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBanner}> 
          <View style={styles.infoBadge}> 
            <MaterialIcons name="shield" size={20} color="#0F9D58" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>All children are accounted for</Text>
            <Text style={styles.infoSubtitle}>Last updated: Just now</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.infoAction}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}> 
          {sampleStudents.map((student) => (
            <View
              key={student.id}
              style={[
                styles.studentRow,
                student.highlight && {
                  backgroundColor: "rgba(15, 157, 88, 0.08)",
                  borderColor: "rgba(15, 157, 88, 0.18)",
                },
              ]}
            >
              <Image source={{ uri: student.avatar }} style={styles.studentAvatar} />
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentSchool}>{student.school}</Text>
                <Text style={styles.studentGrade}>{student.grade}</Text>
              </View>
              <View style={styles.studentMeta}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{student.status}</Text>
                </View>
                <Text style={styles.studentPickedUp}>{student.pickedUp}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.viewAllButton}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="groups" size={20} color="#0F9D58" />
            <Text style={styles.viewAllText}>View All Children</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#0F9D58" />
        </TouchableOpacity>

        <View style={styles.reminderCard}> 
          <View style={styles.reminderIconBox}> 
            <MaterialIcons name="safety-check" size={22} color="#F97316" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.reminderTitle}>Safety Reminder</Text>
            <Text style={styles.reminderText}>Please ensure all children are seated and wearing seatbelts.</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.text.secondary} />
        </View>
      </ScrollView>
    </View>
  );
};

export default Students;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "transparent",
  },
  topIconButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  topRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  avatarShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#0F9D58",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginBottom: 4,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  heroBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#0F9D58",
    fontWeight: "700",
    fontSize: 12,
  },
  heroStats: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    textAlign: "center",
  },
  heroStatValue: {
    color: "#fff",
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
    fontSize: 15,
  },
  heroStatMeta: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,157,88,0.16)",
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "rgba(15,157,88,0.08)",
  },
  tabText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#0F9D58",
  },
  infoBanner: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(15, 157, 88, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.16)",
    flexDirection: "row",
    alignItems: "center",
  },
  infoBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(15, 157, 88, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F9D58",
  },
  infoSubtitle: {
    fontSize: 12,
    color: "#065F46",
    marginTop: 4,
  },
  infoAction: {
    color: "#0F9D58",
    fontWeight: "700",
  },
  listCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.08)",
    overflow: "hidden",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 157, 88, 0.08)",
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  studentInfo: {
    flex: 1,
    paddingLeft: 14,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  studentSchool: {
    color: "#4B5563",
    marginTop: 4,
    fontSize: 13,
  },
  studentGrade: {
    color: "#6B7280",
    marginTop: 2,
    fontSize: 12,
  },
  studentMeta: {
    alignItems: "flex-end",
  },
  statusPill: {
    backgroundColor: "rgba(15, 157, 88, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    color: "#0F9D58",
    fontSize: 11,
    fontWeight: "700",
  },
  studentPickedUp: {
    color: "#0F9D58",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "700",
  },
  viewAllButton: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#0F9D58",
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(15, 157, 58, 0.04)",
  },
  viewAllText: {
    color: "#0F9D58",
    fontWeight: "700",
    marginLeft: 8,
  },
  reminderCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FFEDD5",
    flexDirection: "row",
    alignItems: "center",
  },
  reminderIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(249, 115, 22, 0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  reminderText: {
    color: "#92400E",
    marginTop: 4,
    fontSize: 13,
  },
});
