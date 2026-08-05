import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme } from "../../styles/theme";

const THEME_STORAGE_KEY = "app_theme";

export const saveTheme = async (theme: Theme) => {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn("Failed to save theme mode to storage:", error);
  }
};

export const getStoredTheme = async (): Promise<Theme | null> => {
  try {
    const value = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (value === "dark" || value === "light") {
      return value;
    }
    return null;
  } catch (error) {
    console.warn("Failed to load theme mode from storage:", error);
    return null;
  }
};
