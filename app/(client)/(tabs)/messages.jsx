import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import ClientHeader from "../components/ClientHeader";
import { AuthContext } from "../../../context/authContext/auth-context";
import { BASE_URL } from "../../../url";

const tabs = ["All", "Drivers", "Schools", "Owners"];

const getRoleColor = (role) => {
  switch (role) {
    case "driver":
      return "#CFEAF7";
    case "school":
      return "#D9F2FF";
    case "owner":
      return "#E7E5FF";
    default:
      return "#E2E8F0";
  }
};

const getInitials = (name = "") => {
  const clean = name.trim();
  if (!clean) return "?";

  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
};

const formatConversationTime = (value) => {
  if (!value) return "Now";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Now";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Now";
  }
};

const ClientMessages = () => {
  const { user } = useContext(AuthContext);
  const [selectedTab, setSelectedTab] = useState("All");
  const [conversations, setConversations] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user?.token) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/client/conversations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }

      const data = await response.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading client conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  const fetchLinkedContacts = useCallback(async () => {
    if (!user?.token) {
      setContactOptions([]);
      return;
    }

    try {
      const [driversRes, ownersRes, schoolsRes] = await Promise.all([
        fetch(`${BASE_URL}/client/linked-drivers`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${BASE_URL}/client/linked-owners`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${BASE_URL}/client/linked-schools`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);

      const [driversData, ownersData, schoolsData] = await Promise.all([
        driversRes.ok ? driversRes.json() : [],
        ownersRes.ok ? ownersRes.json() : [],
        schoolsRes.ok ? schoolsRes.json() : [],
      ]);

      const mappedDrivers = (Array.isArray(driversData) ? driversData : []).map(
        (driver) => ({
          id: driver?.users?.id || driver?.id,
          userId: driver?.users?.id || driver?.user_id,
          name: driver?.users?.name || "Driver",
          role: "driver",
          type: "client_driver",
          subtitle: driver?.vehicle_plate_number || "Driver",
        }),
      );

      const mappedOwners = (Array.isArray(ownersData) ? ownersData : []).map(
        (owner) => ({
          id: owner?.users?.id || owner?.id,
          userId: owner?.users?.id || owner?.user_id,
          name: owner?.company_name || owner?.users?.name || "Fleet owner",
          role: "owner",
          type: "client_owner",
          subtitle: owner?.company_name ? "Fleet owner" : owner?.users?.name,
        }),
      );

      const mappedSchools = (Array.isArray(schoolsData) ? schoolsData : []).map(
        (school) => ({
          id: school?.id,
          userId: school?.userId,
          name: school?.name || "School",
          role: "school",
          type: "client_school",
          subtitle: school?.address || school?.userName || "School contact",
        }),
      );

      setContactOptions([...mappedDrivers, ...mappedOwners, ...mappedSchools]);
    } catch (error) {
      console.error("Error loading linked contacts:", error);
      setContactOptions([]);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchConversations();
    fetchLinkedContacts();
  }, [fetchConversations, fetchLinkedContacts]);

  const startConversation = async (contact) => {
    if (!contact?.userId || !contact?.type || !user?.token) {
      Alert.alert("Missing contact", "This contact cannot be messaged yet.");
      return;
    }

    try {
      setStartingConversation(true);
      const response = await fetch(`${BASE_URL}/client/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          otherUserId: contact.userId,
          conversationType: contact.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to start conversation");
      }

      setContactSheetVisible(false);
      await fetchConversations();
      Alert.alert(
        "Conversation started",
        `You can now message ${contact.name}.`,
      );
    } catch (error) {
      console.error("Error starting conversation:", error);
      Alert.alert(
        "Message failed",
        error.message || "Unable to start conversation.",
      );
    } finally {
      setStartingConversation(false);
    }
  };

  const visibleConversations = useMemo(() => {
    if (selectedTab === "All") return conversations;

    const roleMap = {
      Drivers: "driver",
      Schools: "school",
      Owners: "owner",
    };

    return conversations.filter(
      (item) =>
        (item.other_participant?.role || "").toLowerCase() ===
        roleMap[selectedTab],
    );
  }, [conversations, selectedTab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ClientHeader
        title="My Messages"
        subtitle="Schools, drivers and fleet owners"
        showBackButton={true}
      />
      <View style={styles.container}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={24} color="#64748B" />
          <Text style={styles.searchText}>Search messages or contacts</Text>
          <TouchableOpacity style={styles.filterButton}>
            <MaterialIcons name="tune" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {contactSheetVisible && (
          <View style={styles.contactSheet}>
            <View style={styles.contactHeaderRow}>
              <Text style={styles.contactTitle}>Start a conversation</Text>
              <TouchableOpacity onPress={() => setContactSheetVisible(false)}>
                <MaterialIcons name="close" size={22} color="#334155" />
              </TouchableOpacity>
            </View>

            {contactOptions.length === 0 ? (
              <Text style={styles.emptySubtext}>
                Link a driver, owner or school to start messaging.
              </Text>
            ) : (
              contactOptions.map((contact) => (
                <TouchableOpacity
                  key={`${contact.type}-${contact.userId || contact.id}`}
                  style={styles.contactItem}
                  onPress={() => startConversation(contact)}
                  disabled={startingConversation}
                >
                  <View
                    style={[
                      styles.contactAvatar,
                      { backgroundColor: getRoleColor(contact.role) },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {getInitials(contact.name)}
                    </Text>
                  </View>

                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactSubtitle}>
                      {contact.subtitle}
                    </Text>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading conversations...</Text>
            </View>
          ) : visibleConversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No messages yet.</Text>
              <Text style={styles.emptySubtext}>
                Conversations with schools, drivers, and fleet owners will
                appear here.
              </Text>
            </View>
          ) : (
            visibleConversations.map((item) => {
              const participant = item.other_participant || {};
              const role = (participant.role || "").toLowerCase();
              const lastMessage = item.last_message || {};
              const preview = lastMessage.content || "Start a conversation";
              const time = formatConversationTime(
                item.last_message_at || lastMessage.sent_at,
              );
              const unread = lastMessage.is_read === false ? 1 : 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.messageRow}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: getRoleColor(role) },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {getInitials(participant.name)}
                    </Text>
                  </View>

                  <View style={styles.messageBody}>
                    <View style={styles.messageTopRow}>
                      <Text style={styles.senderName}>
                        {participant.name || "Unknown contact"}
                      </Text>
                      <Text style={styles.time}>{time}</Text>
                    </View>

                    <Text style={styles.messageTitle}>
                      {role === "driver"
                        ? "Driver update"
                        : role === "school"
                          ? "School notice"
                          : role === "owner"
                            ? "Fleet owner update"
                            : "Conversation"}
                    </Text>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewText} numberOfLines={1}>
                        {preview}
                      </Text>
                      {unread > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.ctaCard}>
            <View style={styles.ctaIconWrap}>
              <MaterialIcons name="chat" size={36} color="#fff" />
            </View>
            <Text style={styles.ctaTitle}>Need to start a conversation?</Text>
            <Text style={styles.ctaSub}>
              Message your driver, school or fleet owner anytime.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setContactSheetVisible((prev) => !prev)}
              disabled={startingConversation}
            >
              <MaterialIcons name="edit-square" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>New Message</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ClientMessages;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F5F7",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F5F7",
    paddingHorizontal: 14,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 10,
  },
  timeText: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: "#111827",
  },
  statusIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#D7DFEA",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF1F5",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchText: {
    flex: 1,
    marginLeft: 10,
    color: "#64748B",
    fontSize: 13,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#2563EB",
    backgroundColor: "#F8FAFC",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  tabTextActive: {
    color: "#111827",
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  contactSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contactHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  contactSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
  messageBody: {
    flex: 1,
  },
  messageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  senderName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  time: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  messageTitle: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "700",
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    paddingHorizontal: 5,
  },
  unreadText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  ctaCard: {
    backgroundColor: "#EEF5FF",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 18,
  },
  ctaIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  ctaSub: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginBottom: 14,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    width: "100%",
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F3F5F7",
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  navTextActive: {
    color: "#2563EB",
    fontWeight: "800",
  },
});
