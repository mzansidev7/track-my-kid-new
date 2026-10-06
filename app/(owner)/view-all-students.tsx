import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";
import OwnerCompactHeader from "./ownerHelpers/components/OwnerCompactHeader";

const ViewAllStudents = () => {
  const { routeId } = useLocalSearchParams();
  const { user } = useContext(AuthContext);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const resolvedRouteId = Array.isArray(routeId) ? routeId[0] : routeId;

  const handleBackToRoute = () => {
    if (resolvedRouteId) {
      router.push({
        pathname: "/(owner)/route-details",
        params: { routeId: String(resolvedRouteId) },
      });
      return;
    }

    router.push("/(owner)/(tabs)/routes");
  };

  useEffect(() => {
    let isActive = true;

    const loadStudents = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!routeId || !user?.token) {
          if (!isActive) return;
          setStudents([]);
          setError("Route details are not available right now.");
          setLoading(false);
          return;
        }

        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/owner/routes/${routeId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });

        const data = await response.json();

        if (!isActive) return;

        if (response.ok && Array.isArray(data?.route?.route_children)) {
          const mappedStudents = data.route.route_children
            .map((entry: any) => ({
              ...(entry?.children || {}),
              id: entry?.children?.id || entry?.child_id || entry?.id,
              routeChildId: entry?.id,
              childId: entry?.child_id,
              name: entry?.children?.name || "Unknown student",
              schoolName:
                entry?.children?.school_name || "School not specified",
              avatar: entry?.children?.avatar || null,
            }))
            .filter(Boolean);

          setStudents(mappedStudents);
        } else {
          setStudents([]);
          setError(data?.error || "Unable to load students for this route.");
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Failed to load route students:", err);
        setStudents([]);
        setError("Unable to load students right now.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadStudents();

    return () => {
      isActive = false;
    };
  }, [routeId, user?.token]);

  const studentCount = useMemo(() => students.length, [students]);

  return (
    <View style={styles.container}>
      <OwnerCompactHeader
        title="All Students"
        onBackPress={handleBackToRoute}
      />
      <View style={styles.header}>
        <Text style={styles.title}>Students on Route</Text>
        <Text style={styles.subtitle}>{studentCount} students assigned</Text>
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.stateText}>Loading students...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id || item.childId || item.name)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="school" size={26} color="#1769D2" />
              <Text style={styles.emptyTitle}>No students assigned</Text>
              <Text style={styles.emptySubtitle}>
                Students linked to this route will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.studentCard}
              onPress={() =>
                router.push({
                  pathname: "/(owner)/students-view",
                  params: {
                    routeId: String(resolvedRouteId),
                    studentData: JSON.stringify(item),
                  },
                })
              }
            >
              <View style={styles.avatarContainer}>
                {item.avatar ? (
                  <Image
                    source={{
                      uri:
                        typeof item.avatar === "string"
                          ? item.avatar
                          : item.avatar?.url || item.avatar?.avatar_url || "",
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <MaterialIcons name="school" size={24} color="#F5A623" />
                )}
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentSchool}>{item.schoolName}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default ViewAllStudents;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FC",
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#17385F",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 10,
    color: "#71869C",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 8,
    fontSize: 13,
    color: "#607A98",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
    marginHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6E9FC",
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: {
    marginTop: 8,
    color: "#17385F",
    fontSize: 13,
    fontWeight: "700",
  },
  emptySubtitle: {
    marginTop: 3,
    color: "#71869C",
    fontSize: 10,
    textAlign: "center",
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: "#D6E9FC",
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDF5FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#17385F",
  },
  studentSchool: {
    marginTop: 3,
    fontSize: 10,
    color: "#71869C",
  },
});
