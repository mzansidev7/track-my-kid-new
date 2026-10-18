import { View, Text } from "react-native";
import React from "react";
import { useOwnerStyles } from "../styles/ownerStyles";
import { useTheme } from "@/styles/theme";
import { MaterialIcons } from "@expo/vector-icons";

const RenderMetricCard = ({ icon, label, value, subtext, color }: any) => {
  const styles = useOwnerStyles();
  const { colors, shadows } = useTheme();

  return (
    <View
      style={[
        styles.metricCard,
        {
          shadowColor: shadows.md.shadowColor,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View style={styles.metricCardHeader}>
        <View
          style={[
            styles.metricIconBox,
            { backgroundColor: colors.primaryDark + "20" },
          ]}
        >
          <MaterialIcons name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.metricPercentage}>↑ +8.3%</Text>
      </View>
      <Text style={[styles.metricValue, { color: colors.text.primary }]}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.text.tertiary }]}>
        {label}
      </Text>
      <Text style={[styles.metricSubtext, { color: colors.text.tertiary }]}>
        {subtext}
      </Text>
    </View>
  );
};
export default RenderMetricCard;
