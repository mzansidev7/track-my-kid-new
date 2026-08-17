import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type Props = {
  title: string;
  subtitle?: string;

  /**
   * Show back button.
   * Useful for inner driver screens.
   */
  showBackButton?: boolean;

  /**
   * Show notification button.
   */
  showNotifications?: boolean;

  /**
   * Optional notification count.
   */
  notificationCount?: number;

  /**
   * Optional right-side icon/action.
   */
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;

  /**
   * Optional custom right component.
   */
  rightComponent?: React.ReactNode;

  /**
   * Optional custom style.
   */
  style?: ViewStyle;

  /**
   * Optional callback when back is pressed.
   */
  onBackPress?: () => void;
};

const DriverHeader = ({
  title,
  subtitle,
  showBackButton = false,
  showNotifications = false,
  notificationCount = 0,
  rightIcon,
  onRightPress,
  rightComponent,
  style,
  onBackPress,
}: Props) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    router.back();
  };

  return (
  <View style={[styles.container, style]}>
    {/* LEFT SIDE */}
    <View style={styles.leftSection}>
      {showBackButton && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={23}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      )}
    </View>

    {/* CENTER TITLE */}
    <View style={styles.centerSection}>
      <Text
        style={styles.title}
        numberOfLines={1}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={styles.subtitle}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>

    {/* RIGHT SIDE */}
    <View style={styles.rightSection}>
      {rightComponent ? (
        rightComponent
      ) : (
        <>
          {showNotifications && (
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={onRightPress}
            >
              <MaterialIcons
                name="notifications-none"
                size={24}
                color="#FFFFFF"
              />

              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>
                    {notificationCount > 9
                      ? "9+"
                      : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {rightIcon && (
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={onRightPress}
            >
              <MaterialIcons
                name={rightIcon}
                size={23}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  </View>
);
};

export default DriverHeader;

const styles = StyleSheet.create({
  container: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // marginTop: 20,
    position: "relative",
    backgroundColor: "#061A3A",
    padding: 10,
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },

  centerSection: {
    position: "absolute",
    left: 70,
    right: 70,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },

  subtitle: {
    color: "#7F94B1",
    fontSize: 11,
    marginTop: 3,
    textAlign: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#0D2850",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#193B68",
  },

  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: 8,
    zIndex: 2,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#0D2850",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#193B68",
    position: "relative",
  },

  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#EF5350",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#061A3A",
  },

  notificationText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },
});