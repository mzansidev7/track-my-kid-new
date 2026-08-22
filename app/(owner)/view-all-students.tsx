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
import { useOwnerPageHeader } from "./ownerHelpers/hooks/useOwnerPageHeader";

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

  const { renderHeader } = useOwnerPageHeader({
    title: "All Students",
    onBackPress: handleBackToRoute,
  });

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
              id: entry?.id || entry?.child_id,
              childId: entry?.child_id,
              name: entry?.children?.name || "Unknown student",
              schoolName:
                entry?.children?.school_name || "School not specified",
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
      {renderHeader()}
      <View style={styles.header}>
        <Text style={styles.title}>Students on Route</Text>
        <Text style={styles.subtitle}>{studentCount} student(s)</Text>
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
                    source={{ uri: item.avatar }}
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
    backgroundColor: "#F7F8FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  studentSchool: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
});
