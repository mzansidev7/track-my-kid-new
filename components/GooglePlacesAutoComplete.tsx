import React, { useEffect, useRef, useState } from "react";
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
};

const GooglePlacesAutoComplete: React.FC<GooglePlacesAutoCompleteProps> = ({
  value = "",
  onChangeText,
  onSelect,
  placeholder = "Search location",
  debounce = 400,
  minLength = 2,
}) => {
  const [results, setResults] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  /**
   * Search Google Places
   */
  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    const search = value.trim();

    if (search.length < minLength) {
      setResults([]);
      return;
    }

    timer.current = setTimeout(() => {
      fetchPredictions(search);
    }, debounce);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [value, debounce, minLength]);

  /**
   * Fetch autocomplete predictions
   */
  const fetchPredictions = async (search: string) => {
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
      console.error("Google Places autocomplete error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Select Google Place
   */
  const handleSelect = async (place: Prediction) => {
    if (!place.place_id || !GOOGLE_API_KEY) {
      return;
    }

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
        typeof location.lat === "number" &&
        typeof location.lng === "number"
          ? {
              latitude: location.lat,
              longitude: location.lng,
            }
          : null;

      /**
       * IMPORTANT:
       *
       * Parent owns the input value.
       *
       * We update the parent FIRST.
       */
      onChangeText?.(name);

      /**
       * Then notify parent that a place was selected.
       */
      onSelect(name, coordinates, {
        name,
        address,
      });

      /**
       * Clear suggestions.
       */
      setResults([]);

      /**
       * Remove keyboard.
       */
      inputRef.current?.blur();
    } catch (error) {
      console.error("Google Place details error:", error);

      const address = place.description || "";

      const name = place.structured_formatting?.main_text || address;

      onChangeText?.(name);

      onSelect(name, null, {
        name,
        address,
      });

      setResults([]);
      inputRef.current?.blur();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear
   */
  const handleClear = () => {
    setResults([]);
    onChangeText?.("");
    onSelect("", null);
  };

  return (
    <View style={styles.container}>
      {/* Suggestions */}
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          {results.map((item, index) => {
            const mainText =
              item.structured_formatting?.main_text || item.description || "";

            const secondaryText =
              item.structured_formatting?.secondary_text || "";

            return (
              <TouchableOpacity
                key={item.place_id || item.description || String(index)}
                style={styles.resultItem}
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
      <View style={styles.inputContainer}>
        <View style={styles.inputIcon}>
          <Text style={styles.inputIconText}>📍</Text>
        </View>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => {
            onChangeText?.(text);
          }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />

        {loading && (
          <ActivityIndicator
            size="small"
            color="#4A90E2"
            style={styles.loader}
          />
        )}

        {!loading && value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Text style={styles.clearText}>×</Text>
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

  loader: {
    marginHorizontal: 12,
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

  clearText: {
    fontSize: 24,
    lineHeight: 25,
    color: "#6B7280",
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
