import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { dashboardStyles } from "../adminHelpers/styles/styles";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";

const Loading = ({ title, subtitle }: any) => {
  return (
    <SafeAreaView style={dashboardStyles.safeArea}>
      <LinearGradient
        colors={["#BCE8B0", "#B7E1B4"]}
        style={dashboardStyles.gradient}
      >
        <View style={dashboardStyles.loadingContainer}>
          <View style={dashboardStyles.loadingCard}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={dashboardStyles.loadingTitle}>Loading {title}</Text>
            {subtitle && (
              <Text style={dashboardStyles.loadingSubtitle}>{subtitle}</Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default Loading;
