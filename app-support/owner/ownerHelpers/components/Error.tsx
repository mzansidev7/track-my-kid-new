import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { driversPageStyles } from "../styles/ownerStyles";

const Error = ({ renderHeader, refresh, errorText }: any) => {
  return (
    <SafeAreaView style={driversPageStyles.container} edges={["bottom"]}>
      {renderHeader()}

      <View style={driversPageStyles.center}>
        <Text style={driversPageStyles.errorText}>{errorText}</Text>

        <TouchableOpacity
          onPress={() => refresh(true)}
          style={driversPageStyles.refreshButton}
        >
          <Text style={driversPageStyles.refreshButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Error;
