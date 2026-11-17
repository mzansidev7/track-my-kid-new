import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ClientHeader from "../components/ClientHeader";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

type SupportMember = {
  id: string;
  full_name: string;
  support_role: string;
};

const SupportMembersPage = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const authToken = user?.token;
  const [members, setMembers] = useState<SupportMember[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!authToken) {
      setLoading(false);
      Alert.alert("Session expired", "Please sign in again.");
      return;
    }
    setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/support/members`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load support members.");
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Support members unavailable", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      void loadMembers();
    }, [loadMembers]),
  );

  const startChat = async (member: SupportMember) => {
    if (!user?.token || requestingId) return;
    setRequestingId(member.id);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/support/live-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ supportStaffId: member.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to start a chat.");
      router.push({
        pathname: "/(client)/pages/support-chat",
        params: { sessionId: data.session.id, memberName: member.full_name },
      } as never);
    } catch (error) {
      Alert.alert("Unable to start chat", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setRequestingId(null);
    }
  };

  const filteredMembers = members.filter((member) =>
    `${member.full_name} ${member.support_role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ClientHeader title="One-to-one support" subtitle="Choose a support team member" />
      <View style={styles.content}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={21} color="#718078" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search support members"
            placeholderTextColor="#8A9990"
            style={styles.searchInput}
            accessibilityLabel="Search support members"
          />
        </View>
        {loading ? (
          <ActivityIndicator color="#16853B" style={styles.loader} />
        ) : filteredMembers.length ? (
          <FlatList
            data={filteredMembers}
            keyExtractor={(member) => member.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                <View style={styles.avatar}>
                  <MaterialIcons name="support-agent" size={24} color="#16853B" />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.full_name}</Text>
                  <Text style={styles.memberRole}>{item.support_role.replaceAll("_", " ")}</Text>
                  <Text style={styles.memberStatus}>Active support member</Text>
                </View>
                <TouchableOpacity
                  style={[styles.chatButton, requestingId && styles.disabled]}
                  onPress={() => void startChat(item)}
                  disabled={Boolean(requestingId)}
                  accessibilityLabel={`Start a one-to-one chat with ${item.full_name}`}
                >
                  {requestingId === item.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="chat" size={19} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <View style={styles.empty}>
            <MaterialIcons name="support-agent" size={38} color="#98A69D" />
            <Text style={styles.emptyTitle}>
              {search ? "No matching support members" : "No active support members"}
            </Text>
            <Text style={styles.emptyText}>
              {search ? "Try a different name or role." : "Please try again later or email support."}
            </Text>
            {!search && (
              <TouchableOpacity onPress={() => void loadMembers()} style={styles.retryButton}>
                <Text style={styles.retryText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#07040B", flex: 1 },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 14 },
  searchBox: { alignItems: "center", backgroundColor: "#130D1A", borderColor: "#E1EAE3", borderRadius: 12, borderWidth: 1, flexDirection: "row", paddingHorizontal: 12 },
  searchInput: { color: "#FBF8FF", flex: 1, fontSize: 14, minHeight: 46, paddingLeft: 8 },
  loader: { marginTop: 40 },
  list: { paddingBottom: 24, paddingTop: 14 },
  memberCard: { alignItems: "center", backgroundColor: "#130D1A", borderColor: "#352341", borderRadius: 15, borderWidth: 1, flexDirection: "row", marginBottom: 10, padding: 13 },
  avatar: { alignItems: "center", backgroundColor: "#1C1026", borderRadius: 24, height: 46, justifyContent: "center", marginRight: 12, width: 46 },
  memberInfo: { flex: 1 },
  memberName: { color: "#FBF8FF", fontSize: 14, fontWeight: "700" },
  memberRole: { color: "#68776E", fontSize: 12, marginTop: 3, textTransform: "capitalize" },
  memberStatus: { color: "#16853B", fontSize: 11, marginTop: 4 },
  chatButton: { alignItems: "center", backgroundColor: "#16853B", borderRadius: 11, height: 40, justifyContent: "center", width: 42 },
  disabled: { opacity: 0.6 },
  empty: { alignItems: "center", marginTop: 76, paddingHorizontal: 25 },
  emptyTitle: { color: "#FBF8FF", fontSize: 15, fontWeight: "700", marginTop: 12, textAlign: "center" },
  emptyText: { color: "#718078", fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
  retryButton: { marginTop: 14, padding: 8 },
  retryText: { color: "#16853B", fontSize: 13, fontWeight: "700" },
});

export default SupportMembersPage;
