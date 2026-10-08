import { useTheme } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface OwnerPageHeaderOptions {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  onBackPress?: () => void;
  headerColors?: readonly [string, string];
}

export const useOwnerPageHeader = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  onBackPress,
  headerColors,
}: OwnerPageHeaderOptions) => {
  const router = useRouter();
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    if (router.canGoBack && router.canGoBack()) {
      router.back();
      return;
    }

    router.push("/");
  };

  const renderHeader = () => (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <LinearGradient
        colors={
          headerColors || [
            colors.brands.owner.gradientEnd,
            colors.brands.owner.gradientStart,
          ]
        }
        style={styles.pageHeader}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.pageHeaderTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.pageHeaderSubtitle}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        {actionLabel && onActionPress ? (
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={onActionPress}
          >
            <Text style={styles.addButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </LinearGradient>
    </SafeAreaView>
  );

  return { renderHeader };
};

const styles = StyleSheet.create({
  safeArea: {},
  pageHeader: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    // borderBottomLeftRadius: 28,
    // borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  pageHeaderTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 4,
  },
  pageHeaderSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
  },
  addButton: {
    marginTop: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  addButtonText: {
    color: "#8B5CF6",
    fontSize: 13,
    fontWeight: "700",
  },
});
