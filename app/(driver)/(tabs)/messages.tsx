import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/styles/theme";
import DriverHeader from "@/components/driver/DriverHeader";

const sampleConversations = [
  {
    id: "1",
    name: "Thembi Dlamini",
    type: "parent",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    message: "Mpho will be absent tomorrow morning.",
    time: "9:30 AM",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "Route R101 – Parents",
    type: "group",
    avatar:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=200&q=80",
    message: "Lisa: Please remember sports day on Friday.",
    time: "8:45 AM",
    unread: 3,
    online: true,
  },
  {
    id: "3",
    name: "Fleet Owner",
    type: "owner",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    message: "Please submit your weekly trip report.",
    time: "Yesterday",
    unread: 1,
    online: true,
  },
  {
    id: "4",
    name: "Sunshine Primary School",
    type: "school",
    avatar:
      "https://images.unsplash.com/photo-1523240795612-9a054269033d?auto=format&fit=crop&w=200&q=80",
    message: "School will close early on Friday at 12:00 PM.",
    time: "Yesterday",
    unread: 0,
    online: true,
  },
  {
    id: "5",
    name: "Nomsa Mokoena",
    type: "parent",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    message: "Thank you for dropping off Lindiwe safely today.",
    time: "Mon",
    unread: 0,
    online: true,
  },
  {
    id: "6",
    name: "Route R101 – Drivers",
    type: "group",
    avatar:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=200&q=80",
    message: "David: Road construction on Main Street.",
    time: "Sun",
    unread: 0,
    online: false,
  },
];

const Messages = () => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");

  const tabs = [
    { id: "all", label: "All" },
    { id: "parents", label: "Parents" },
    { id: "school", label: "School" },
    { id: "owner", label: "Fleet Owner" },
  ];

  const filteredConversations = sampleConversations.filter((conv) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "parents" &&
        (conv.type === "parent" || conv.type === "group")) ||
      (activeTab === "school" && conv.type === "school") ||
      (activeTab === "owner" && conv.type === "owner");

    const matchesSearch = conv.name
      .toLowerCase()
      .includes(searchText.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const renderConversationItem = (item: (typeof sampleConversations)[0]) => (
    <TouchableOpacity
      key={item.id}
      style={[
        localStyles.conversationRow,
        { borderBottomColor: colors.border },
      ]}
    >
      <View style={localStyles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={localStyles.avatar} />
        {item.online && <View style={localStyles.onlineIndicator} />}
      </View>

      <View style={localStyles.conversationInfo}>
        <Text
          style={[localStyles.conversationName, { color: colors.text.primary }]}
        >
          {item.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            localStyles.conversationMessage,
            { color: colors.text.secondary },
          ]}
        >
          {item.message}
        </Text>
      </View>

      <View style={localStyles.conversationMeta}>
        <Text style={[localStyles.time, { color: colors.text.secondary }]}>
          {item.time}
        </Text>
        {item.unread > 0 && (
          <View style={localStyles.unreadBadge}>
            <Text style={localStyles.unreadCount}>{item.unread}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[localStyles.container, { backgroundColor: colors.background }]}
    >
      <DriverHeader 
      title="Messages" 
      subtitle="Stay connected with parents, school and fleet owner"
      showBackButton={true}
      showNotifications={true}
      notificationCount={7}
      />
      <ScrollView
        contentContainerStyle={localStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <LinearGradient
          colors={["#E0F3FF", "#D4E9FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={localStyles.heroCard}
        >
          <View style={localStyles.heroLeft}>
            <View style={localStyles.heroIcon}>
              <MaterialIcons name="chat" size={32} color="#0A84FF" />
            </View>
            <View style={localStyles.heroText}>
              <Text
                style={[localStyles.heroTitle, { color: colors.text.primary }]}
              >
                Stay connected
              </Text>
              <Text
                style={[
                  localStyles.heroSubtitle,
                  { color: colors.text.secondary },
                ]}
              >
                Communicate with parents, school and fleet owner.
              </Text>
            </View>
          </View>
          <MaterialIcons
            name="send"
            size={48}
            color="#0A84FF"
            style={{ opacity: 0.3 }}
          />
        </LinearGradient>

        {/* Search Bar */}
        <View style={localStyles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={colors.text.secondary}
            style={localStyles.searchIcon}
          />
          <TextInput
            placeholder="Search messages"
            placeholderTextColor={colors.text.secondary}
            style={[localStyles.searchInput, { color: colors.text.primary }]}
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity>
            <MaterialIcons
              name="tune"
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={localStyles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                localStyles.tab,
                activeTab === tab.id && [
                  localStyles.tabActive,
                  { borderBottomColor: colors.primary },
                ],
              ]}
            >
              <Text
                style={[
                  localStyles.tabLabel,
                  {
                    color:
                      activeTab === tab.id
                        ? colors.primary
                        : colors.text.secondary,
                    fontWeight: activeTab === tab.id ? "700" : "500",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Conversations List */}
        <View style={localStyles.conversationsList}>
          {filteredConversations.length > 0 ? (
            filteredConversations.map(renderConversationItem)
          ) : (
            <View style={localStyles.emptyState}>
              <MaterialIcons
                name="mail-outline"
                size={48}
                color={colors.text.secondary}
              />
              <Text
                style={[
                  localStyles.emptyText,
                  { color: colors.text.secondary },
                ]}
              >
                No conversations
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Compose FAB */}
      <TouchableOpacity
        style={[localStyles.fab, { backgroundColor: colors.primary }]}
      >
        <MaterialIcons name="edit" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default Messages;

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(10, 132, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F5F5F7",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    marginRight: 12,
  },
  tabActive: {
    borderBottomWidth: 3,
  },
  tabLabel: {
    fontSize: 14,
  },
  conversationsList: {
    marginTop: 8,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  conversationMessage: {
    fontSize: 13,
  },
  conversationMeta: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  time: {
    fontSize: 12,
    marginBottom: 6,
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0A84FF",
    justifyContent: "center",
    alignItems: "center",
  },
  unreadCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  headerNotification: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
