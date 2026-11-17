import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import OwnerCompactHeader from "@/app-support/owner/ownerHelpers/components/OwnerCompactHeader";

const getValidCoordinate = (latitudeValue: unknown, longitudeValue: unknown) => {
  if (
    latitudeValue == null ||
    longitudeValue == null ||
    latitudeValue === "" ||
    longitudeValue === ""
  ) {
    return null;
  }

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
};

const StudentsView = () => {
  const router = useRouter();
  const { studentData, routeId } = useLocalSearchParams();

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

  const { student, error } = useMemo(() => {
    try {
      if (typeof studentData === "string" && studentData.trim()) {
        const parsed = JSON.parse(studentData);
        return { student: parsed, error: null };
      }

      if (
        studentData &&
        typeof studentData === "object" &&
        !Array.isArray(studentData)
      ) {
        return { student: studentData, error: null };
      }
      return {
        student: null,
        error: "Child details are not available right now.",
      };
    } catch {
      return {
        student: null,
        error: "Child details are not available right now.",
      };
    }
  }, [studentData]);

  const routeRegion = useMemo(() => {
    if (!student) {
      return {
        latitude: -25.7479,
        longitude: 28.2293,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    const home = getValidCoordinate(
      student.pickup_latitude,
      student.pickup_longitude,
    );
    const school =
      getValidCoordinate(
        student.school_location?.latitude,
        student.school_location?.longitude,
      ) ||
      getValidCoordinate(
        student.dropoff_latitude,
        student.dropoff_longitude,
      );
    const validPoints = [home, school].filter(
      (point): point is { latitude: number; longitude: number } =>
        point !== null,
    );

    if (validPoints.length === 0) {
      return {
        latitude: -25.7479,
        longitude: 28.2293,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    const lat =
      validPoints.reduce((sum, point) => sum + point.latitude, 0) /
      validPoints.length;
    const lng =
      validPoints.reduce((sum, point) => sum + point.longitude, 0) /
      validPoints.length;
    const latitudes = validPoints.map((point) => point.latitude);
    const longitudes = validPoints.map((point) => point.longitude);

    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: Math.max(
        (Math.max(...latitudes) - Math.min(...latitudes)) * 1.6,
        0.012,
      ),
      longitudeDelta: Math.max(
        (Math.max(...longitudes) - Math.min(...longitudes)) * 1.6,
        0.012,
      ),
    };
  }, [student]);

  const parentDetails = useMemo(() => {
    const nestedClients = student?.clients;
    const parent = Array.isArray(nestedClients)
      ? nestedClients[0]
      : nestedClients;
    const nameFromProfile = parent?.users?.name?.trim();
    const nameFromClient = [parent?.first_name, parent?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      name: nameFromProfile || nameFromClient || "Not provided",
      phone: parent?.phone || parent?.users?.phone || "Not provided",
    };
  }, [student]);

  const summaryItems = useMemo(() => {
    if (!student) return [];

    return [
      { label: "Name", value: student.name || "Unknown" },
      { label: "School", value: student.school_name || "Not provided" },
      { label: "Grade", value: student.grade || "Not provided" },
      { label: "Parent", value: parentDetails.name },
      { label: "Parent phone", value: parentDetails.phone },
    ];
  }, [student, parentDetails]);

  const routeMarkers = useMemo(() => {
    if (!student) return [];

    const markers: {
      id: string;
      latitude: number;
      longitude: number;
      label: string;
      icon: "home" | "school";
    }[] = [];

    const home = getValidCoordinate(
      student.pickup_latitude,
      student.pickup_longitude,
    );
    const school =
      getValidCoordinate(
        student.school_location?.latitude,
        student.school_location?.longitude,
      ) ||
      getValidCoordinate(
        student.dropoff_latitude,
        student.dropoff_longitude,
      );

    if (home) {
      markers.push({
        id: "home",
        latitude: home.latitude,
        longitude: home.longitude,
        label: "Home",
        icon: "home",
      });
    }

    if (school) {
      markers.push({
        id: "school",
        latitude: school.latitude,
        longitude: school.longitude,
        label: student.school_name || "School",
        icon: "school",
      });
    }

    return markers;
  }, [student]);

  return (
    <View style={styles.container}>
      <OwnerCompactHeader
        title="Child Details"
        onBackPress={handleBackToRoute}
      />

      {error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : student ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.avatarContainer}>
              {student.avatar ? (
                <Image
                  source={{
                    uri:
                      typeof student.avatar === "string"
                        ? student.avatar
                        : student.avatar?.url ||
                          student.avatar?.avatar_url ||
                          "",
                  }}
                  style={styles.avatarImage}
                />
              ) : (
                <MaterialIcons name="school" size={24} color="#F5A623" />
              )}
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroTitle}>{student.name || "Child"}</Text>
              <Text style={styles.heroSubtitle}>
                {student.school_name || "School not provided"}
                {student.grade ? ` · Grade ${student.grade}` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.mapCard}>
            <View style={styles.mapHeaderRow}>
              <Text style={styles.mapTitle}>Route overview</Text>
              <Text style={styles.mapSubtitle}>Home and school stops</Text>
            </View>
            <MapView
              style={styles.map}
              initialRegion={routeRegion}
              pointerEvents="none"
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              moveOnMarkerPress={false}
              showsCompass={false}
              showsScale={false}
              showsUserLocation={false}
            >
              {routeMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={{
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                  }}
                  title={marker.label}
                >
                  <View style={styles.markerPin}>
                    <View style={styles.markerBubble}>
                      <MaterialIcons
                        name={marker.icon}
                        size={20}
                        color={marker.icon === "home" ? "#35D9B3" : "#F2B84B"}
                      />
                    </View>
                    <View style={styles.markerLabelWrap}>
                      <Text style={styles.markerLabel} numberOfLines={1}>
                        {marker.label}
                      </Text>
                    </View>
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>

          <View style={styles.sectionCard}>
            {summaryItems.map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
};

export default StudentsView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050907",
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 18,
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
    color: "#B1C4BC",
    textAlign: "center",
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1713",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#294238",
  },
  mapCard: {
    backgroundColor: "#0D1713",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#294238",
  },
  mapHeaderRow: {
    marginBottom: 7,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F4FBF8",
  },
  mapSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "#B1C4BC",
  },
  map: {
    height: 175,
    borderRadius: 9,
    overflow: "hidden",
  },
  markerBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0D1713",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#294238",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  markerPin: {
    alignItems: "center",
  },
  markerLabelWrap: {
    maxWidth: 120,
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#0D1713",
    borderWidth: 1,
    borderColor: "#294238",
  },
  markerLabel: {
    color: "#F4FBF8",
    fontSize: 9,
    fontWeight: "700",
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#13231D",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  heroMeta: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F4FBF8",
  },
  heroSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#B1C4BC",
  },
  sectionCard: {
    backgroundColor: "#0D1713",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#294238",
  },
  infoRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#294238",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B1C4BC",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: "#F4FBF8",
  },
});
