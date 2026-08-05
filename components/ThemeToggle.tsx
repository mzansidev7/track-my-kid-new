import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../styles/theme";

const ThemeToggle = () => {
  const { isDark, toggleTheme, colors } = useTheme();
  const thumbPosition = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(thumbPosition, {
      toValue: isDark ? 1 : 0,
      friction: 8,
      tension: 120,
      useNativeDriver: false,
    }).start();
  }, [isDark, thumbPosition]);

  const thumbTranslate = thumbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 36],
  });

  const trackBackground = isDark ? "#0F172A" : "#E2E8F0";
  const borderColor = isDark
    ? "rgba(148, 163, 184, 0.4)"
    : "rgba(148, 163, 184, 0.5)";
  const thumbBackground = isDark ? "#F8FAFC" : "#111827";

  return (
    <Pressable
      onPress={toggleTheme}
      style={({ pressed }) => [
        styles.wrapper,
        {
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        isDark ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: trackBackground,
            borderColor,
            shadowColor: isDark ? "#38BDF8" : "#94A3B8",
          },
        ]}
      >
        <View style={styles.trackIconLeft}>
          <Text style={styles.icon}>☀️</Text>
        </View>

        <View style={styles.trackIconRight}>
          <Text style={styles.icon}>🌙</Text>
        </View>

        <Animated.View
          style={[
            styles.switchThumb,
            {
              backgroundColor: thumbBackground,
              transform: [{ translateX: thumbTranslate }],
              shadowColor: isDark ? "#0EA5E9" : "#111827",
            },
          ]}
        >
          <Text style={styles.thumbIcon}>{isDark ? "🌙" : "☀️"}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  switchTrack: {
    width: 76,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  trackIconLeft: {
    position: "absolute",
    left: 9,
    zIndex: 1,
  },
  trackIconRight: {
    position: "absolute",
    right: 9,
    zIndex: 1,
  },
  icon: {
    fontSize: 12,
    opacity: 0.8,
  },
  switchThumb: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  thumbIcon: {
    fontSize: 14,
  },
});

export default ThemeToggle;
