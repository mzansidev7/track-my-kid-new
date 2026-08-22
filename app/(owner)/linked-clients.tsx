import { useOwnerPageHeader } from "./ownerHelpers/hooks/useOwnerPageHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../context/authContext/auth-context";
import AppNotification from "../../components/Notification";
import {
  subscribeToDriversListUpdates,
  unsubscribeFromRealtime,
} from "../../store/subscriptions/driversRealtime";
import { resolveWorkingBaseUrl } from "../../url";

interface LinkedClient {
  id: string;
  linked_at: string;
  clients: {
    id: string;
    users: {
      name: string;
      email: string;
      phone: string;
    };
    home_address: string;
  };
  vehicles: {
    id: string;
    name: string;
    license_plate: string;
  };
  drivers: {
    id: string;
    users: {
      name: string;
      email: string;
      phone: string;
    };
  } | null;
}

export default function LinkedClients({ setActiveButton }: any) {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const channelRef = useRef<any>(null);

  const [clients, setClients] = useState<LinkedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const { renderHeader } = useOwnerPageHeader({
    title: "Your Clients",
    subtitle: "Manage your clients",
    onBackPress: () => router.push("/"),
  });

  const fetchLinkedClients = async () => {
    setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();

      const response = await fetch(`${baseUrl}/owner/linked-clients`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setClients(data);
      } else {
        console.error("Failed to fetch linked clients:", data);
        setNotification({
          visible: true,
          message: "Failed to load linked clients",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching linked clients:", error);
      setNotification({
        visible: true,
        message: "Failed to load linked clients",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchLinkedClients();
    }
  }, [user?.token]);

  useEffect(() => {
    // Clean up previous subscription before creating new one
    if (channelRef.current) {
      unsubscribeFromRealtime(channelRef.current);
      channelRef.current = null;
    }

    if (!user?.token || !user?.userData?.id) {
      return;
    }

    channelRef.current = subscribeToDriversListUpdates(
      user.userData.id,
      fetchLinkedClients,
    );

    return () => {
      if (channelRef.current) {
        unsubscribeFromRealtime(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.token, user?.userData?.id]);

  const renderClientItem = ({ item }: { item: LinkedClient }) => (
    <TouchableOpacity style={styles.clientCard}>
      <View style={styles.clientIcon}>
        <MaterialIcons name="person" size={24} color="#34C759" />
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.clients.users.name}</Text>
        <Text style={styles.clientDetail}>
          Vehicle: {item.vehicles.name} ({item.vehicles.license_plate})
        </Text>
        {item.drivers && (
          <Text style={styles.clientDetail}>
            Driver: {item.drivers.users.name}
          </Text>
        )}
        <Text style={styles.clientDetail}>📧 {item.clients.users.email}</Text>
        <Text style={styles.clientDetail}>📞 {item.clients.users.phone}</Text>
        {item.clients.home_address && (
          <Text style={styles.clientSubDetail}>
            📍 {item.clients.home_address}
          </Text>
        )}
        <Text style={styles.linkedDate}>
          Linked: {new Date(item.linked_at).toLocaleDateString()}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* <Header title="Linked Clients" /> */}
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#34C759" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppNotification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      {renderHeader()}

      <FlatList
        data={clients}
        renderItem={renderClientItem}
        keyExtractor={(item) => `${item.clients.id}-${item.vehicles.id}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No linked clients yet</Text>
            <Text style={styles.emptySubText}>
              Parents will appear here when they scan your vehicle QR codes
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  listContainer: {
    padding: 16,
  },
  clientCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  clientSubDetail: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  linkedDate: {
    fontSize: 12,
    color: "#34C759",
    marginTop: 4,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
