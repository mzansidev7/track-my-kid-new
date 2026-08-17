/**
 * Web / fallback implementation — no react-native-maps (native-only).
 * iOS & Android use `LocationPicker.native.tsx` via Metro resolution.
 */
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  title: string;
  selectedLocation: string;
  onLocationSelect: (
    location: string,
    coordinates: { latitude: number; longitude: number },
  ) => void;
  placeholder?: string;
  // optional initial coordinates (used by native version); accepted here for type compatibility
  initialCoordinates?: Coordinates | null;
}

function parseCoord(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  title,
  selectedLocation,
  onLocationSelect,
  placeholder = "Enter latitude and longitude, then apply",
  initialCoordinates = null,
}) => {
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [locationPermission, setLocationPermission] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === "granted");
      } catch {
        setLocationPermission(false);
      }
    })();
  }, []);

  // If initial coordinates provided (from native usage), prefill inputs
  useEffect(() => {
    if (initialCoordinates) {
      setLatInput(String(initialCoordinates.latitude));
      setLngInput(String(initialCoordinates.longitude));
    }
  }, [initialCoordinates]);

  const applyCoordinates = (latitude: number, longitude: number) => {
    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    )
      .then((response) => response.json())
      .then((data) => {
        const address =
          data.localityInfo?.administrative?.[2]?.name ||
          data.city ||
          `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        onLocationSelect(address, { latitude, longitude });
      })
      .catch(() => {
        const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        onLocationSelect(address, { latitude, longitude });
      });
  };

  const handleApplyPress = () => {
    const lat = parseCoord(latInput);
    const lng = parseCoord(lngInput);
    if (lat == null || lng == null) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    applyCoordinates(lat, lng);
  };

  const handleUseMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = pos.coords;
      setLatInput(String(latitude));
      setLngInput(String(longitude));
      applyCoordinates(latitude, longitude);
    } catch (e) {
      console.error("Location error:", e);
    }
  };

  const clearSelection = () => {
    setLatInput("");
    setLngInput("");
    onLocationSelect("", { latitude: 0, longitude: 0 });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {(selectedLocation || latInput || lngInput) && (
          <TouchableOpacity onPress={clearSelection} style={styles.clearButton}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.webPanel}>
        <Text style={styles.webHint}>
          Maps are not available in the web build. Use coordinates below or your
          current location.
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={latInput}
            onChangeText={setLatInput}
            placeholder="-33.8688"
            placeholderTextColor="#999"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={lngInput}
            onChangeText={setLngInput}
            placeholder="151.2093"
            placeholderTextColor="#999"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPress}>
          <Text style={styles.applyBtnText}>Apply coordinates</Text>
        </TouchableOpacity>
        {locationPermission !== false ? (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleUseMyLocation}
          >
            <MaterialIcons name="my-location" size={18} color="#2E7D32" />
            <Text style={styles.secondaryBtnText}>Use my location</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.locationInfo}>
        <Text
          style={[
            styles.locationText,
            {
              color: selectedLocation ? "#333" : "#666",
              fontStyle: selectedLocation ? "normal" : "italic",
            },
          ]}
        >
          {selectedLocation || placeholder}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  clearButton: {
    padding: 5,
  },
  webPanel: {
    minHeight: 160,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
    backgroundColor: "#FAFAFA",
  },
  webHint: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 12,
  },
  row: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  applyBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: "#2E7D32",
    fontWeight: "600",
    fontSize: 15,
  },
  locationInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
  },
  locationText: {
    fontSize: 14,
  },
});

export default LocationPicker;
