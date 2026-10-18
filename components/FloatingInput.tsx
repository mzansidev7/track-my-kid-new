import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useTheme } from "../styles/theme";

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
  const { colors } = useTheme();
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
      outputRange: [14, 11],
    }),
    color: error
      ? colors.error
      : animatedIsFocused.interpolate({
          inputRange: [0, 1],
          outputRange: [colors.text.tertiary, "#1683F8"],
        }),
    backgroundColor: colors.surface,
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
            isFocused && !error ? styles.inputFocused : undefined,
            {
              borderColor: error
                ? "#DC4545"
                : isFocused
                  ? "#1683F8"
                  : colors.border,
              backgroundColor: colors.surface,
              color: colors.text.primary,
            },
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
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
    top: 17,
    zIndex: 3,
  },
  rightIcon: {
    position: "absolute",
    right: 8,
    top: 17,
    zIndex: 3,
  },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: "#D8E4EF",
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: "#FFF",
    color: "#222",
  },
  inputFocused: {
    borderColor: "#1683F8",
  },
  errorText: {
    color: "#DC4545",
    fontSize: 10,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default FloatingInput;
