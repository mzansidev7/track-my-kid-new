import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface LocationPickerProps {
  title: string;
  selectedLocation: string;
  onLocationSelect: (
    location: string,
    coordinates: { latitude: number; longitude: number },
  ) => void;
  placeholder?: string;
  initialCoordinates?: Coordinates | null;
  locked?: boolean;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  title,
  selectedLocation,
  onLocationSelect,
  placeholder = "Tap on map to select location",
  initialCoordinates = null,
  locked = false,
}) => {
  const defaultRegion = useMemo(
    () => ({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 100,
      longitudeDelta: 100,
    }),
    [],
  );
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] =
    useState<Coordinates | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(
    null,
  );
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === "granted");

        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setRegion({
            ...coords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        } else {
          setRegion(defaultRegion);
        }
      } catch (error) {
        console.error("Error getting location permission:", error);
        setLocationPermission(false);
        setRegion(defaultRegion);
      }
    };

    requestLocationPermission();
  }, [defaultRegion]);

  useEffect(() => {
    if (initialCoordinates) {
      setSelectedCoordinates(initialCoordinates);
      setRegion({
        latitude: initialCoordinates.latitude,
        longitude: initialCoordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      return;
    }

    if (selectedLocation && selectedLocation.includes(",")) {
      const [latStr, lngStr] = selectedLocation.split(",").map((s) => s.trim());
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        setSelectedCoordinates({ latitude: lat, longitude: lng });
      }
    } else {
      setSelectedCoordinates(null);
    }
  }, [selectedLocation, initialCoordinates]);

  useEffect(() => {
    if (selectedCoordinates && !region) {
      setRegion({
        latitude: selectedCoordinates.latitude,
        longitude: selectedCoordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [selectedCoordinates, region]);

  const handleMapPress = (event: {
    nativeEvent: { coordinate: Coordinates };
  }) => {
    if (locked) return;

    const { coordinate } = event.nativeEvent;
    setSelectedCoordinates(coordinate);

    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coordinate.latitude}&longitude=${coordinate.longitude}&localityLanguage=en`,
    )
      .then((response) => response.json())
      .then((data) => {
        const address =
          data.localityInfo?.administrative?.[2]?.name ||
          data.city ||
          `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
        onLocationSelect(address, coordinate);
      })
      .catch((error) => {
        console.error("Error reverse geocoding:", error);
        const address = `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
        onLocationSelect(address, coordinate);
      });
  };

  const clearSelection = () => {
    if (locked) return;

    setSelectedCoordinates(null);
    onLocationSelect("", { latitude: 0, longitude: 0 });
  };

  const openFullScreen = async () => {
    if (locationPermission === true) {
      try {
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setRegion({
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (error) {
        console.error("Error getting current location for fullscreen:", error);
      }
    }
    setIsFullScreen(true);
  };

  const centerOnCurrentLocation = async () => {
    if (locationPermission === true) {
      try {
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setRegion({
          ...coords,
          latitudeDelta: region?.latitudeDelta ?? 0.01,
          longitudeDelta: region?.longitudeDelta ?? 0.01,
        });
      } catch (error) {
        console.error("Error centering on current location:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={locked ? undefined : openFullScreen}
            style={styles.fullScreenButton}
            disabled={locked}
          >
            <MaterialIcons name="fullscreen" size={20} color="#F5A623" />
          </TouchableOpacity>
          {selectedCoordinates && !locked && (
            <TouchableOpacity
              onPress={clearSelection}
              style={styles.clearButton}
            >
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region || defaultRegion}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
          showsUserLocation={locationPermission === true}
          showsMyLocationButton={locationPermission === true}
          zoomEnabled={true}
          scrollEnabled={true}
          minZoomLevel={1}
          maxZoomLevel={20}
        >
          {selectedCoordinates && (
            <Marker
              coordinate={selectedCoordinates}
              title="Selected Location"
              pinColor="red"
            />
          )}
        </MapView>
      </View>

      <Modal visible={isFullScreen} animationType="slide">
        <View style={styles.fullScreenContainer}>
          <View style={styles.fullScreenHeader}>
            <Text style={styles.fullScreenTitle}>{title}</Text>
            <TouchableOpacity
              onPress={() => setIsFullScreen(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.fullScreenMap}
            region={region || defaultRegion}
            onRegionChangeComplete={setRegion}
            onPress={handleMapPress}
            showsUserLocation={locationPermission === true}
            showsMyLocationButton={locationPermission === true}
            zoomEnabled={true}
            scrollEnabled={true}
            rotateEnabled={true}
            minZoomLevel={1}
            maxZoomLevel={20}
          >
            {selectedCoordinates && (
              <Marker
                coordinate={selectedCoordinates}
                title="Selected Location"
                pinColor="red"
              />
            )}
          </MapView>
        </View>
      </Modal>

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
          {locked && initialCoordinates
            ? `${selectedLocation || placeholder} (locked)`
            : selectedLocation || placeholder}
        </Text>
        {selectedCoordinates && (
          <Text style={styles.coordinatesText}>
            {selectedCoordinates.latitude.toFixed(6)},{" "}
            {selectedCoordinates.longitude.toFixed(6)}
          </Text>
        )}
        {locationPermission === true && (
          <TouchableOpacity
            onPress={locked ? undefined : centerOnCurrentLocation}
            style={[
              styles.currentLocationButton,
              locked && styles.currentLocationButtonDisabled,
            ]}
            disabled={locked}
          >
            <MaterialIcons
              name="my-location"
              size={16}
              color={locked ? "#9CA3AF" : "#F5A623"}
            />
            <Text
              style={[
                styles.currentLocationText,
                locked && styles.currentLocationTextDisabled,
              ]}
            >
              Use Current Location
            </Text>
          </TouchableOpacity>
        )}
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
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  fullScreenButton: {
    padding: 5,
    marginRight: 10,
  },
  clearButton: {
    padding: 5,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  map: {
    flex: 1,
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
  coordinatesText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#F0F8FF",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  currentLocationButtonDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.7,
  },
  currentLocationText: {
    fontSize: 12,
    color: "#F5A623",
    marginLeft: 4,
    fontWeight: "500",
  },
  currentLocationTextDisabled: {
    color: "#9CA3AF",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  fullScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50, // Account for status bar
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  fullScreenTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  fullScreenMap: {
    flex: 1,
  },
});

export default LocationPicker;
