import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import GooglePlacesAutoComplete from "../components/GooglePlacesAutoComplete";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { buildStaticMapUrl } from "../utils/geoapify";

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
  initialCoordinates?: Coordinates | null;
  locked?: boolean;
  forceFullScreen?: boolean;
  onClose?: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  title,
  selectedLocation,
  onLocationSelect,
  placeholder = "Tap on map to select location",
  initialCoordinates = null,
  locked = false,
  forceFullScreen = false,
  onClose,
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
    if (forceFullScreen) setIsFullScreen(true);
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
  }, [defaultRegion, forceFullScreen]);

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
    // clear any pending search selection when user taps map directly
    setPendingSelection(false);
    setPendingAddress(null);
    setPendingCoords(null);

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

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<any>(null);
  const [pendingSelection, setPendingSelection] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [pendingCoords, setPendingCoords] = useState<Coordinates | null>(null);

  const staticMapUrl = useMemo(() => {
    if (!selectedCoordinates) return null;
    try {
      return buildStaticMapUrl({
        centerLon: selectedCoordinates.longitude,
        centerLat: selectedCoordinates.latitude,
        zoom: 14.35,
        width: 600,
        height: 400,
        markers: [
          {
            lon: selectedCoordinates.longitude,
            lat: selectedCoordinates.latitude,
            type: "awesome",
            color: "#bb3f73",
            size: "x-large",
            icon: "paw",
            icontype: "awesome",
          },
        ],
      });
    } catch (err) {
      console.warn("Failed to build static map url:", err);
      return null;
    }
  }, [selectedCoordinates]);

  

  // Render a small embedded map and, when requested, overlay a fullscreen map
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerButtons}>
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
          initialRegion={region || defaultRegion}
          ref={mapRef}
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
        {selectedCoordinates && staticMapUrl ? (
          <Image
            source={{ uri: staticMapUrl }}
            style={styles.staticPreview}
            accessibilityLabel="Static map preview"
          />
        ) : null}
      </View>

      {/* Fullscreen modal when parent requests it */}
      {forceFullScreen && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (onClose) onClose();
          }}
        >
          <View style={styles.fullScreenContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={region || defaultRegion}
              ref={mapRef}
              onRegionChangeComplete={setRegion}
              onPress={handleMapPress}
            //   showsUserLocation={locationPermission === true}
            //   showsMyLocationButton={locationPermission === true}
            
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
            <View style={styles.overlayHeader} pointerEvents="box-none">
                <View style={styles.overlayHeaderRow}>
                  <Text style={styles.overlayTitle}>{title}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (onClose) return onClose();
                    }}
                    style={styles.overlayClose}
                  >
                  <MaterialIcons name="close" size={24} color="#111" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchRowInline}>
                  <GooglePlacesAutoComplete
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search address or place"
                    debounce={500}
                    onSelect={(address, coords) => {
                      if (coords) {
                        setSelectedCoordinates(coords);
                        setRegion({ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
                        try {
                          if (mapRef.current && typeof mapRef.current.animateToRegion === "function") {
                            mapRef.current.animateToRegion({ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 400);
                          }
                        } catch {
                          // ignore
                        }
                        setPendingAddress(address);
                        setPendingCoords(coords);
                        setPendingSelection(true);
                        setSearchQuery(address);
                      } else {
                        setPendingAddress(address);
                        setPendingCoords(null);
                        setPendingSelection(true);
                        setSearchQuery(address);
                      }
                    }}
                  />
                </View>
            </View>
            <View style={styles.overlayControls} pointerEvents="box-none">
              <View style={styles.locationInfoOverlay}>
                {/* search input moved to header for fullscreen mode */}
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
                <Text style={styles.locationText}>
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
                {pendingSelection && pendingCoords && (
                  <View style={styles.pendingRow}>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => {
                        setPendingSelection(false);
                        if (pendingAddress && pendingCoords) {
                          onLocationSelect(pendingAddress, pendingCoords);
                        }
                        setPendingAddress(null);
                        setPendingCoords(null);
                      }}
                    >
                      <Text style={styles.confirmButtonText}>
                        Use this location
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setPendingSelection(false);
                        setPendingAddress(null);
                        setPendingCoords(null);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Fallback modal when component-controlled fullscreen is used */}
      {isFullScreen && !forceFullScreen && (
        <Modal visible transparent animationType="slide">
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
              initialRegion={region || defaultRegion}
              ref={mapRef}
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
      )}

      <View style={styles.locationInfo}>
        <Text style={styles.locationText}>
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
        {pendingSelection && pendingCoords && (
          <View style={styles.pendingRowInline}>
            <TouchableOpacity
              style={styles.confirmButtonInline}
              onPress={() => {
                setPendingSelection(false);
                if (pendingAddress && pendingCoords) {
                  onLocationSelect(pendingAddress, pendingCoords);
                }
                setPendingAddress(null);
                setPendingCoords(null);
              }}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButtonInline}
              onPress={() => {
                setPendingSelection(false);
                setPendingAddress(null);
                setPendingCoords(null);
              }}
            >
              <MaterialIcons name="close" size={20} color="#333" />
            </TouchableOpacity>
          </View>
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
  // fullScreenButton removed; map is opened full-screen by parent when needed
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
  fullScreenWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  overlayHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 44 : 16,
    left: 12,
    right: 12,
    flexDirection: "column",
    alignItems: "stretch",
    zIndex: 1000,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  overlayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  overlayTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
  },
  overlayClose: {
    padding: 8,
  },
  overlayControls: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 20,
    zIndex: 1000,
  },
  locationInfoOverlay: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
  },
  pendingRow: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "space-between",
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  pendingRowInline: {
    flexDirection: "row",
    marginTop: 8,
    alignItems: "center",
  },
  confirmButtonInline: {
    backgroundColor: "#28A745",
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonInline: {
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: "#4A90E2",
    padding: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchRowInline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  searchSuggestions: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxHeight: 200,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionText: {
    color: "#111827",
  },
  searchInputInline: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 0,
    marginRight: 8,
  },
  searchButtonInline: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  staticPreview: {
    width: "100%",
    height: 120,
    marginTop: 8,
    borderRadius: 8,
  },
});

export default LocationPicker;
