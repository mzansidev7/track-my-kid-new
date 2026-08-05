import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

interface FloatingInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: isFocused || value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: "absolute" as const,
    left: leftIcon ? 36 : 12,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [18, -8],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: error
      ? "#FF6B6B"
      : animatedIsFocused.interpolate({
          inputRange: [0, 1],
          outputRange: ["#999", "#357ABD"],
        }),
    backgroundColor: "#FFF",
    paddingHorizontal: 2,
    zIndex: 2,
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <Animated.Text style={labelStyle}>{label}</Animated.Text>
        <TextInput
          {...props}
          value={value}
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 40 } : undefined,
            rightIcon ? { paddingRight: 40 } : undefined,
            error ? styles.inputError : undefined,
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    position: "relative",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  leftIcon: {
    position: "absolute",
    left: 8,
    top: 18,
    zIndex: 3,
  },
  rightIcon: {
    position: "absolute",
    right: 8,
    top: 18,
    zIndex: 3,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#FFF",
    color: "#222",
  },
  inputError: {
    borderColor: "#FF6B6B",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default FloatingInput;
