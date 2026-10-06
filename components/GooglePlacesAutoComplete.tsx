import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { GOOGLE_API_KEY } from "../url";

type Prediction = {
  description?: string;
  place_id?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type GooglePlacesAutoCompleteProps = {
  value?: string;
  onChangeText?: (text: string) => void;

  onSelect: (
    address: string,
    coords: Coordinates | null,
    details?: {
      name?: string;
      address?: string;
    },
  ) => void;

  placeholder?: string;
  debounce?: number;
  minLength?: number;
  compact?: boolean;
};

const GooglePlacesAutoComplete: React.FC<GooglePlacesAutoCompleteProps> = ({
  value = "",
  onChangeText,
  onSelect,
  placeholder = "Search location",
  debounce = 400,
  minLength = 2,
  compact = false,
}) => {
  const [results, setResults] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const requestId = useRef(0);
  const selectedValue = useRef<string | null>(null);
  const selectingPlace = useRef(false);

  /**
   * Fetch autocomplete predictions
   */
  const fetchPredictions = useCallback(
    async (search: string, currentRequestId: number) => {
      if (!GOOGLE_API_KEY) {
        console.warn("Google Places API key is missing.");
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
          `?input=${encodeURIComponent(search)}` +
          `&key=${GOOGLE_API_KEY}` +
          `&language=en`;

        const response = await fetch(url);
        const data = await response.json();
        if (currentRequestId !== requestId.current) return;

        if (data.status === "OK") {
          setResults(data.predictions || []);
        } else {
          console.warn(
            "Google Places autocomplete error:",
            data.status,
            data.error_message,
          );

          setResults([]);
        }
      } catch (error) {
        if (currentRequestId !== requestId.current) return;
        console.error("Google Places autocomplete error:", error);
        setResults([]);
      } finally {
        if (currentRequestId === requestId.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    const search = value.trim();
    if (
      search.length < minLength ||
      selectedValue.current === search
    ) {
      return;
    }

    const currentRequestId = ++requestId.current;
    timer.current = setTimeout(
      () => fetchPredictions(search, currentRequestId),
      debounce,
    );

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, debounce, minLength, fetchPredictions]);

  /**
   * Select Google Place
   */
  const handleSelect = async (place: Prediction) => {
    if (!place.place_id || !GOOGLE_API_KEY || selectingPlace.current) {
      return;
    }

    selectingPlace.current = true;
    requestId.current += 1;
    selectedValue.current = null;
    setResults([]);
    setLoading(true);

    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(place.place_id)}` +
        `&fields=name,formatted_address,geometry` +
        `&key=${GOOGLE_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      const location = data?.result?.geometry?.location;

      const address =
        data?.result?.formatted_address || place.description || "";

      const name =
        data?.result?.name || place.structured_formatting?.main_text || address;

      const coordinates =
        location &&
        Number.isFinite(Number(location.lat)) &&
        Number.isFinite(Number(location.lng))
          ? {
              latitude: Number(location.lat),
              longitude: Number(location.lng),
            }
          : null;

      console.log("[places] selected", {
        address,
        coordinates,
      });

      selectedValue.current = name.trim();
      onChangeText?.(name);
      onSelect(name, coordinates, {
        name,
        address,
      });

      inputRef.current?.blur();
    } catch (error) {
      console.error("Google Place details error:", error);

      const address = place.description || "";
      const name = place.structured_formatting?.main_text || address;
      selectedValue.current = name.trim();
      onChangeText?.(name);
      onSelect(name, null, {
        name,
        address,
      });
      inputRef.current?.blur();
    } finally {
      selectingPlace.current = false;
      setLoading(false);
    }
  };

  /**
   * Clear
   */
  const handleClear = () => {
    requestId.current += 1;
    selectedValue.current = null;
    setResults([]);
    setLoading(false);
    onChangeText?.("");
    onSelect("", null);
  };

  return (
    <View style={styles.container}>
      {/* Suggestions */}
      {results.length > 0 && (
        <View
          style={[
            styles.resultsContainer,
            compact && styles.resultsContainerCompact,
          ]}
        >
          {results.map((item, index) => {
            const mainText =
              item.structured_formatting?.main_text || item.description || "";

            const secondaryText =
              item.structured_formatting?.secondary_text || "";

            return (
              <TouchableOpacity
                key={item.place_id || item.description || String(index)}
                style={[
                  styles.resultItem,
                  compact && styles.resultItemCompact,
                ]}
                disabled={loading}
                activeOpacity={0.7}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.resultIcon}>
                  <Text style={styles.resultIconText}>📍</Text>
                </View>

                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {mainText}
                  </Text>

                  {secondaryText ? (
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                      {secondaryText}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.resultArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          compact && styles.inputContainerCompact,
        ]}
      >
        {!compact && (
          <View style={styles.inputIcon}>
            <Text style={styles.inputIconText}>📍</Text>
          </View>
        )}

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => {
            selectedValue.current = null;
            requestId.current += 1;
            setResults([]);
            setLoading(false);
            onChangeText?.(text);
          }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          style={[styles.input, compact && styles.inputCompact]}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />

        {loading && (
          <ActivityIndicator
            size="small"
            color="#4A90E2"
            style={[styles.loader, compact && styles.loaderCompact]}
          />
        )}

        {!loading && value.length > 0 && (
          <TouchableOpacity
            style={[styles.clearButton, compact && styles.clearButtonCompact]}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.clearText, compact && styles.clearTextCompact]}
            >
              ×
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default GooglePlacesAutoComplete;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    zIndex: 10000,
  },

  inputContainer: {
    height: 52,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 6,
  },
  inputContainerCompact: {
    height: 46,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderColor: "#C9E4FA",
  },

  inputIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  inputIconText: {
    fontSize: 16,
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 8,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  inputCompact: {
    height: 44,
    paddingHorizontal: 0,
    fontSize: 14,
    color: "#17385F",
  },

  loader: {
    marginHorizontal: 12,
  },
  loaderCompact: {
    marginHorizontal: 4,
  },

  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  clearButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 0,
  },

  clearText: {
    fontSize: 24,
    lineHeight: 25,
    color: "#6B7280",
  },
  clearTextCompact: {
    fontSize: 23,
    lineHeight: 25,
  },

  resultsContainer: {
    position: "absolute",
    bottom: 58,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxHeight: 260,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,

    zIndex: 99999,
  },
  resultsContainerCompact: {
    bottom: 50,
    maxHeight: 180,
    borderRadius: 8,
  },

  resultItem: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  resultItemCompact: {
    minHeight: 48,
    paddingHorizontal: 9,
  },

  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  resultIconText: {
    fontSize: 15,
  },

  resultTextContainer: {
    flex: 1,
    paddingRight: 8,
  },

  resultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  resultSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },

  resultArrow: {
    fontSize: 24,
    color: "#9CA3AF",
  },
});
