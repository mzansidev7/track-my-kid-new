import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { driversPageStyles } from "../styles/ownerStyles";

const Loading = ({ renderHeader, title }: any) => {
  return (
    <SafeAreaView style={driversPageStyles.container} edges={["bottom"]}>
      {renderHeader && renderHeader()}

      <View style={driversPageStyles.center}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={driversPageStyles.loadingText}>{title}</Text>
      </View>
    </SafeAreaView>
  );
};

export default Loading;
