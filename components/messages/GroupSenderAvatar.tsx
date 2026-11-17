import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import PresenceDot from "../presence/PresenceDot";

const GroupSenderAvatar = ({
  name,
  avatar,
  userId,
}: {
  name?: string | null;
  avatar?: string | null;
  userId?: string | null;
}) => {
  const initial = name?.trim().charAt(0).toUpperCase() || "?";
  return (
    <View style={styles.container}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.image} />
      ) : (
        <Text style={styles.initial}>{initial}</Text>
      )}
      <PresenceDot userId={userId} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: 28,
    height: 28,
    flex: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    marginRight: 7,
    marginTop: 2,
    overflow: "visible",
    backgroundColor: "#E6EFF8",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  initial: {
    color: "#45627F",
    fontSize: 10,
    fontWeight: "800",
  },
});

export default GroupSenderAvatar;
