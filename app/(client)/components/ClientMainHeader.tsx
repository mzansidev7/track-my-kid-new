import React from "react";
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/styles/theme";

interface ClientHeaderProps {
  onMenuPress?: () => void;
  avatarSource?: ImageSourcePropType;
  avatarStatusColor?: string;
  greeting?: string;
  name?: string;
  subtitle?: string;
  rightAccessory?: React.ReactNode;
  containerStyle?: ViewStyle;
  isLoading?: boolean;
}

export const ClientMainHeader = ({
  onMenuPress,
  avatarSource,
  avatarStatusColor = "#22C55E",
  greeting = "Good morning,",
  name = "Nomsa",
  subtitle = "Here’s what’s happening with your child today.",
  rightAccessory,
  containerStyle,
  isLoading = false,
}: ClientHeaderProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.headerWrapper,
        {
          backgroundColor: colors.background,
        },
        containerStyle,
      ]}
    >
      <Text style={[styles.greeting, { color: colors.text.primary }]}>
        {greeting}
      </Text>
      <View style={styles.heroNameRow}>
        <Text style={[styles.greetingName, { color: colors.text.primary }]}>
          {name}
        </Text>
        {!isLoading && (
          <Text style={[styles.wave, { color: colors.text.primary }]}>👋</Text>
        )}
        {isLoading && (
          <Text style={[styles.wave, { color: colors.text.primary }]}>⏳</Text>
        )}
      </View>
      {!isLoading && (
        <Text style={[styles.subtext, { color: colors.text.secondary }]}>
          {subtitle}
        </Text>
      )}

      {rightAccessory && (
        <View style={styles.rightAccessory}>{rightAccessory}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  profileAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
  },
  avatarStatus: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  greeting: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 6,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 32,
    fontWeight: "800",
  },
  wave: {
    fontSize: 32,
    marginLeft: 8,
  },
  subtext: {
    fontSize: 15,
    lineHeight: 22,
  },
  rightAccessory: {
    marginTop: 16,
  },
});
