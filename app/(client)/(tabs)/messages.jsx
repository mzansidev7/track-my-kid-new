import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../../styles/theme";

const ClientMessages = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.text, { color: colors.text.primary }]}> 
        Client messages will appear here.
      </Text>
    </View>
  );
};

export default ClientMessages;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
  },
});
